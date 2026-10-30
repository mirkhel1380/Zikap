import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from '../worker.mjs';
const host='https://api.example',site='https://mirkhel1380.github.io';
export function setupAccounts(){
 const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');
 for(const file of ['0001_orders.sql','0002_customer_accounts.sql'])db.exec(readFileSync(new URL('../migrations/'+file,import.meta.url),'utf8'));
 const DB={prepare(sql){let args=[];return{bind(...values){args=values;return this;},execute(){const r=db.prepare(sql).run(...args);return{meta:{changes:r.changes}};},async first(){return db.prepare(sql).get(...args)||null;},async all(){return{results:db.prepare(sql).all(...args)};},async run(){return this.execute();}};},async batch(statements){db.exec('BEGIN');try{const results=statements.map(s=>s.execute());db.exec('COMMIT');return results;}catch(e){db.exec('ROLLBACK');throw e;}}};
 const env={ALLOWED_ORIGIN:site,ADMIN_TOKEN:'fixture-owner-key-longer-than-thirty-two-characters',DB};return{db,env};
}
export async function call(env,path,method='GET',body,cookie,origin=host,token){
 const headers={Origin:origin};if(body)headers['Content-Type']='application/json';if(cookie)headers.Cookie=cookie;if(token)headers.Authorization='Bearer '+token;
 const response=await worker.fetch(new Request(host+path,{method,headers,body:body?JSON.stringify(body):undefined}),env);
 return{status:response.status,body:await response.json(),headers:response.headers,cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
const password='Local-fixture-password-2026-only';
const register=(env,email='one@example.com')=>call(env,'/account-api/register','POST',{name:'Fixture customer',email,password,consent:true});
const project={packageId:'audit',website:'https://example.com',pages:'https://example.com/',topic:'Gardening',language:'English',market:'Test only',goals:'Fixture review only',consent:true,company:''};
test('registration persists salted hashes, protects the session cookie and never returns credentials',async()=>{
 const{env,db}=setupAccounts();assert.equal((await call(env,'/account-api/session')).status,401);
 const a=await register(env);assert.equal(a.status,201);assert.equal(a.body.recoveryKey.length,64);assert.equal(a.body.user.emailVerified,false);
 const header=a.headers.get('set-cookie');for(const flag of ['__Host-zikap_session=','Path=/','Secure','HttpOnly','SameSite=Lax'])assert.ok(header.includes(flag));
 const stored=db.prepare('SELECT * FROM customer_users').get();assert.notEqual(stored.password_hash,password);assert.equal(stored.password_hash.length,64);assert.notEqual(stored.recovery_hash,a.body.recoveryKey);
 const session=await call(env,'/account-api/session','GET',null,a.cookie);assert.equal(session.status,200);assert.equal(session.body.user.email,'one@example.com');assert.equal('password_hash' in session.body,false);assert.equal(JSON.stringify(session.body).includes(password),false);
 assert.equal((await register(env)).status,409);assert.equal((await call(env,'/account-api/login','POST',{email:'one@example.com',password:'wrong-password-long-enough'})).status,401);
 const login=await call(env,'/account-api/login','POST',{email:'ONE@example.com',password});assert.equal(login.status,200);assert.equal('recoveryKey' in login.body,false);
 db.close();
});
test('account writes reject cross-site requests and unavailable account schema is reported separately',async()=>{
 const{env,db}=setupAccounts();const body={name:'Fixture',email:'one@example.com',password,consent:true};
 assert.equal((await call(env,'/account-api/register','POST',body,null,site)).status,403);assert.equal((await call(env,'/account-api/register','POST',body,null,'https://evil.example')).status,403);
 assert.equal((await call(env,'/health')).body.customerAccounts,true);db.exec('DROP TABLE customer_order_links');const health=await call(env,'/health');assert.equal(health.body.ready,true);assert.equal(health.body.customerAccounts,false);
 assert.equal((await call(env,'/account-api/status')).body.ready,false);assert.equal((await register(env)).status,503);db.close();
});
test('projects are isolated by account and retries do not create or claim another customer order',async()=>{
 const{env,db}=setupAccounts(),a=await register(env),b=await register(env,'two@example.com'),id=crypto.randomUUID();
 const created=await call(env,'/account-api/orders','POST',{...project,requestId:id,email:'forged@example.com',name:'Forged'},a.cookie);assert.equal(created.status,201);assert.equal(created.body.order.price,29);
 assert.equal(db.prepare('SELECT email FROM orders').get().email,'one@example.com');assert.equal((await call(env,'/account-api/orders/'+id,'GET',null,b.cookie)).status,404);assert.equal((await call(env,'/account-api/orders','GET',null,b.cookie)).body.orders.length,0);
 assert.equal((await call(env,'/account-api/orders','POST',{...project,requestId:id},b.cookie)).status,409);
 assert.equal((await call(env,'/account-api/orders','POST',{...project,requestId:id},a.cookie)).status,201);assert.equal(db.prepare('SELECT count(*) AS n FROM orders').get().n,1);
 assert.equal((await call(env,'/account-api/orders','POST',{...project,requestId:id,goals:'Different request'},a.cookie)).status,409);
 assert.equal((await call(env,'/account-api/orders','GET',null,a.cookie)).body.orders.length,1);db.close();
});
test('legacy orders require the private receipt; email and ID alone never attach an order',async()=>{
 const{env,db}=setupAccounts(),a=await register(env),b=await register(env,'two@example.com');
 const legacy=await call(env,'/orders','POST',{...project,name:'Guest',email:'different@example.com'},null,site);assert.equal(legacy.status,201);
 const body={orderId:legacy.body.id,receiptKey:legacy.body.token};
 assert.equal((await call(env,'/account-api/orders/attach','POST',{...body,receiptKey:'x'.repeat(72)},a.cookie)).status,404);
 assert.equal((await call(env,'/account-api/orders/attach','POST',body,a.cookie)).status,200);assert.equal((await call(env,'/account-api/orders/attach','POST',body,a.cookie)).status,200);
 assert.equal((await call(env,'/account-api/orders/attach','POST',body,b.cookie)).status,409);
 assert.equal((await call(env,'/account-api/orders/'+body.orderId,'GET',null,b.cookie)).status,404);
 assert.equal((await call(env,'/orders/'+body.orderId,'GET',null,null,site,body.receiptKey)).status,200);db.close();
});
test('owner delivery is readable in the account and the one-revision rule remains atomic',async()=>{
 const{env,db}=setupAccounts(),a=await register(env),id=crypto.randomUUID();await call(env,'/account-api/orders','POST',{...project,requestId:id},a.cookie);
 const report='Fixture report\n<script>literal text only</script>';
 assert.equal((await call(env,'/admin/orders/'+id,'PATCH',{status:'delivered',report,note:'Review ready'},null,site,env.ADMIN_TOKEN)).status,200);
 const result=await call(env,'/account-api/orders/'+id,'GET',null,a.cookie);assert.equal(result.body.order.report,report);assert.equal(result.body.order.pages[0],'https://example.com/');
 assert.equal((await call(env,'/account-api/orders/'+id+'/revision','POST',{note:'Clarify the first action'},a.cookie)).status,200);assert.equal((await call(env,'/account-api/orders/'+id+'/revision','POST',{note:'Again'},a.cookie)).status,409);
 assert.equal((await call(env,'/account-api/logout','POST',{},a.cookie)).status,200);assert.equal((await call(env,'/account-api/session','GET',null,a.cookie)).status,401);db.close();
});
test('recovery rotates the code and password and revokes old sessions',async()=>{
 const{env,db}=setupAccounts(),a=await register(env),next='Replacement-fixture-password-only';
 assert.equal((await call(env,'/account-api/recover','POST',{email:'one@example.com',password:next,recoveryKey:'0'.repeat(64)})).status,401);
 const r=await call(env,'/account-api/recover','POST',{email:'one@example.com',password:next,recoveryKey:a.body.recoveryKey});assert.equal(r.status,200);assert.notEqual(r.body.recoveryKey,a.body.recoveryKey);
 assert.equal((await call(env,'/account-api/session','GET',null,a.cookie)).status,401);assert.equal((await call(env,'/account-api/session','GET',null,r.cookie)).status,200);
 assert.equal((await call(env,'/account-api/recover','POST',{email:'one@example.com',password:next,recoveryKey:a.body.recoveryKey})).status,401);
 assert.equal((await call(env,'/account-api/login','POST',{email:'one@example.com',password})).status,401);assert.equal((await call(env,'/account-api/login','POST',{email:'one@example.com',password:next})).status,200);db.close();
});
test('security changes require the current password, rotate recovery codes and clear old sessions',async()=>{
 const{env,db}=setupAccounts(),a=await register(env);
 assert.equal((await call(env,'/account-api/recovery-code','POST',{currentPassword:'incorrect-password-long'},a.cookie)).status,401);
 const rotated=await call(env,'/account-api/recovery-code','POST',{currentPassword:password},a.cookie);assert.equal(rotated.status,200);assert.notEqual(rotated.body.recoveryKey,a.body.recoveryKey);
 const changed=await call(env,'/account-api/password','POST',{currentPassword:password,newPassword:'New-fixture-password-for-tests'},a.cookie);assert.equal(changed.status,200);assert.equal((await call(env,'/account-api/session','GET',null,a.cookie)).status,401);assert.equal((await call(env,'/account-api/session','GET',null,changed.cookie)).status,200);db.close();
});
test('account login throttling and session expiry are enforced by the server',async()=>{
 const{env,db}=setupAccounts(),a=await register(env);db.prepare('UPDATE customer_sessions SET expires_at=0').run();assert.equal((await call(env,'/account-api/session','GET',null,a.cookie)).status,401);
 for(let i=0;i<10;i++)assert.equal((await call(env,'/account-api/login','POST',{email:'unknown@example.com',password})).status,401);
 assert.equal((await call(env,'/account-api/login','POST',{email:'unknown@example.com',password})).status,429);db.close();
});
