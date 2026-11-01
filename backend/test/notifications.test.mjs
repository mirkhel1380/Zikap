import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {emailSettings,emailReadiness,renderNotification,dispatchNotifications} from '../notifications.mjs';
import worker from '../worker.mjs';
const now=()=>Math.floor(Date.now()/1000);
function setup({beforeMigration=false}={}){
 const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');
 const dir=new URL('../migrations/',import.meta.url),schema=()=>db.exec(readFileSync(new URL('0009_email_notifications.sql',dir),'utf8'));
 for(const file of readdirSync(dir).filter(n=>n.endsWith('.sql')&&(beforeMigration?n!=='0009_email_notifications.sql':true)).sort())db.exec(readFileSync(new URL(file,dir),'utf8'));
 const DB={prepare(sql){let args=[];return{bind(...values){args=values;return this;},execute(){return{meta:{changes:db.prepare(sql).run(...args).changes}};},async run(){return this.execute();},async first(){return db.prepare(sql).get(...args)||null;},async all(){return{results:db.prepare(sql).all(...args)};}};},async batch(statements){db.exec('BEGIN');try{const result=statements.map(s=>s.execute());db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}}};
 const calls=[],env={DB,ADMIN_TOKEN:'fixture-owner-secret-at-least-thirty-two-characters',ALLOWED_ORIGIN:'https://mirkhel1380.github.io',RESEND_API_KEY:'re_fixture_not_a_real_key',EMAIL_SETTINGS:JSON.stringify({enabled:true,from:'updates@example.test',replyTo:'support@example.test',startAt:'2026-01-01T00:00:00Z'}),EMAIL_HTTP:async(url,options)=>{calls.push({url,options});return Response.json({id:crypto.randomUUID()});}};
 function order(){const id=crypto.randomUUID();db.prepare("INSERT INTO orders(id,token_hash,created_at,updated_at,status,package_id,price_usd,name,email,website,pages,topic,language,market,goals,report) VALUES(?,?,'2026-11-01','2026-11-01','requested','audit',29,'<img src=x onerror=alert(1)>','recipient@example.test','https://example.com','[]','','English','Fixture','private goals','')").run(id,'private-receipt-hash');return id;}
 return{db,env,calls,order,schema};
}
const config={from:'updates@example.test',replyTo:'support@example.test'};

