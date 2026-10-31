// A separate same-origin administration app. Customer credentials never authorize it.
const COOKIE='__Host-zikap_admin_session',LIFE=24*60*60;
const encoder=new TextEncoder();
const hex=bytes=>[...new Uint8Array(bytes)].map(v=>v.toString(16).padStart(2,'0')).join('');
const random=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
const hash=async value=>hex(await crypto.subtle.digest('SHA-256',encoder.encode(value)));
const equal=(a,b)=>{if(a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0;};
const cookie=(value,age=LIFE)=>`${COOKIE}=${value}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${age}`;
class ErrorResponse extends Error{constructor(message,status=400){super(message);this.status=status;}}
async function derive(password,salt){const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:encoder.encode(salt),iterations:100000,hash:'SHA-256'},key,256));}
function password(value){if(typeof value!=='string'||value.length<15||value.length>128)throw new ErrorResponse('Use a password between 15 and 128 characters.');return value;}
function username(value){if(typeof value!=='string'||! /^[a-zA-Z0-9._-]{3,64}$/.test(value.trim()))throw new ErrorResponse('Use 3–64 letters, numbers, dots, underscores or hyphens for the username.');return value.trim().toLowerCase();}
async function body(req){if(!req.headers.get('content-type')?.includes('application/json'))throw new ErrorResponse('Send JSON.',415);const reader=req.body?.getReader();if(!reader)throw new ErrorResponse('Missing request body.');let count=0,parts=[];while(true){const r=await reader.read();if(r.done)break;count+=r.value.byteLength;if(count>6000){await reader.cancel();throw new ErrorResponse('Request too large.',413);}parts.push(r.value);}try{const bytes=new Uint8Array(count);let at=0;for(const p of parts){bytes.set(p,at);at+=p.byteLength;}const result=JSON.parse(new TextDecoder().decode(bytes));if(!result||typeof result!=='object'||Array.isArray(result))throw Error();return result;}catch{throw new ErrorResponse('Invalid JSON.');}}
async function rate(req,env,kind,limit,identity=''){const now=Math.floor(Date.now()/1000),window=Math.floor(now/3600),ip=req.headers.get('CF-Connecting-IP')||'local',key='admin-portal:'+kind+':'+window+':'+await hash(identity||ip);const r=await env.DB.prepare('INSERT INTO rate_limits (key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key,(window+1)*3600).first();if(r.count>limit)throw new ErrorResponse('Too many attempts. Try again in the next hour.',429);await env.DB.prepare('DELETE FROM rate_limits WHERE expires<?').bind(now).run();}
async function ready(env){if(!env.DB||!env.ZIKAP_API||typeof env.ADMIN_TOKEN!=='string'||env.ADMIN_TOKEN.length<32)return false;try{await env.DB.prepare('SELECT id,username,password_hash,password_salt,recovery_hash,version FROM admin_users LIMIT 1').first();await env.DB.prepare('SELECT token_hash,user_version,expires_at FROM admin_sessions LIMIT 1').first();return true;}catch{return false;}}
async function session(req,env){const raw=(req.headers.get('cookie')||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)||'';if(!/^[a-f0-9]{64}$/.test(raw))throw new ErrorResponse('Sign in to the administration portal.',401);const row=await env.DB.prepare('SELECT u.id,u.username,u.version,s.token_hash FROM admin_sessions s JOIN admin_users u ON u.id=s.user_id AND u.version=s.user_version WHERE s.token_hash=? AND s.expires_at>?').bind(await hash(raw),Math.floor(Date.now()/1000)).first();if(!row)throw new ErrorResponse('Your admin session ended. Sign in again.',401);return row;}
async function startSession(user,env){const raw=random(),now=Math.floor(Date.now()/1000);const inserted=await env.DB.prepare('INSERT INTO admin_sessions (token_hash,user_id,user_version,created_at,expires_at) SELECT ?,id,version,?,? FROM admin_users WHERE id=? AND version=?').bind(await hash(raw),now,now+LIFE,user.id,user.version).run();if(!inserted.meta.changes)throw new ErrorResponse('Your security settings changed. Sign in again.',401);await env.DB.batch([env.DB.prepare('DELETE FROM admin_sessions WHERE expires_at<=?').bind(now),env.DB.prepare('DELETE FROM admin_sessions WHERE user_id=? AND token_hash NOT IN (SELECT token_hash FROM admin_sessions WHERE user_id=? ORDER BY created_at DESC,rowid DESC LIMIT 3)').bind(user.id,user.id)]);return {'Set-Cookie':cookie(raw)};}
const security={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'; object-src 'none'"};
export default {async fetch(req,env){const url=new URL(req.url),path=url.pathname;const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{...security,'Content-Type':'application/json;charset=utf-8',...extra}});try{
 if(!['GET','HEAD'].includes(req.method)&&req.headers.get('origin')!==url.origin)throw new ErrorResponse('Open this administration portal to continue.',403);
 if(req.headers.get('origin')&&req.headers.get('origin')!==url.origin)throw new ErrorResponse('Origin not allowed.',403);
 if(path==='/admin-api/status'&&req.method==='GET'){const available=await ready(env);const owner=available?await env.DB.prepare('SELECT id FROM admin_users LIMIT 1').first():null;return json({ready:available,configured:!!owner,service:'zikap-admin'},available?200:503);}
 if(path.startsWith('/admin-api/')||path.startsWith('/admin/')){
  if(!await ready(env))throw new ErrorResponse('Administration is being prepared. Please return shortly.',503);
  if(['/admin-api/setup','/admin-api/login','/admin-api/recover'].includes(path)&&req.method==='POST'){
   await rate(req,env,'auth',20);const data=await body(req),name=username(data.username),pass=password(data.password);await rate(req,env,'identity',10,name);
   if(path==='/admin-api/setup'){
    await rate(req,env,'setup',5);const token=typeof data.ownerKey==='string'&&data.ownerKey.length<=256?data.ownerKey:'';
    if(!equal(await hash(token),await hash(env.ADMIN_TOKEN)))throw new ErrorResponse('The existing owner access key is incorrect.',401);
    const salt=random(),recoveryKey=random(),user={id:'owner',username:name,version:1};
    const saved=await env.DB.prepare("INSERT INTO admin_users (id,username,password_hash,password_salt,recovery_hash,created_at) VALUES ('owner',?,?,?,?,?) ON CONFLICT(id) DO NOTHING").bind(name,await derive(pass,salt),salt,await hash(recoveryKey),new Date().toISOString()).run();
    if(!saved.meta.changes)throw new ErrorResponse('The owner account already exists. Sign in or use its recovery code.',409);
    return json({user:{username:name},recoveryKey},201,await startSession(user,env));
   }
   const user=await env.DB.prepare('SELECT * FROM admin_users WHERE username=?').bind(name).first();
   if(path==='/admin-api/login'){
    const derived=await derive(pass,user?.password_salt||'0'.repeat(64));if(!user||!equal(derived,user.password_hash))throw new ErrorResponse('Username or password is incorrect.',401);
    return json({user:{username:user.username}},200,await startSession(user,env));
   }
   await rate(req,env,'recovery',5,name);const code=typeof data.recoveryKey==='string'?data.recoveryKey.trim().toLowerCase():'';
   if(!/^[a-f0-9]{64}$/.test(code)||!user||!equal(await hash(code),user.recovery_hash))throw new ErrorResponse('Username or recovery code is incorrect.',401);
   const salt=random(),recoveryKey=random();const changed=await env.DB.prepare('UPDATE admin_users SET password_hash=?,password_salt=?,recovery_hash=?,version=version+1 WHERE id=? AND recovery_hash=? AND version=?').bind(await derive(pass,salt),salt,await hash(recoveryKey),user.id,user.recovery_hash,user.version).run();
   if(!changed.meta.changes)throw new ErrorResponse('That recovery code is no longer current.',409);
   await env.DB.prepare('DELETE FROM admin_sessions WHERE user_id=?').bind(user.id).run();return json({user:{username:user.username},recoveryKey},200,await startSession({...user,version:user.version+1},env));
  }
  const user=await session(req,env);await rate(req,env,'read',300);
  if(path==='/admin-api/session'&&req.method==='GET')return json({user:{username:user.username}});
  if(path==='/admin-api/logout'&&req.method==='POST'){await env.DB.prepare('DELETE FROM admin_sessions WHERE token_hash=?').bind(user.token_hash).run();return json({signedOut:true},200,{'Set-Cookie':cookie('',0)});}
  if(path==='/admin-api/password'&&req.method==='POST'){
   await rate(req,env,'security',5);const data=await body(req),current=password(data.currentPassword),next=password(data.password);const full=await env.DB.prepare('SELECT * FROM admin_users WHERE id=?').bind(user.id).first();if(!full||!equal(await derive(current,full.password_salt),full.password_hash))throw new ErrorResponse('The current password is incorrect.',403);
   const salt=random(),recoveryKey=random();const changed=await env.DB.prepare('UPDATE admin_users SET password_hash=?,password_salt=?,recovery_hash=?,version=version+1 WHERE id=? AND version=?').bind(await derive(next,salt),salt,await hash(recoveryKey),user.id,user.version).run();if(!changed.meta.changes)throw new ErrorResponse('Security settings changed. Sign in again.',409);
   await env.DB.prepare('DELETE FROM admin_sessions WHERE user_id=?').bind(user.id).run();return json({user:{username:user.username},recoveryKey},200,await startSession({...user,version:user.version+1},env));
  }
  // Forward only the existing owner-order operations, never public/customer/webhook APIs.
  if(/^\/admin\/orders(?:\/[a-f0-9-]{36}(?:\/messages(?:\/read)?)?)?$/.test(path)&&['GET','POST','PATCH','DELETE'].includes(req.method)){
   const internal=new URL(req.url);internal.protocol='https:';internal.host='zikap.internal';const headers=new Headers(req.headers);headers.delete('cookie');headers.set('Origin',internal.origin);headers.set('Authorization','Bearer '+env.ADMIN_TOKEN);
   const upstream=await env.ZIKAP_API.fetch(new Request(internal,{method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:req.body,duplex:'half'}));
   const safe=new Headers(security);safe.set('Content-Type','application/json;charset=utf-8');return new Response(upstream.body,{status:upstream.status,headers:safe});
  }
  throw new ErrorResponse('Route not found.',404);
 }
 if(!['GET','HEAD'].includes(req.method))throw new ErrorResponse('Method not allowed.',405);
 if(!env.ADMIN_ASSETS)throw new ErrorResponse('Administration assets are unavailable.',503);
 const asset=await env.ADMIN_ASSETS.fetch(req),headers=new Headers(asset.headers);for(const [key,value]of Object.entries(security))headers.set(key,value);return new Response(asset.body,{status:asset.status,headers});
 }catch(e){return json({error:e instanceof ErrorResponse?e.message:'The administration service could not complete this request.'},e instanceof ErrorResponse?e.status:500);}}};
