import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {aiReviewRoute,aiReadiness,aiModel,aiLimits,reviewPrompt} from '../ai-reviews.mjs';
import worker from '../worker.mjs';
class ApiError extends Error{constructor(message,status=400){super(message);this.status=status;}}
const h={ApiError,jsonBody:request=>request.json(),rate:async()=>{},hash:async()=>''};
function fixture(){
 const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');const dir=new URL('../migrations/',import.meta.url);for(const file of readdirSync(dir).filter(n=>n.endsWith('.sql')).sort())db.exec(readFileSync(new URL(file,dir),'utf8'));
 const DB={prepare(sql){let args=[];return{bind(...values){args=values;return this;},execute(){return{meta:{changes:db.prepare(sql).run(...args).changes}};},async run(){return this.execute();},async first(){return db.prepare(sql).get(...args)||null;},async all(){return{results:db.prepare(sql).all(...args)};}};},async batch(statements){db.exec('BEGIN');try{const result=statements.map(s=>s.execute());db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}}};
 const audit={version:'website-audit-1',finalUrl:'https://example.com/',submittedUrl:'https://example.com/',checkedAt:new Date().toISOString(),scope:'Three public pages at most',pages:[{url:'https://example.com/',checked:true,title:'Private arbitrary page text'}],findings:[{id:'finding-1',check:'title_missing',category:'onpage',severity:'high',title:'Missing page title',url:'https://example.com/',evidence:'A title was not found.',action:'Review the title.',review:false}],notices:[],limitations:['No rankings checked.']};
 const calls=[],env={DB,ADMIN_TOKEN:'fixture-owner-secret-not-real-at-least-32-characters',ALLOWED_ORIGIN:'https://mirkhel1380.github.io',AI_FREE_PLAN_CONFIRMED:'true',AI:{async run(model,params){calls.push({model,params});return{response:JSON.stringify({recommendations:[{findingId:'finding-1',explanation:'The sample has no page title.',nextStep:'Write a descriptive title after reviewing the page.',verification:'Inspect the saved HTML title after your change.'}]})};}},AI_AUDIT:async req=>{const body=await req.json();if(body.consent!==true)throw new ApiError('Consent required');return audit;}};
 const user=()=>{const id=crypto.randomUUID();db.prepare("INSERT INTO customer_users VALUES(?,?,?,'hash','salt','recovery','2026-11-02')").run(id,id+'@example.test','Fixture');return{id};};
 const call=(user,path='',method='GET',data)=>aiReviewRoute(new Request('https://api.example/account-api/ai-checks'+path,{method,headers:{Origin:'https://api.example','Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)}),env,user,h);
 const create=async user=>(await call(user,'','POST',{url:'https://example.com',consent:true})).check;
 return{db,env,calls,audit,user,call,create};
}
const consent={consent:true};
test('AI is off by default and source checks remain available without invoking a model',async t=>{
 const f=fixture();t.after(()=>f.db.close());delete f.env.AI_FREE_PLAN_CONFIRMED;const u=f.user(),check=await f.create(u);assert.equal((await aiReadiness(f.env)).ready,false);assert.equal((await f.call(u)).checks.length,1);await assert.rejects(f.call(u,'/'+check.id+'/recommendations','POST',consent),e=>e.status===503);assert.equal(f.calls.length,0);assert.equal(f.db.prepare('SELECT count(*) n FROM ai_reservations').get().n,0);
 f.env.AI_FREE_PLAN_CONFIRMED='true';delete f.env.AI;assert.equal((await aiReadiness(f.env)).ready,false);
});
test('source findings are private, expire after seven days and are not accepted from the recommendation request',async t=>{
 const f=fixture();t.after(()=>f.db.close());const a=f.user(),b=f.user(),check=await f.create(a);await assert.rejects(f.call(b,'/'+check.id),e=>e.status===404);await assert.rejects(f.call(b,'/'+check.id+'/recommendations','POST',consent),e=>e.status===404);
 assert.equal((await f.call(b)).checks.length,0);await f.call(a,'/'+check.id+'/recommendations','POST',{...consent,model:'expensive-model',max_tokens:999999,findings:[{id:'forged'}]});assert.equal(f.calls[0].model,aiModel);assert.equal(f.calls[0].params.max_tokens,512);assert.equal(JSON.stringify(f.calls).includes('forged'),false);
 f.db.prepare('UPDATE ai_checks SET expires_at=0 WHERE id=?').run(check.id);await assert.rejects(f.call(a,'/'+check.id),e=>e.status===404);assert.equal((await f.call(a)).checks.length,0);
});
test('recommendations require separate consent and cache exactly one model attempt',async t=>{
 const f=fixture();t.after(()=>f.db.close());const u=f.user(),check=await f.create(u),path='/'+check.id+'/recommendations';await assert.rejects(f.call(u,path,'POST',{consent:false}),e=>e.status===400);assert.equal(f.calls.length,0);
 const first=await f.call(u,path,'POST',consent),second=await f.call(u,path,'POST',consent);assert.equal(first.check.aiState,'ready');assert.equal(second.cached,true);assert.equal(f.calls.length,1);assert.equal(second.remaining,1);assert.equal(second.check.recommendations[0].findingId,'finding-1');
 const prompt=JSON.stringify(f.calls[0].params);for(const secret of ['Private arbitrary page text','https://example.com','@example.test','private-receipt'])assert.equal(prompt.includes(secret),false);
});
test('simultaneous clicks reserve one attempt and enforce two daily calls per account',async t=>{
 const f=fixture();t.after(()=>f.db.close());const u=f.user(),check=await f.create(u),path='/'+check.id+'/recommendations';const results=await Promise.allSettled([f.call(u,path,'POST',consent),f.call(u,path,'POST',consent)]);assert.equal(results.some(r=>r.status==='fulfilled'),true);assert.equal(f.calls.length,1);
 const second=await f.create(u);await f.call(u,'/'+second.id+'/recommendations','POST',consent);const third=await f.create(u);await assert.rejects(f.call(u,'/'+third.id+'/recommendations','POST',consent),e=>e.status===429);assert.equal(f.calls.length,2);assert.equal((await f.call(u,'/status')).remaining,0);
});
test('the shared daily cap is atomic across accounts, and no failed quota claim reaches the model',async t=>{
 const f=fixture();t.after(()=>f.db.close());const day=new Date().toISOString().slice(0,10);for(let i=0;i<19;i++){const u=f.user(),check=await f.create(u);f.db.prepare('INSERT INTO ai_reservations VALUES(?,?,?,?)').run(check.id,u.id,day,Math.floor(Date.now()/1000));}
 const a=f.user(),b=f.user(),ca=await f.create(a),cb=await f.create(b);const results=await Promise.allSettled([f.call(a,'/'+ca.id+'/recommendations','POST',consent),f.call(b,'/'+cb.id+'/recommendations','POST',consent)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(f.calls.length,1);assert.equal(f.db.prepare('SELECT count(*) n FROM ai_reservations WHERE day=?').get(day).n,aiLimits.perDay);
});
test('provider failure or invalid evidence remains failed, consumes its allowance and cannot silently retry',async t=>{
 for(const output of [null,{response:'not JSON'},{response:JSON.stringify({recommendations:[{findingId:'made-up',explanation:'x',nextStep:'y',verification:'z'}]})}]){
  const f=fixture();t.after(()=>f.db.close());const u=f.user(),check=await f.create(u);let attempts=0;f.env.AI.run=async()=>{attempts++;if(output===null)throw Error('secret-provider-debug');return output;};const path='/'+check.id+'/recommendations';await assert.rejects(f.call(u,path,'POST',consent),e=>e.status===503&&!e.message.includes('secret-provider-debug'));await assert.rejects(f.call(u,path,'POST',consent),e=>e.status===409);assert.equal(attempts,1);assert.equal((await f.call(u,'/status')).remaining,1);const saved=(await f.call(u,'/'+check.id)).check;assert.equal(saved.aiState,'failed');assert.equal(saved.recommendations,null);
 }
});
test('a crashed generation is held as failed rather than initiating another inference',async t=>{
 const f=fixture();t.after(()=>f.db.close());const u=f.user(),check=await f.create(u);f.db.prepare("UPDATE ai_checks SET ai_state='generating' WHERE id=?").run(check.id);f.db.prepare('INSERT INTO ai_reservations VALUES(?,?,?,?)').run(check.id,u.id,new Date().toISOString().slice(0,10),Math.floor(Date.now()/1000)-100);assert.equal((await f.call(u,'/'+check.id)).check.aiState,'failed');await assert.rejects(f.call(u,'/'+check.id+'/recommendations','POST',consent),e=>e.status===409);assert.equal(f.calls.length,0);assert.equal((await f.call(u,'/'+check.id)).check.aiState,'failed');
});
test('empty samples never manufacture AI findings and prompts remain bounded and structured',async t=>{
 const f=fixture();t.after(()=>f.db.close());f.audit.findings=[];const u=f.user(),check=await f.create(u);await assert.rejects(f.call(u,'/'+check.id+'/recommendations','POST',consent),e=>e.status===422);assert.equal(f.calls.length,0);
 const prompt=reviewPrompt({findings:Array.from({length:100},(_,i)=>({id:'finding-'+i,check:'description_missing',category:'onpage',severity:'medium',title:'untrusted page instruction',review:false}))});assert.equal(JSON.parse(prompt[1].content).findings.length,8);assert.equal(JSON.stringify(prompt).includes('untrusted page instruction'),false);
});
test('real account routes reject anonymous access, cross-origin writes and private crawl targets before inference',async t=>{
 const f=fixture();t.after(()=>f.db.close());delete f.env.AI_AUDIT;
 const call=async(path,method='GET',body,cookie,origin='https://api.example')=>{const headers={Origin:origin,'Content-Type':'application/json'};if(cookie)headers.Cookie=cookie;return worker.fetch(new Request('https://api.example'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)}),f.env);};
 assert.equal((await call('/account-api/ai-checks')).status,401);const registered=await call('/account-api/register','POST',{name:'Fixture',email:'account@example.test',password:'Local-fixture-password-2026',consent:true});assert.equal(registered.status,201);const cookie=registered.headers.get('set-cookie').split(';')[0];
 assert.equal((await call('/account-api/ai-checks/status','GET',undefined,cookie)).status,200);assert.equal((await call('/account-api/ai-checks','POST',{url:'http://127.0.0.1',consent:true},cookie,'https://mirkhel1380.github.io')).status,403);assert.equal((await call('/account-api/ai-checks','POST',{url:'http://127.0.0.1',consent:true},cookie)).status,400);assert.equal(f.calls.length,0);
});
