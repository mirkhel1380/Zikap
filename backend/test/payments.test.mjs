import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from '../worker.mjs';
const host='https://api.example',site='https://mirkhel1380.github.io';
const password='Local-fixture-password-2026-only';
const project={packageId:'audit',website:'https://example.com',pages:'https://example.com/',topic:'Test',language:'English',market:'Test only',goals:'Fixture review',consent:true,company:''};
function setup(live=false){
 const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');for(const name of ['0001_orders.sql','0002_customer_accounts.sql','0003_stripe_payments.sql'])db.exec(readFileSync(new URL('../migrations/'+name,import.meta.url),'utf8'));
 const DB={prepare(sql){let args=[];return{bind(...v){args=v;return this;},execute(){const r=db.prepare(sql).run(...args);return{meta:{changes:r.changes}};},async run(){return this.execute();},async first(){return db.prepare(sql).get(...args)||null;},async all(){return{results:db.prepare(sql).all(...args)};}};},async batch(s){db.exec('BEGIN');try{const result=s.map(x=>x.execute());db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}};
 const sessions=new Map(),idem=new Map(),calls=[];let counter=0;
 const env={DB,ALLOWED_ORIGIN:site,ADMIN_TOKEN:'fixture-owner-token-longer-than-thirty-two-characters',STRIPE_SECRET_KEY:live?'sk_live_fixture_not_a_real_key':'sk_test_fixture_not_a_real_key',STRIPE_WEBHOOK_SECRET:'whsec_fixture_not_a_real_webhook_key'};
 const transport=async(url,options)=>{
  calls.push({url,options});const path=new URL(url).pathname;
  if(path==='/v1/checkout/sessions'&&options.method==='POST'){
   if(idem.has(options.headers['Idempotency-Key']))return Response.json(sessions.get(idem.get(options.headers['Idempotency-Key'])));
   const p=new URLSearchParams(options.body),id='cs_test_fixture'+(++counter),s={id,object:'checkout.session',mode:'payment',status:'open',payment_status:'unpaid',currency:p.get('line_items[0][price_data][currency]'),amount_total:Number(p.get('line_items[0][price_data][unit_amount]')),client_reference_id:p.get('client_reference_id'),metadata:{orderId:p.get('metadata[orderId]'),generation:p.get('metadata[generation]')},livemode:live,url:'https://checkout.stripe.com/c/pay/'+id,expires_at:Math.floor(Date.now()/1000)+86400,payment_intent:null};
   sessions.set(id,s);idem.set(options.headers['Idempotency-Key'],id);return Response.json(s);
  }
  const id=path.split('/')[4],s=sessions.get(id);if(!s)return Response.json({error:{}},{status:404});
  if(path.endsWith('/expire'))s.status='expired';return Response.json(s);
 };
 env.STRIPE_HTTP=transport;return{db,env,sessions,calls,transport};
}
async function call(env,path,method='GET',body,cookie,owner=false){const headers={Origin:owner?site:host};if(body)headers['Content-Type']='application/json';if(cookie)headers.Cookie=cookie;if(owner)headers.Authorization='Bearer '+env.ADMIN_TOKEN;const r=await worker.fetch(new Request(host+path,{method,headers,body:body?JSON.stringify(body):undefined}),env);return{status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
async function create(env,email='fixture@example.com',quote={}){
 const a=await call(env,'/account-api/register','POST',{name:'Fixture',email,password,consent:true}),id=crypto.randomUUID();assert.equal(a.status,201);
 assert.equal((await call(env,'/account-api/orders','POST',{...project,...quote,requestId:id},a.cookie)).status,201);
 assert.equal((await call(env,'/admin/orders/'+id,'PATCH',{status:'accepted',report:'',note:'Scope and timing confirmed.'},null,true)).status,200);return{id,cookie:a.cookie};
}
const checkout=(env,a,extra={})=>call(env,'/account-api/orders/'+a.id+'/checkout','POST',{acknowledged:true,...extra},a.cookie);
test('new catalog prices and titles are snapshotted; later edits never reprice existing Stripe checkout',async()=>{
 const{db,env,calls}=setup();db.exec(readFileSync(new URL('../migrations/0012_service_catalog.sql',import.meta.url),'utf8'));env.SERVICE_CATALOG_REQUIRED='true';
 const first=await create(env,'first-catalog@example.test',{quotedPrice:29,catalogVersion:1});
 db.prepare("UPDATE service_catalog SET title='Focused review',price_usd=12,version=2 WHERE id='audit'").run();
 const second=await create(env,'second-catalog@example.test',{quotedPrice:12,catalogVersion:2});db.prepare("UPDATE service_catalog SET title='Later title',price_usd=99,version=3 WHERE id='audit'").run();
 assert.equal((await checkout(env,first)).status,200);assert.equal((await checkout(env,second)).status,200);
 const params=calls.filter(x=>x.options.method==='POST').map(x=>new URLSearchParams(x.options.body));assert.equal(params[0].get('line_items[0][price_data][unit_amount]'),'2900');assert.equal(params[1].get('line_items[0][price_data][unit_amount]'),'1200');assert.equal(params[1].get('line_items[0][price_data][product_data][name]'),'Zikap / Focused review');
 const detail=await call(env,'/account-api/orders/'+second.id,'GET',undefined,second.cookie);assert.equal(detail.body.order.packageTitle,'Focused review');assert.equal(detail.body.order.price,12);
 assert.equal((await call(env,'/account-api/orders','POST',{...project,requestId:second.id,quotedPrice:12,catalogVersion:2},second.cookie)).body.order.price,12);
 db.prepare('UPDATE orders SET price_usd=1 WHERE id=?').run(second.id);assert.equal((await checkout(env,second)).status,409);db.close();
});
function paid(s){s.status='complete';s.payment_status='paid';s.payment_intent='pi_fixture_'+s.id;return s;}
async function webhook(env,type,object,id='evt_fixture_'+crypto.randomUUID().replaceAll('-',''),changes={}){
 const payload=JSON.stringify({id,type,data:{object}}),timestamp=changes.timestamp||Math.floor(Date.now()/1000),key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.STRIPE_WEBHOOK_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const signature=[...new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(timestamp+'.'+payload)))].map(v=>v.toString(16).padStart(2,'0')).join('');
 const r=await worker.fetch(new Request(host+'/stripe/webhook',{method:'POST',headers:{'Stripe-Signature':'t='+timestamp+',v1='+(changes.badSignature?'0'.repeat(64):signature)},body:changes.tampered?payload+' ':payload}),env);return{status:r.status,body:await r.json()};
}
test('checkout requires ownership, acceptance, acknowledgement and configured Stripe secrets',async()=>{
 const{db,env}=setup(),a=await create(env);assert.equal((await checkout(env,a,{acknowledged:false})).status,400);
 const b=await call(env,'/account-api/register','POST',{name:'Other',email:'other@example.com',password,consent:true});assert.equal((await call(env,'/account-api/orders/'+a.id+'/checkout','POST',{acknowledged:true},b.cookie)).status,404);
 db.prepare("UPDATE orders SET status='requested' WHERE id=?").run(a.id);assert.equal((await checkout(env,a)).status,409);db.prepare("UPDATE orders SET status='accepted' WHERE id=?").run(a.id);
 assert.equal((await checkout({...env,STRIPE_SECRET_KEY:''},a)).status,503);assert.equal((await call({...env,STRIPE_SECRET_KEY:''},'/health')).body.payments,false);db.close();
});
test('prices and currency are server-controlled and repeated checkout reuses one Stripe session',async()=>{
 const{db,env,calls,sessions}=setup(),a=await create(env),first=await checkout(env,a,{price:1,currency:'eur'}),second=await checkout(env,a);
 assert.equal(first.status,200);assert.equal(second.body.url,first.body.url);assert.equal(sessions.size,1);assert.equal(calls.length,1);
 const p=new URLSearchParams(calls[0].options.body);assert.equal(p.get('line_items[0][price_data][unit_amount]'),'2900');assert.equal(p.get('line_items[0][price_data][currency]'),'usd');assert.equal(p.has('customer_email'),false);assert.ok(p.get('success_url').includes('order='+a.id));assert.ok(calls[0].options.headers['Idempotency-Key']);db.close();
});
test('signed paid events persist once; forged, altered and stale events cannot mark a project paid',async()=>{
 const{db,env,sessions}=setup(),a=await create(env);await checkout(env,a);const s=paid([...sessions.values()][0]);
 assert.equal((await webhook(env,'checkout.session.completed',s,undefined,{badSignature:true})).status,400);assert.equal((await webhook(env,'checkout.session.completed',s,undefined,{tampered:true})).status,400);assert.equal((await webhook(env,'checkout.session.completed',s,undefined,{timestamp:Math.floor(Date.now()/1000)-400})).status,400);
 assert.equal(db.prepare('SELECT state FROM order_payments').get().state,'pending');const event='evt_same_fixture';assert.equal((await webhook(env,'checkout.session.completed',s,event)).status,200);assert.equal((await webhook(env,'checkout.session.completed',s,event)).body.replayed,true);
 const order=(await call(env,'/account-api/orders/'+a.id,'GET',null,a.cookie)).body.order;assert.equal(order.payment.status,'paid');assert.equal(order.payment.testMode,true);assert.equal(order.paymentCollected,false);assert.equal(db.prepare('SELECT count(*) AS n FROM stripe_events').get().n,1);
 assert.equal((await call(env,'/admin/orders/'+a.id,'DELETE',null,null,true)).status,409);assert.equal((await call(env,'/admin/orders/'+a.id,'PATCH',{status:'declined',report:'',note:''},null,true)).status,409);db.close();
});
test('amount, currency, mode and session mismatches are rejected even when the webhook is signed',async()=>{
 const{db,env,sessions}=setup(),a=await create(env);await checkout(env,a);const s=paid([...sessions.values()][0]);
 for(const patch of [{amount_total:1},{currency:'eur'},{livemode:true},{id:'cs_test_wrong'}])assert.equal((await webhook(env,'checkout.session.completed',{...s,...patch})).status,400);
 assert.equal((await webhook(env,'checkout.session.completed',{...s,metadata:{...s.metadata,generation:'old-generation'}})).body.ignored,true);assert.equal(db.prepare('SELECT state FROM order_payments').get().state,'pending');db.close();
});
test('server-side payment checks do not trust browser-supplied paid flags',async()=>{
 const{db,env,sessions}=setup(),a=await create(env);await checkout(env,a);
 let response=await call(env,'/account-api/orders/'+a.id+'/payment-status','POST',{paid:true},a.cookie);assert.equal(response.body.order.payment.status,'pending');paid([...sessions.values()][0]);response=await call(env,'/account-api/orders/'+a.id+'/payment-status','POST',{},a.cookie);assert.equal(response.body.order.payment.status,'paid');db.close();
});
test('a lost Stripe response retries the same persisted idempotency key',async()=>{
 const{db,env,sessions,transport,calls}=setup(),a=await create(env);let once=true;env.STRIPE_HTTP=async(...args)=>{const response=await transport(...args);if(once){once=false;throw new Error('fixture connection lost');}return response;};
 assert.equal((await checkout(env,a)).status,503);assert.equal(db.prepare('SELECT lock_until FROM order_payments').get().lock_until,0);assert.equal((await checkout(env,a)).status,200);assert.equal(sessions.size,1);assert.equal(calls[0].options.headers['Idempotency-Key'],calls[1].options.headers['Idempotency-Key']);assert.equal(calls[0].options.body,calls[1].options.body);db.close();
});
test('expired sessions are checked before replacement and old-generation events do not overwrite a new checkout',async()=>{
 const{db,env,sessions}=setup(),a=await create(env);await checkout(env,a);const old=[...sessions.values()][0];old.status='expired';db.prepare('UPDATE order_payments SET expires_at=0').run();
 assert.equal((await checkout(env,a)).status,200);assert.equal(sessions.size,2);assert.equal((await webhook(env,'checkout.session.completed',paid(old))).body.ignored,true);assert.equal(db.prepare('SELECT state FROM order_payments').get().state,'pending');db.close();
});
test('declining a pending project expires its checkout and preserves the financial record',async()=>{
 const{db,env,sessions}=setup(),a=await create(env);await checkout(env,a);
 assert.equal((await call(env,'/admin/orders/'+a.id,'PATCH',{status:'in_progress',report:'',note:''},null,true)).status,409);
 assert.equal((await call(env,'/admin/orders/'+a.id,'PATCH',{status:'declined',report:'',note:'Scope not accepted'},null,true)).status,200);assert.equal([...sessions.values()][0].status,'expired');assert.equal(db.prepare('SELECT state FROM order_payments').get().state,'expired');assert.equal((await call(env,'/admin/orders/'+a.id,'DELETE',null,null,true)).status,409);db.close();
});
test('refund updates are monotonic, preserve the payment record and never open another checkout',async()=>{
 const{db,env,sessions}=setup(),a=await create(env);await checkout(env,a);const s=paid([...sessions.values()][0]);await webhook(env,'checkout.session.completed',s);
 const charge={payment_intent:s.payment_intent,livemode:false,currency:'usd',amount:2900,amount_refunded:1000};assert.equal((await webhook(env,'charge.refunded',charge)).status,200);assert.equal((await checkout(env,a)).body.payment.status,'partially_refunded');
 await webhook(env,'charge.refunded',{...charge,amount_refunded:2900});await webhook(env,'charge.refunded',charge);await webhook(env,'checkout.session.completed',s);
 assert.equal((await checkout(env,a)).body.payment.status,'refunded');assert.equal(sessions.size,1);assert.equal(db.prepare('SELECT refunded_cents FROM order_payments').get().refunded_cents,2900);db.close();
});
test('live and test payment confirmations remain distinct',async()=>{
 const{db,env,sessions}=setup(true),a=await create(env);await checkout(env,a);const s=paid([...sessions.values()][0]);assert.equal((await webhook(env,'checkout.session.completed',{...s,livemode:false})).status,400);await webhook(env,'checkout.session.completed',s);const order=(await call(env,'/account-api/orders/'+a.id,'GET',null,a.cookie)).body.order;assert.equal(order.paymentCollected,true);assert.equal(order.payment.testMode,false);db.close();
});
test('parallel checkout clicks acquire one lease and create only one Stripe session',async()=>{
 const{db,env,sessions,transport}=setup(),a=await create(env);let release,entered;const gate=new Promise(r=>{release=r;}),started=new Promise(r=>{entered=r;});
 env.STRIPE_HTTP=async(...args)=>{entered();await gate;return transport(...args);};const first=checkout(env,a);await started;
 assert.equal((await checkout(env,a)).status,409);release();assert.equal((await first).status,200);assert.equal(sessions.size,1);db.close();
});
test('a checkout with an unknown result is not recreated after the idempotency safety window',async()=>{
 const{db,env,transport,calls}=setup(),a=await create(env);env.STRIPE_HTTP=async(...args)=>{await transport(...args);throw new Error('fixture response lost');};await checkout(env,a);
 db.prepare('UPDATE order_payments SET started_at=?,lock_until=0').run(Math.floor(Date.now()/1000)-24*3600);assert.equal((await checkout(env,a)).status,409);assert.equal(calls.length,1);db.close();
});


test('health pinpoints missing or malformed secrets without returning values or provider calls',async()=>{
 const{db,env,calls}=setup();
 for(const [patch,expected]of [[{},['configured','configured',true]],[{STRIPE_SECRET_KEY:undefined},['missing','configured',false]],[{STRIPE_SECRET_KEY:'pk_test_sensitive_fixture'},['invalid_format','configured',false]],[{STRIPE_SECRET_KEY:' sk_test_sensitive_fixture'},['invalid_format','configured',false]],[{STRIPE_WEBHOOK_SECRET:''},['configured','missing',false]],[{STRIPE_WEBHOOK_SECRET:'wrong_sensitive_fixture'},['configured','invalid_format',false]],[{STRIPE_SECRET_KEY:'rk_test_fixture'},['configured','configured',true]]]){
  const result=await call({...env,...patch},'/health');assert.equal(result.status,200);assert.equal(result.body.ready,true);assert.equal(result.body.paymentChecks.secretKey,expected[0]);assert.equal(result.body.paymentChecks.webhookSecret,expected[1]);assert.equal(result.body.payments,expected[2]);
  const serialized=JSON.stringify(result.body);for(const value of [env.STRIPE_SECRET_KEY,env.STRIPE_WEBHOOK_SECRET,...Object.values(patch)].filter(Boolean))assert.equal(serialized.includes(value),false);assert.equal(serialized.includes('sensitive_fixture'),false);
 }
 assert.equal(calls.length,0);db.close();
});
test('payment readiness distinguishes schema failures and missing binding from secret configuration',async()=>{
 const{db,env}=setup();db.exec('DROP TABLE stripe_events');let result=await call(env,'/health');assert.equal(result.body.paymentChecks.paymentRecordsTable,true);assert.equal(result.body.paymentChecks.webhookEventsTable,false);assert.equal(result.body.payments,false);assert.equal(result.body.ready,true);
 db.exec('DROP TABLE order_payments');result=await call(env,'/health');assert.equal(result.body.paymentChecks.paymentRecordsTable,false);assert.equal(result.body.paymentChecks.webhookEventsTable,false);
 result=await call({...env,DB:undefined},'/health');assert.equal(result.status,503);assert.equal(result.body.paymentChecks.databaseBinding,false);assert.equal(result.body.paymentChecks.paymentRecordsTable,null);assert.equal(result.body.payments,false);assert.equal(JSON.stringify(result.body).includes('no such table'),false);db.close();
});


test('Stripe rejections expose safe actionable categories, never raw messages or arbitrary parameters',async()=>{
 const raw='sk_test_sensitive_fixture_credential',cases=[
  [401,{code:'invalid_api_key'},'STRIPE_AUTHENTICATION'],[400,{code:'api_key_expired'},'STRIPE_AUTHENTICATION'],[403,{},'STRIPE_PERMISSIONS'],[429,{},'STRIPE_RATE_LIMIT'],[409,{},'STRIPE_IDEMPOTENCY'],[400,{type:'idempotency_error'},'STRIPE_IDEMPOTENCY'],[400,{code:'account_invalid'},'STRIPE_ACCOUNT'],[400,{param:'adaptive_pricing[enabled]'},'STRIPE_REQUEST'],[400,{param:raw},'STRIPE_REQUEST'],[402,{},'STRIPE_REQUEST'],[500,{},'STRIPE_PROVIDER']
 ];
 for(const [status,error,category]of cases){
  const{db,env}=setup(),a=await create(env);let sent;
  env.STRIPE_HTTP=async(url,options)=>{sent=options;return Response.json({error:{...error,message:raw,request_log_url:'https://example.com/private/'+raw},secret:raw},{status});};
  const response=await checkout(env,a);assert.equal(response.status,503);assert.ok(response.body.error.includes('['+category+']'));assert.equal(JSON.stringify(response.body).includes(raw),false);assert.equal(JSON.stringify(response.body).includes('request_log_url'),false);assert.equal(JSON.stringify(response.body).includes(env.STRIPE_SECRET_KEY),false);
  if(error.param==='adaptive_pricing[enabled]')assert.ok(response.body.error.includes(error.param));
  const row=db.prepare('SELECT * FROM order_payments WHERE order_id=?').get(a.id);assert.equal(row.state,'creating');assert.equal(row.lock_until,0);assert.equal(row.session_id,null);
  const firstKey=sent.headers['Idempotency-Key'],firstBody=sent.body;await checkout(env,a);assert.equal(sent.headers['Idempotency-Key'],firstKey);assert.equal(sent.body,firstBody);assert.equal(db.prepare('SELECT count(*) AS n FROM order_payments').get().n,1);db.close();
 }
});

const discontinued={type:'invalid_request_error',param:'payment_method_types',message:'The `payment_method_types` parameter is no longer supported when creating a Checkout Session. Payment methods are now managed from your Dashboard settings.'};
async function seedLegacy(fixture){
 const{db,env}=fixture,a=await create(env),previous=env.STRIPE_HTTP;
 env.STRIPE_HTTP=async()=>{throw Error('fixture before any remote request');};assert.equal((await checkout(env,a)).status,503);env.STRIPE_HTTP=previous;
 const row=db.prepare('SELECT * FROM order_payments WHERE order_id=?').get(a.id),params=new URLSearchParams(row.request_params);params.set('payment_method_types[0]','card');db.prepare('UPDATE order_payments SET request_params=? WHERE order_id=?').run(params.toString(),a.id);
 return{a,row:{...row,request_params:params.toString()}};
}
test('new sessions use Dashboard-managed methods without changing one-time USD scope',async()=>{
 const{db,env,calls}=setup(),a=await create(env);assert.equal((await checkout(env,a)).status,200);const params=new URLSearchParams(calls[0].options.body);assert.equal([...params.keys()].some(key=>/^payment_method_types/.test(key)),false);assert.equal(params.get('mode'),'payment');assert.equal(params.get('line_items[0][price_data][currency]'),'usd');assert.equal(params.get('line_items[0][price_data][unit_amount]'),'2900');db.close();
});
test('a cached unsupported-parameter rejection migrates once under a fresh immutable key',async()=>{
 const f=setup(),{a,row}=await seedLegacy(f),{db,env,transport,sessions}=f,trace=[];
 env.STRIPE_HTTP=async(url,options)=>{trace.push(options);return new URLSearchParams(options.body).has('payment_method_types[0]')?Response.json({error:discontinued},{status:400}):transport(url,options);};
 const response=await checkout(env,a);assert.equal(response.status,200);assert.equal(trace.length,2);assert.equal(trace[0].body,row.request_params);assert.equal(trace[0].headers['Idempotency-Key'],'zikap-checkout:'+a.id+':'+row.generation);assert.notEqual(trace[1].headers['Idempotency-Key'],trace[0].headers['Idempotency-Key']);
 const saved=db.prepare('SELECT * FROM order_payments WHERE order_id=?').get(a.id),before=new URLSearchParams(row.request_params),after=new URLSearchParams(saved.request_params);before.delete('payment_method_types[0]');before.set('metadata[generation]',saved.generation);assert.equal(before.toString(),after.toString());assert.equal(after.get('metadata[generation]'),saved.generation);assert.equal(saved.state,'pending');assert.equal(saved.lock_until,0);assert.equal(sessions.size,1);assert.equal(db.prepare('SELECT count(*) AS n FROM order_payments').get().n,1);
 assert.equal((await checkout(env,a)).body.url,response.body.url);assert.equal(trace.length,2);db.close();
});
test('a migrated session with a lost response reuses its new key rather than creating another session',async()=>{
 const f=setup(),{a,row}=await seedLegacy(f),{db,env,transport,sessions}=f,trace=[];let lose=true;
 env.STRIPE_HTTP=async(url,options)=>{trace.push(options);if(new URLSearchParams(options.body).has('payment_method_types[0]'))return Response.json({error:discontinued},{status:400});const response=await transport(url,options);if(lose){lose=false;throw Error('fixture lost migrated response');}return response;};
 assert.equal((await checkout(env,a)).status,503);const saved=db.prepare('SELECT * FROM order_payments WHERE order_id=?').get(a.id);assert.notEqual(saved.generation,row.generation);assert.equal(saved.state,'creating');assert.equal(saved.lock_until,0);assert.equal(sessions.size,1);
 assert.equal((await checkout(env,a)).status,200);assert.equal(sessions.size,1);assert.equal(trace.length,3);assert.equal(trace[1].headers['Idempotency-Key'],trace[2].headers['Idempotency-Key']);assert.equal(trace[1].body,trace[2].body);db.close();
});
test('legacy sessions with a successful unknown outcome are recovered using the original key',async()=>{
 const f=setup(),{a,row}=await seedLegacy(f),{db,env,transport,sessions,calls}=f;let lose=true;
 env.STRIPE_HTTP=async(...args)=>{const response=await transport(...args);if(lose){lose=false;throw Error('fixture legacy success response lost');}return response;};
 assert.equal((await checkout(env,a)).status,503);assert.equal((await checkout(env,a)).status,200);assert.equal(sessions.size,1);assert.equal(db.prepare('SELECT generation FROM order_payments').get().generation,row.generation);assert.equal(calls[0].options.body,calls[1].options.body);assert.equal(calls[0].options.headers['Idempotency-Key'],calls[1].options.headers['Idempotency-Key']);db.close();
});
test('other provider rejections cannot rotate a legacy attempt or weaken retry safety',async()=>{
 for(const [status,error]of [[500,discontinued],[401,discontinued],[400,{...discontinued,param:'other'}],[400,{...discontinued,message:'Card is not enabled for this account.'}],[400,{...discontinued,type:'api_error'}]]){
  const f=setup(),{a,row}=await seedLegacy(f),{db,env,sessions}=f;let calls=0;env.STRIPE_HTTP=async()=>{calls++;return Response.json({error},{status});};assert.equal((await checkout(env,a)).status,503);assert.equal(calls,1);const saved=db.prepare('SELECT * FROM order_payments').get();assert.equal(saved.generation,row.generation);assert.equal(saved.request_params,row.request_params);assert.equal(saved.state,'creating');assert.equal(sessions.size,0);db.close();
 }
});
test('parallel legacy retries acquire one lease and create one replacement session',async()=>{
 const f=setup(),{a}=await seedLegacy(f),{db,env,transport,sessions}=f;let release,entered,count=0;const gate=new Promise(resolve=>release=resolve),started=new Promise(resolve=>entered=resolve);
 env.STRIPE_HTTP=async(url,options)=>{count++;if(new URLSearchParams(options.body).has('payment_method_types[0]')){entered();await gate;return Response.json({error:discontinued},{status:400});}return transport(url,options);};
 const first=checkout(env,a);await started;assert.equal((await checkout(env,a)).status,409);release();assert.equal((await first).status,200);assert.equal(count,2);assert.equal(sessions.size,1);db.close();
});
test('a stale migration cannot rotate or unlock a newer lease, or mutate a paid record',async()=>{
 for(const changed of ['lease','paid']){
  const f=setup(),{a,row}=await seedLegacy(f),{db,env}=f;let count=0;const future=Math.floor(Date.now()/1000)+120;
  env.STRIPE_HTTP=async()=>{count++;if(changed==='lease')db.prepare('UPDATE order_payments SET lock_until=? WHERE order_id=?').run(future,a.id);else db.prepare("UPDATE order_payments SET state='paid',paid_at='fixture-paid' WHERE order_id=?").run(a.id);return Response.json({error:discontinued},{status:400});};
  assert.equal((await checkout(env,a)).status,409);assert.equal(count,1);const saved=db.prepare('SELECT * FROM order_payments').get();assert.equal(saved.generation,row.generation);assert.equal(saved.request_params,row.request_params);if(changed==='lease')assert.equal(saved.lock_until,future);else assert.equal(saved.state,'paid');db.close();
 }
});
