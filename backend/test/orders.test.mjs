import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker,{validateOrder} from '../worker.mjs';
const origin='https://mirkhel1380.github.io';
function setup(){const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../migrations/0001_orders.sql',import.meta.url),'utf8'));const env={ALLOWED_ORIGIN:origin,ADMIN_TOKEN:'test-only-owner-token-longer-than-thirty-two-characters',DB:{prepare(sql){let args=[];return {bind(...a){args=a;return this;},async first(){return db.prepare(sql).get(...args)||null;},async all(){return {results:db.prepare(sql).all(...args)};},async run(){const r=db.prepare(sql).run(...args);return {meta:{changes:r.changes}};}};}}};return {db,env};}
const data={packageId:'bundle',name:'Example customer',email:'test@example.com',website:'https://example.com',pages:'https://example.com/\nhttps://example.com/about',topic:'Gardening',language:'English',market:'UK',goals:'Review my website',consent:true,company:''};
async function call(env,path,method='GET',body,token,requestOrigin=origin){const headers={'Origin':requestOrigin};if(body)headers['Content-Type']='application/json';if(token)headers.Authorization='Bearer '+token;const r=await worker.fetch(new Request('https://api.example'+path,{method,headers,body:body?JSON.stringify(body):undefined}),env);return {status:r.status,body:await r.json(),headers:r.headers};}
test('validation enforces package, scope, and same website',()=>{assert.equal(validateOrder(data).price,79);for(const patch of [{packageId:'__proto__'},{packageId:'onpage',pages:Array(4).fill('https://example.com/').join('\n')},{pages:'https://other.example/page'},{email:'invalid'},{topic:''},{website:'javascript:alert(1)'},{pages:''}])assert.throws(()=>validateOrder({...data,...patch}));});
test('complete persisted request, protected delivery, one revision, deletion',async()=>{const {env,db}=setup();const create=await call(env,'/orders','POST',{...data,price:1});assert.equal(create.status,201);assert.equal(create.body.price,79);assert.equal(create.body.token.length,72);const {id,token}=create.body;assert.equal(db.prepare('SELECT count(*) AS n FROM orders').get().n,1);assert.notEqual(db.prepare('SELECT token_hash FROM orders').get().token_hash,token);
 assert.equal((await call(env,'/orders/'+id)).status,404);assert.equal((await call(env,'/orders/'+id,'GET',null,'wrong')).status,404);assert.equal((await call(env,'/admin/orders')).status,401);
 let list=await call(env,'/admin/orders','GET',null,env.ADMIN_TOKEN);assert.equal(list.body.orders.length,1);assert.equal('token_hash' in list.body.orders[0],false);
 assert.equal((await call(env,'/admin/orders/'+id,'PATCH',{status:'delivered',note:'',report:''},env.ADMIN_TOKEN)).status,400);
 const report='Real specialist report\n<script>must remain plain text</script>';
 assert.equal((await call(env,'/admin/orders/'+id,'PATCH',{status:'delivered',report,note:'Review ready.'},env.ADMIN_TOKEN)).status,200);
 const customer=await call(env,'/orders/'+id,'GET',null,token);assert.equal(customer.body.report,report);assert.equal(customer.body.status,'delivered');assert.equal('email' in customer.body,false);assert.equal(customer.headers.get('cache-control'),'no-store');
 assert.equal((await call(env,'/orders/'+id+'/revision','POST',{note:'Please clarify the first finding.'},token)).status,200);assert.equal((await call(env,'/orders/'+id+'/revision','POST',{note:'Again'},token)).status,409);
 await call(env,'/admin/orders/'+id,'PATCH',{status:'delivered',report:report+'\nClarification',note:''},env.ADMIN_TOKEN);assert.equal((await call(env,'/orders/'+id+'/revision','POST',{note:'Again'},token)).status,409);
 assert.equal((await call(env,'/admin/orders/'+id,'DELETE',null,env.ADMIN_TOKEN)).status,200);assert.equal((await call(env,'/orders/'+id,'GET',null,token)).status,404);db.close();});
test('rejects cross-origin calls, missing consent, unavailable setup, oversized bodies, and rate abuse',async()=>{const {env,db}=setup();assert.equal((await call(env,'/orders','POST',data,null,'https://evil.example')).status,403);assert.equal((await call(env,'/orders','POST',{...data,consent:false})).status,400);assert.equal((await call({...env,ADMIN_TOKEN:''},'/health')).status,503);assert.equal((await call(env,'/orders','POST',{...data,goals:'x'.repeat(21000)})).status,413);for(let i=0;i<3;i++)assert.equal((await call(env,'/orders','POST',data)).status,201);assert.equal((await call(env,'/orders','POST',data)).status,429);db.close();});
test('network retries return the same order without duplicate creation',async()=>{
 const {env,db}=setup(),id=crypto.randomUUID(),key=crypto.randomUUID()+crypto.randomUUID(),body={...data,requestId:id,receiptKey:key};
 const first=await call(env,'/orders','POST',body),retry=await call(env,'/orders','POST',body);
 assert.equal(first.status,201);assert.equal(retry.status,200);assert.equal(retry.body.replayed,true);assert.equal(retry.body.id,id);assert.equal(retry.body.token,key);assert.equal(db.prepare('SELECT count(*) AS n FROM orders').get().n,1);
 assert.equal((await call(env,'/orders','POST',{...body,goals:'Different work'})).status,409);
 assert.equal((await call(env,'/orders','POST',{...body,receiptKey:crypto.randomUUID()+crypto.randomUUID()})).status,409);
 assert.equal((await call(env,'/orders','POST',{...data,requestId:'invalid',receiptKey:'invalid'})).status,400);db.close();
});
test('owner pagination does not skip orders with identical creation times',async()=>{
 const {env,db}=setup();const base=(await call(env,'/orders','POST',data)).body.id;
 for(let i=0;i<69;i++)db.prepare('INSERT INTO orders SELECT ?,token_hash,created_at,updated_at,status,package_id,price_usd,name,email,website,pages,topic,language,market,goals,report,owner_note,revision_used,revision_note FROM orders WHERE id=?').run(crypto.randomUUID(),base);
 const first=await call(env,'/admin/orders','GET',null,env.ADMIN_TOKEN);assert.equal(first.body.orders.length,50);assert.ok(first.body.next);
 const second=await call(env,'/admin/orders?before='+encodeURIComponent(first.body.next),'GET',null,env.ADMIN_TOKEN);assert.equal(second.body.orders.length,20);assert.equal(second.body.next,null);assert.equal(new Set([...first.body.orders,...second.body.orders].map(o=>o.id)).size,70);
 assert.equal((await call(env,'/admin/orders?before=bad','GET',null,env.ADMIN_TOKEN)).status,400);db.close();
});
