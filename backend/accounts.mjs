// First-party customer sessions. No email delivery or password-reset email service.
import {paymentsReady,stripeConfigured,paymentSummaries,checkout,reconcilePayment} from './payments.mjs';
import {actionsReady,projectActions} from './actions.mjs';
const COOKIE='__Host-zikap_session',LIFETIME=7*24*60*60;
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const encode=new TextEncoder();
const random=()=>[...crypto.getRandomValues(new Uint8Array(32))].map(v=>v.toString(16).padStart(2,'0')).join('');
const cookie=(token,age=LIFETIME)=>COOKIE+'='+token+'; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age='+age;
const equal=(a,b)=>{if(a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0;};
async function passwordHash(password,salt){
 const key=await crypto.subtle.importKey('raw',encode.encode(password),'PBKDF2',false,['deriveBits']);
 // Workers WebCrypto supports at most 100,000 PBKDF2 iterations per invocation.
 const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:encode.encode(salt),iterations:100000,hash:'SHA-256'},key,256);
 return [...new Uint8Array(bits)].map(v=>v.toString(16).padStart(2,'0')).join('');
}
export async function accountsReady(env){
 if(!env.DB)return false;
 try{
  await env.DB.prepare('SELECT id,password_hash,password_salt,recovery_hash FROM customer_users LIMIT 1').first();
  await env.DB.prepare('SELECT token_hash,user_id,expires_at FROM customer_sessions LIMIT 1').first();
  await env.DB.prepare('SELECT order_id,user_id FROM customer_order_links LIMIT 1').first();return true;
 }catch{return false;}
}
export async function accountRoute(req,env,h){
 const {ApiError,hash,text,jsonBody,rate,validateOrder,receipt}=h,path=new URL(req.url).pathname;
 const result=(body,status=200,headers={})=>({body,status,headers});
 const emailOf=value=>{const email=text(value,254).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new ApiError('Enter a valid email address.');return email;};
 const passwordOf=value=>{if(typeof value!=='string'||value.length<15||value.length>128)throw new ApiError('Use a password between 15 and 128 characters.');return value;};
 if(path==='/account-api/status'&&req.method==='GET')return result({ready:await accountsReady(env),emailVerification:false,actionPlans:await actionsReady(env),payments:await paymentsReady(env),paymentTestMode:stripeConfigured(env)?!env.STRIPE_SECRET_KEY.includes('_live_'):null});
 if(!await accountsReady(env))throw new ApiError('Customer accounts are being prepared. Please return shortly.',503);
 // Cookie-authenticated writes are same-origin only; CORS does not replace this check.
 if(!['GET','HEAD'].includes(req.method)&&req.headers.get('origin')!==new URL(req.url).origin)throw new ApiError('Open the account page and try again.',403);
 async function session(){
  const raw=(req.headers.get('cookie')||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)||'';
  if(!/^[a-f0-9]{64}$/.test(raw))throw new ApiError('Please sign in to your account.',401);
  const row=await env.DB.prepare('SELECT u.id,u.email,u.name,s.token_hash FROM customer_sessions s JOIN customer_users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').bind(await hash(raw),Math.floor(Date.now()/1000)).first();
  if(!row)throw new ApiError('Your session has expired. Please sign in again.',401);return row;
 }
 async function startSession(user){
  const token=random(),now=Math.floor(Date.now()/1000);
  await env.DB.batch([
   env.DB.prepare('DELETE FROM customer_sessions WHERE expires_at<=?').bind(now),
   env.DB.prepare('INSERT INTO customer_sessions (token_hash,user_id,created_at,expires_at) VALUES (?,?,?,?)').bind(await hash(token),user.id,now,now+LIFETIME),
   env.DB.prepare('DELETE FROM customer_sessions WHERE user_id=? AND token_hash NOT IN (SELECT token_hash FROM customer_sessions WHERE user_id=? ORDER BY created_at DESC,rowid DESC LIMIT 5)').bind(user.id,user.id)
  ]);
  return {'Set-Cookie':cookie(token)};
 }
 const publicUser=u=>({name:u.name,email:u.email,emailVerified:false});
 const accountOrder=async(row,knownPayment)=>{let pages=[];try{pages=JSON.parse(row.pages);}catch{}const payment=knownPayment||(await paymentSummaries(env,[row.id])).get(row.id);return {...receipt(row),pages,topic:row.topic,language:row.language,market:row.market,goals:row.goals,payment,paymentCollected:!payment?.testMode&&(payment?.status==='paid'||payment?.status==='partially_refunded')};};
 if(path==='/account-api/register'&&req.method==='POST'){
  await rate(req,env,'account-register',5);const data=await jsonBody(req,5000),email=emailOf(data.email),password=passwordOf(data.password),name=text(data.name,100);
  if(data.consent!==true)throw new ApiError('Please agree to store the details needed for your account and projects.');
  const salt=random(),recoveryKey=random(),user={id:crypto.randomUUID(),email,name};
  const r=await env.DB.prepare('INSERT INTO customer_users (id,email,name,password_hash,password_salt,recovery_hash,created_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(email) DO NOTHING').bind(user.id,email,name,await passwordHash(password,salt),salt,await hash(recoveryKey),new Date().toISOString()).run();
  if(!r.meta.changes)throw new ApiError('This account could not be created. Try signing in or use your recovery code.',409);
  return result({user:publicUser(user),recoveryKey},201,await startSession(user));
 }
 if(path==='/account-api/login'&&req.method==='POST'){
  await rate(req,env,'account-login',20);const data=await jsonBody(req,4000),email=emailOf(data.email),password=passwordOf(data.password);
  await rate(req,env,'account-identity-'+await hash(email),10);
  const user=await env.DB.prepare('SELECT * FROM customer_users WHERE email=?').bind(email).first();
  const derived=await passwordHash(password,user?.password_salt||'0'.repeat(64));
  if(!user||!equal(derived,user.password_hash))throw new ApiError('Email or password is incorrect.',401);
  return result({user:publicUser(user)},200,await startSession(user));
 }
 if(path==='/account-api/recover'&&req.method==='POST'){
  await rate(req,env,'account-recover',10);const data=await jsonBody(req,5000),email=emailOf(data.email),password=passwordOf(data.password),code=typeof data.recoveryKey==='string'?data.recoveryKey.trim().toLowerCase():'';
  await rate(req,env,'account-recovery-identity-'+await hash(email),5);
  const user=await env.DB.prepare('SELECT * FROM customer_users WHERE email=?').bind(email).first();
  if(!/^[a-f0-9]{64}$/.test(code)||!user||!equal(await hash(code),user.recovery_hash))throw new ApiError('The account details or recovery code are incorrect.',401);
  const salt=random(),newCode=random(),recoveryHash=await hash(newCode);
  const updated=await env.DB.prepare('UPDATE customer_users SET password_hash=?,password_salt=?,recovery_hash=? WHERE id=? AND recovery_hash=?').bind(await passwordHash(password,salt),salt,recoveryHash,user.id,user.recovery_hash).run();
  if(!updated.meta.changes)throw new ApiError('The recovery code has already been used. Use your latest code.',409);
  await env.DB.prepare('DELETE FROM customer_sessions WHERE user_id=?').bind(user.id).run();
  return result({user:publicUser(user),recoveryKey:newCode},200,await startSession(user));
 }
 const user=await session();
 if(['/account-api/password','/account-api/recovery-code'].includes(path)&&req.method==='POST'){
  await rate(req,env,'account-security',5);const data=await jsonBody(req,5000),current=passwordOf(data.currentPassword);
  const full=await env.DB.prepare('SELECT * FROM customer_users WHERE id=?').bind(user.id).first();
  if(!full||!equal(await passwordHash(current,full.password_salt),full.password_hash))throw new ApiError('Your current password is incorrect.',401);
  const recoveryKey=random(),recoveryHash=await hash(recoveryKey);
  if(path==='/account-api/recovery-code'){
   await env.DB.prepare('UPDATE customer_users SET recovery_hash=? WHERE id=?').bind(recoveryHash,user.id).run();
   return result({recoveryKey});
  }
  const next=passwordOf(data.newPassword),salt=random();
  await env.DB.batch([
   env.DB.prepare('UPDATE customer_users SET password_hash=?,password_salt=?,recovery_hash=? WHERE id=?').bind(await passwordHash(next,salt),salt,recoveryHash,user.id),
   env.DB.prepare('DELETE FROM customer_sessions WHERE user_id=?').bind(user.id)
  ]);
  return result({user:publicUser(user),recoveryKey},200,await startSession(user));
 }
 if(path==='/account-api/session'&&req.method==='GET')return result({user:publicUser(user)});
 if(path==='/account-api/logout'&&req.method==='POST'){
  await env.DB.prepare('DELETE FROM customer_sessions WHERE token_hash=?').bind(user.token_hash).run();return result({signedOut:true},200,{'Set-Cookie':cookie('',0)});
 }
 if(path==='/account-api/orders'&&req.method==='GET'){
  await rate(req,env,'account-read',240);const cursor=new URL(req.url).searchParams.get('before');let statement;
  const sql='SELECT o.* FROM orders o JOIN customer_order_links l ON l.order_id=o.id WHERE l.user_id=?';
  if(cursor){const [date,id,...rest]=cursor.split('|');if(rest.length||!/^\d{4}-\d{2}-\d{2}T[0-9:.]+Z$/.test(date)||!uuid.test(id))throw new ApiError('Invalid project list cursor.');statement=env.DB.prepare(sql+' AND (o.created_at<? OR (o.created_at=? AND o.id<?)) ORDER BY o.created_at DESC,o.id DESC LIMIT 50').bind(user.id,date,date,id);}
  else statement=env.DB.prepare(sql+' ORDER BY o.created_at DESC,o.id DESC LIMIT 50').bind(user.id);
  const {results}=await statement.all(),last=results.at(-1),payments=await paymentSummaries(env,results.map(row=>row.id));return result({orders:await Promise.all(results.map(row=>accountOrder(row,payments.get(row.id)))),next:results.length===50?last.created_at+'|'+last.id:null});
 }
 if(path==='/account-api/orders'&&req.method==='POST'){
  await rate(req,env,'account-create',5);const raw=await jsonBody(req);if(raw.consent!==true)throw new ApiError('Consent is required to store the project request.');if(raw.company)throw new ApiError('Unable to accept this request.');
  let o;try{o=validateOrder({...raw,name:user.name,email:user.email});}catch(e){if(e instanceof ApiError)throw e;throw new ApiError('Check the project URLs and required fields.');}
  if(!uuid.test(raw.requestId))throw new ApiError('Invalid project reference. Reload and try again.');
  const id=raw.requestId,tokenHash=await hash(random()),now=new Date().toISOString();
  await env.DB.batch([
   env.DB.prepare('INSERT INTO orders (id,token_hash,created_at,updated_at,package_id,price_usd,name,email,website,pages,topic,language,market,goals) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(id,tokenHash,now,now,o.packageId,o.price,o.name,o.email,o.website,o.pages,o.topic,o.language,o.market,o.goals),
   env.DB.prepare('INSERT INTO customer_order_links (order_id,user_id) SELECT id,? FROM orders WHERE id=? AND token_hash=? ON CONFLICT(order_id) DO NOTHING').bind(user.id,id,tokenHash)
  ]);
  const row=await env.DB.prepare('SELECT o.* FROM orders o JOIN customer_order_links l ON l.order_id=o.id WHERE o.id=? AND l.user_id=?').bind(id,user.id).first();
  const fields={package_id:o.packageId,website:o.website,pages:o.pages,topic:o.topic,language:o.language,market:o.market,goals:o.goals};
  if(!row||Object.entries(fields).some(([k,v])=>row[k]!==v))throw new ApiError('This project reference is already in use. Check your project list before trying again.',409);
  return result({order:await accountOrder(row)},201);
 }
 if(path==='/account-api/orders/attach'&&req.method==='POST'){
  await rate(req,env,'account-attach',30);const data=await jsonBody(req,5000),id=typeof data.orderId==='string'?data.orderId.trim():'',key=typeof data.receiptKey==='string'?data.receiptKey.trim():'';
  if(!uuid.test(id)||key.length!==72)throw new ApiError('Enter the original order ID and private receipt key.');
  const row=await env.DB.prepare('SELECT * FROM orders WHERE id=?').bind(id).first();
  if(!row||!equal(await hash(key),row.token_hash))throw new ApiError('Order not found or receipt key incorrect.',404);
  await env.DB.prepare('INSERT INTO customer_order_links (order_id,user_id) VALUES (?,?) ON CONFLICT(order_id) DO NOTHING').bind(id,user.id).run();
  const owner=await env.DB.prepare('SELECT user_id FROM customer_order_links WHERE order_id=?').bind(id).first();
  if(owner?.user_id!==user.id)throw new ApiError('This project is already linked to another account.',409);
  return result({order:await accountOrder(row)});
 }
 const actionMatch=path.match(/^\/account-api\/orders\/([a-f0-9-]{36})\/actions(?:\/([a-f0-9-]{36}))?$/);
 if(actionMatch){
  await rate(req,env,'account-read',240);const row=await env.DB.prepare('SELECT o.* FROM orders o JOIN customer_order_links l ON l.order_id=o.id WHERE o.id=? AND l.user_id=?').bind(actionMatch[1],user.id).first();
  if(!row)throw new ApiError('Project not found.',404);
  return projectActions(req,env,row,actionMatch[2],h);
 }
 const match=path.match(/^\/account-api\/orders\/([a-f0-9-]{36})(\/revision|\/checkout|\/payment-status)?$/);
 if(match){
  await rate(req,env,'account-read',240);const row=await env.DB.prepare('SELECT o.* FROM orders o JOIN customer_order_links l ON l.order_id=o.id WHERE o.id=? AND l.user_id=?').bind(match[1],user.id).first();
  if(!row)throw new ApiError('Project not found.',404);
  if(req.method==='GET'&&!match[2])return result({order:await accountOrder(row)});
  if(req.method==='POST'&&match[2]==='/checkout'){
   await rate(req,env,'stripe-checkout',20);const data=await jsonBody(req,1000);if(data.acknowledged!==true)throw new ApiError('Confirm the package scope and price before opening Stripe checkout.');return result(await checkout(env,row,new URL(req.url).origin,ApiError));
  }
  if(req.method==='POST'&&match[2]==='/payment-status'){
   await rate(req,env,'stripe-check',30);await reconcilePayment(env,row.id,ApiError);return result({order:await accountOrder(row)});
  }
  if(req.method==='POST'&&match[2]==='/revision'){
   const data=await jsonBody(req,5000),note=text(data.note,2000);
   const updated=await env.DB.prepare("UPDATE orders SET revision_used=1,revision_note=?,status='revision_requested',updated_at=? WHERE id=? AND status='delivered' AND revision_used=0").bind(note,new Date().toISOString(),row.id).run();
   if(!updated.meta.changes)throw new ApiError('One revision may be requested after delivery.',409);return result({status:'revision_requested'});
  }
 }
 throw new ApiError('Account route not found.',404);
}