test('email config is explicitly opt-in, validates header values and exposes no secret or address',async t=>{
 const f=setup();t.after(()=>f.db.close());
 for(const value of [undefined,'','{}','null','[]','false','{"enabled":"true"}','not json']){
  const env={...f.env,EMAIL_SETTINGS:value};assert.equal((await emailReadiness(env)).ready,false);
 }
 for(const patch of [{from:'x@example.test\r\nBcc: stolen@example.test'},{from:'Name <x@example.test>'},{startAt:'2026-02-30T00:00:00Z'},{replyTo:'a@example.test,b@example.test'}]){
  assert.equal(emailSettings({...f.env,EMAIL_SETTINGS:JSON.stringify({enabled:true,...config,startAt:'2026-01-01T00:00:00Z',...patch})}).valid,false);
 }
 assert.equal((await emailReadiness(f.env)).ready,true);
 const safe=JSON.stringify(await emailReadiness(f.env));assert.equal(safe.includes(f.env.RESEND_API_KEY),false);assert.equal(safe.includes('updates@example.test'),false);
 const health=await(await worker.fetch(new Request('https://api.example/health'),f.env)).json();assert.equal(health.emailNotifications.ready,true);assert.equal(JSON.stringify(health).includes(f.env.RESEND_API_KEY),false);
});
test('additive migration has no backfill and triggers commit or roll back with the real order write',async t=>{
 const f=setup({beforeMigration:true});t.after(()=>f.db.close());f.order();f.schema();assert.equal(f.db.prepare('SELECT count(*) n FROM email_outbox').get().n,0);
 const id=f.order();f.schema();assert.equal(f.db.prepare('SELECT count(*) n FROM email_outbox').get().n,1);
 f.db.exec('BEGIN');f.order();f.db.exec('ROLLBACK');assert.equal(f.db.prepare('SELECT count(*) n FROM email_outbox').get().n,1);
 f.db.prepare("UPDATE orders SET status='accepted' WHERE id=?").run(id);
 f.db.prepare("UPDATE orders SET status='accepted' WHERE id=?").run(id);
 f.db.prepare("UPDATE orders SET owner_note='A private update' WHERE id=?").run(id);
 f.db.prepare("UPDATE orders SET status='delivered',report='Private full report' WHERE id=?").run(id);
 f.db.prepare("UPDATE orders SET report='Edited private report' WHERE id=?").run(id);
 const kinds=f.db.prepare('SELECT kind FROM email_outbox WHERE order_id=?').all(id).map(x=>x.kind).sort();assert.deepEqual(kinds,['project_accepted','report_ready','request_received']);
 const queue=JSON.stringify(f.db.prepare('SELECT * FROM email_outbox').all());assert.equal(queue.includes('Private full report'),false);assert.equal(queue.includes('private-receipt-hash'),false);assert.equal(queue.includes('recipient@example.test'),false);
 f.db.prepare('DELETE FROM orders WHERE id=?').run(id);assert.equal(f.db.prepare('SELECT count(*) n FROM email_outbox').get().n,0);
});
test('payment event is created only once on paid transition and preserves test-mode wording',async t=>{
 const f=setup();t.after(()=>f.db.close());const id=f.order();
 f.db.prepare("INSERT INTO order_payments(order_id,generation,state,amount_cents,currency,test_mode,request_params,started_at) VALUES(?,?,'pending',2900,'usd',1,'private provider params',100)").run(id,crypto.randomUUID());
 f.db.prepare("UPDATE order_payments SET state='paid' WHERE order_id=?").run(id);f.db.prepare("UPDATE order_payments SET state='paid' WHERE order_id=?").run(id);f.db.prepare('UPDATE order_payments SET refunded_cents=2900 WHERE order_id=?').run(id);
 const events=f.db.prepare("SELECT * FROM email_outbox WHERE kind='payment_confirmed'").all();assert.equal(events.length,1);
 const rendered=renderNotification(events[0],{email:'recipient@example.test',linked:true},config);
 assert.match(rendered.subject,/TEST MODE/);assert.match(rendered.text,/No real charge/);assert.match(rendered.text,/\$29\.00/);assert.equal(JSON.stringify(rendered).includes('private provider params'),false);
 const real=renderNotification({...events[0],metadata:JSON.stringify({amountCents:1900,currency:'usd',testMode:0})},{email:'recipient@example.test',linked:true},config);assert.match(real.subject,/payment confirmed/);assert.doesNotMatch(real.subject,/TEST MODE/);assert.match(real.text,/\$19\.00/);
});
test('all four templates use fixed private-workspace links, minimal text and both HTML and plain text',()=>{
 for(const kind of ['request_received','project_accepted','report_ready','payment_confirmed']){
  const event={kind,order_id:'<script>reference</script>',metadata:JSON.stringify({packageId:'audit',amountCents:2900,currency:'usd',testMode:0})};
  const message=renderNotification(event,{email:'recipient@example.test',linked:true},config);assert.ok(message.html&&message.text&&message.subject);assert.equal(message.to.length,1);assert.equal(message.reply_to,config.replyTo);assert.match(message.html,/&lt;script&gt;/);assert.doesNotMatch(message.html,/<script>/);assert.match(message.text,/https:\/\/zikap\.m-mirkhel20\.workers\.dev\/account\/#projects/);
 }
 const guest=renderNotification({kind:'request_received',order_id:'fixture-id',metadata:'{}'},{email:'recipient@example.test',linked:false},config);assert.match(guest.text,/workspace\.html/);assert.match(guest.text,/saved/);
 assert.throws(()=>renderNotification({kind:'request_received',order_id:'fixture',metadata:'{}'},{email:'x@example.test\r\nBcc: other@example.test'},config));
});
test('disabled sending makes no provider call; activation skips the earlier backlog',async t=>{
 const f=setup();t.after(()=>f.db.close());f.order();
 assert.deepEqual(await dispatchNotifications({...f.env,EMAIL_SETTINGS:'{"enabled":false}'}),{active:false,processed:0});assert.equal(f.calls.length,0);
 const startAt=new Date((now()+60)*1000).toISOString().replace('.000Z','Z');f.env.EMAIL_SETTINGS=JSON.stringify({enabled:true,...config,startAt});
 await dispatchNotifications(f.env);assert.equal(f.calls.length,0);assert.equal(f.db.prepare('SELECT state FROM email_outbox').get().state,'skipped');
});
test('provider acceptance is stored without claiming inbox delivery; concurrent cron runs cannot duplicate a send',async t=>{
 const f=setup();t.after(()=>f.db.close());f.order();
 await Promise.all([dispatchNotifications(f.env),dispatchNotifications(f.env)]);assert.equal(f.calls.length,1);
 const row=f.db.prepare('SELECT * FROM email_outbox').get();assert.equal(row.state,'accepted');assert.ok(row.provider_id);assert.ok(row.accepted_at);assert.equal(row.attempts,1);
 await dispatchNotifications(f.env);assert.equal(f.calls.length,1);assert.equal(f.calls[0].url,'https://api.resend.com/emails');assert.equal(f.calls[0].options.redirect,'error');
});
test('lost responses retry the same immutable recipient, sender, body and idempotency key',async t=>{
 const f=setup();t.after(()=>f.db.close());const id=f.order(),start=now();
 let tries=0;f.env.EMAIL_HTTP=async(url,options)=>{f.calls.push({url,options});if(++tries===1)throw new Error('timeout with private data');return Response.json({id:'fixture-provider-id'});};
 await dispatchNotifications(f.env,{now:start});assert.equal(f.db.prepare('SELECT state FROM email_outbox').get().state,'pending');
 f.db.prepare("UPDATE orders SET email='changed@example.test' WHERE id=?").run(id);f.env.EMAIL_SETTINGS=JSON.stringify({enabled:true,from:'changed-sender@example.test',startAt:'2026-01-01T00:00:00Z'});
 await dispatchNotifications(f.env,{now:start+121});assert.equal(f.calls.length,2);assert.equal(f.calls[0].options.body,f.calls[1].options.body);assert.equal(f.calls[0].options.headers['Idempotency-Key'],f.calls[1].options.headers['Idempotency-Key']);assert.equal(f.db.prepare('SELECT state FROM email_outbox').get().state,'accepted');
 assert.doesNotMatch(JSON.stringify(f.db.prepare('SELECT * FROM email_outbox').get()),/timeout with private data/);
});
test('unknown outcomes stop before provider idempotency expiry, and stale senders cannot acknowledge a newer lease',async t=>{
 const f=setup();t.after(()=>f.db.close());f.order();const start=now();
 f.env.EMAIL_HTTP=async()=>{throw new Error('unknown outcome');};await dispatchNotifications(f.env,{now:start});
 let sends=0;f.env.EMAIL_HTTP=async()=>{sends++;return Response.json({id:'never-called'});};await dispatchNotifications(f.env,{now:start+23*3600});assert.equal(sends,0);assert.equal(f.db.prepare('SELECT state FROM email_outbox').get().state,'uncertain');
 const second=f.order();f.env.EMAIL_HTTP=async()=>{f.db.prepare("UPDATE email_outbox SET lease_token='replacement-lease',lease_until=? WHERE order_id=?").run(start+300,second);return Response.json({id:'stale-result'});};await dispatchNotifications(f.env,{now:start});
 const row=f.db.prepare('SELECT * FROM email_outbox WHERE order_id=?').get(second);assert.equal(row.state,'sending');assert.equal(row.lease_token,'replacement-lease');assert.equal(row.provider_id,'');
});
test('permanent rejection is held, retryable errors back off, and provider bodies never enter records',async t=>{
 for(const [status,state,code] of [[401,'failed','PROVIDER_CONFIGURATION'],[422,'failed','PROVIDER_REJECTED'],[429,'pending','PROVIDER_RETRY'],[503,'pending','PROVIDER_RETRY']]){
  const f=setup();t.after(()=>f.db.close());f.order();f.env.EMAIL_HTTP=async()=>Response.json({message:'private-recipient-and-api-key'}, {status});await dispatchNotifications(f.env);const row=f.db.prepare('SELECT * FROM email_outbox').get();assert.equal(row.state,state);assert.equal(row.error_code,code);assert.doesNotMatch(JSON.stringify(row),/private-recipient-and-api-key/);
 }
});
test('linked-account email overrides the original receipt address; cron batch stays bounded',async t=>{
 const f=setup();t.after(()=>f.db.close());const id=f.order(),user=crypto.randomUUID();
 f.db.prepare("INSERT INTO customer_users VALUES(?,?,'Fixture','hash','salt','recovery','2026-11-01')").run(user,'account-owner@example.test');f.db.prepare('INSERT INTO customer_order_links VALUES(?,?)').run(id,user);
 await dispatchNotifications(f.env);assert.equal(JSON.parse(f.calls[0].options.body).to[0],'account-owner@example.test');
 for(let i=0;i<8;i++)f.order();const before=f.calls.length;await dispatchNotifications(f.env,{limit:999});assert.equal(f.calls.length-before,5);
});
test('the scheduled Worker handler dispatches the outbox without exposing a public send endpoint',async t=>{
 const f=setup();t.after(()=>f.db.close());f.order();const pending=[];await worker.scheduled({},f.env,{waitUntil:p=>pending.push(p)});await Promise.all(pending);assert.equal(f.calls.length,1);
 const response=await worker.fetch(new Request('https://api.example/send-email',{method:'POST',headers:{Origin:'https://api.example'}}),f.env);assert.equal(response.status,404);
});

test('a changed activation boundary holds earlier uncertain attempts without contacting the provider',async t=>{
 const f=setup();t.after(()=>f.db.close());f.order();const start=now();f.env.EMAIL_HTTP=async()=>{throw new Error('unknown outcome');};await dispatchNotifications(f.env,{now:start});
 f.env.EMAIL_SETTINGS=JSON.stringify({enabled:true,...config,startAt:new Date((start+60)*1000).toISOString().replace('.000Z','Z')});let calls=0;f.env.EMAIL_HTTP=async()=>{calls++;return Response.json({id:'not-sent'});};await dispatchNotifications(f.env,{now:start+180});
 assert.equal(calls,0);assert.equal(f.db.prepare('SELECT state FROM email_outbox').get().state,'uncertain');assert.equal(f.db.prepare('SELECT error_code FROM email_outbox').get().error_code,'ACTIVATION_CHANGED');
});
test('missing email schema disables only notifications and never invokes the provider',async t=>{
 const f=setup({beforeMigration:true});t.after(()=>f.db.close());f.order();assert.equal((await emailReadiness(f.env)).ready,false);assert.deepEqual(await dispatchNotifications(f.env),{active:false,processed:0});assert.equal(f.calls.length,0);
 const health=await(await worker.fetch(new Request('https://api.example/health'),f.env)).json();assert.equal(health.ready,true);assert.equal(health.emailNotifications.ready,false);
});
