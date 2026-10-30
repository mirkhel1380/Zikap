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
async function create(env,email='fixture@example.com'){
 const a=await call(env,'/account-api/register','POST',{name:'Fixture',email,password,consent:true}),id=crypto.randomUUID();assert.equal(a.status,201);
 assert.equal((await call(env,'/account-api/orders','POST',{...project,requestId:id},a.cookie)).status,201);
 assert.equal((await call(env,'/admin/orders/'+id,'PATCH',{status:'accepted',report:'',note:'Scope and timing confirmed.'},null,true)).status,200);return{id,cookie:a.cookie};
}
const checkout=(env,a,extra={})=>call(env,'/account-api/orders/'+a.id+'/checkout','POST',{acknowledged:true,...extra},a.cookie);
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
