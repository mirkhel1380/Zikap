import {auditRoute} from './website-audit.mjs';
import {historyReady,editVersion,projectHistory} from './history.mjs';
// Project delivery, customer workspaces and guarded checkout. No email delivery or live crawling.
import {accountRoute,accountsReady} from './accounts.mjs';
import {paymentsReady,paymentSummaries,protectOwnerChange,stripeWebhook} from './payments.mjs';
import {projectMessages,unreadCounts} from './messages.mjs';
import {prices} from './catalog.mjs';
const states = ['requested','accepted','in_progress','delivered','declined'];
class ApiError extends Error { constructor(message,status=400){super(message);this.status=status;} }
const hash = async text => [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(b=>b.toString(16).padStart(2,'0')).join('');
const text = (value,max,required=true) => {
  if(typeof value!=='string' || value.trim().length>max || (required&&!value.trim())) throw new ApiError('Please complete all required fields within the stated limits.');
  return value.trim();
};
export function validateOrder(data) {
  if(!Object.hasOwn(prices,data.packageId)) throw new ApiError('Choose a valid starter package.');
  const website=new URL(text(data.website,500));
  if(!['https:','http:'].includes(website.protocol)||website.username||website.password) throw new ApiError('Use a public HTTP or HTTPS website URL.');
  const name=text(data.name,100),email=text(data.email,254);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError('Enter a valid email address.');
  const pages=text(data.pages,2600,false).split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  const max=data.packageId==='onpage'?3:5;
  if(pages.length>max) throw new ApiError(`This package allows up to ${max} page URLs.`);
  for(const page of pages){let u;try{u=new URL(page);}catch{throw new ApiError('Enter a complete URL on each line.');}if(!['https:','http:'].includes(u.protocol)||u.origin!==website.origin||u.username||u.password)throw new ApiError('Page URLs must belong to the same website origin.');}
  if((data.packageId==='onpage'||data.packageId==='audit'||data.packageId==='bundle')&&!pages.length)throw new ApiError('Add at least one page URL to review.');
  return {packageId:data.packageId,price:prices[data.packageId],website:website.href,name,email,pages:JSON.stringify(pages),topic:text(data.topic,200,['keywords','bundle'].includes(data.packageId)),language:text(data.language,80),market:text(data.market,100),goals:text(data.goals,3000)};
}
async function jsonBody(req,max=20000){
  if(!req.headers.get('content-type')?.includes('application/json'))throw new ApiError('Send JSON.',415);
  const reader=req.body?.getReader();if(!reader)throw new ApiError('Missing request body.');
  let length=0,parts=[];
  while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>max){await reader.cancel();throw new ApiError('Request too large.',413);}parts.push(value);}
  try{const all=new Uint8Array(length);let pos=0;for(const p of parts){all.set(p,pos);pos+=p.length;}const parsed=JSON.parse(new TextDecoder().decode(all));if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('Invalid JSON object');return parsed;}catch{throw new ApiError('Invalid JSON.');}
}
async function rate(req,env,kind,limit){
  const now=Math.floor(Date.now()/1000),window=Math.floor(now/3600);
  const ip=req.headers.get('CF-Connecting-IP')||'local';
  const key=kind+':'+window+':'+await hash(ip);
  const r=await env.DB.prepare('INSERT INTO rate_limits (key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key,(window+1)*3600).first();
  if(r.count>limit)throw new ApiError('Too many requests. Please try again in the next hour.',429);
  await env.DB.prepare('DELETE FROM rate_limits WHERE expires < ?').bind(now).run();
}
function receipt(row){return {id:row.id,createdAt:row.created_at,updatedAt:row.updated_at,status:row.status,packageId:row.package_id,price:row.price_usd,website:row.website,report:row.report,note:row.owner_note,revisionUsed:!!row.revision_used,revisionNote:row.revision_note,paymentCollected:false};}
async function admin(req,env){
  if(!env.ADMIN_TOKEN||env.ADMIN_TOKEN.length<32)throw new ApiError('Owner access is not configured.',503);
  const token=req.headers.get('authorization')?.replace(/^Bearer /,'')||'';
  if(await hash(token)!==await hash(env.ADMIN_TOKEN))throw new ApiError('Owner authentication required.',401);
}
export default {async fetch(req,env){
  const origin=req.headers.get('origin'),allowed=env.ALLOWED_ORIGIN,requestOrigin=new URL(req.url).origin;
  const headers={'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Vary':'Origin'};
  if(origin===allowed){headers['Access-Control-Allow-Origin']=origin;headers['Access-Control-Allow-Methods']='GET,POST,PATCH,OPTIONS,DELETE';headers['Access-Control-Allow-Headers']='Content-Type,Authorization';}
  const respond=(body,status=200,extra={})=>new Response(JSON.stringify(body),{status,headers:{...headers,...extra}});
  if(origin&&origin!==allowed&&origin!==requestOrigin)return respond({error:'Origin not allowed.'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  try{
    const path=new URL(req.url).pathname;
    if(path==='/account'||path.startsWith('/account/')){
      if(!['GET','HEAD'].includes(req.method))throw new ApiError('Method not allowed.',405);
      if(!env.ACCOUNT_ASSETS)throw new ApiError('Customer accounts are being prepared. Please return shortly.',503);
      const asset=await env.ACCOUNT_ASSETS.fetch(req),secured=new Headers(asset.headers);
      secured.set('Cache-Control','no-store');secured.set('X-Content-Type-Options','nosniff');secured.set('Referrer-Policy','no-referrer');secured.set('X-Frame-Options','DENY');
      secured.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'; object-src 'none'");
      return new Response(asset.body,{status:asset.status,headers:secured});
    }
    // Both the root and /health identify this script and report setup status without revealing secrets.
    if((path==='/'||path==='/health')&&req.method==='GET'){
      const checks={databaseBinding:!!env.DB,adminSecret:typeof env.ADMIN_TOKEN==='string'&&env.ADMIN_TOKEN.length>=32,ordersTable:null,rateLimitsTable:null};
      if(checks.databaseBinding){
        try{await env.DB.prepare('SELECT id, token_hash, status, revision_used FROM orders LIMIT 1').first();checks.ordersTable=true;}catch{checks.ordersTable=false;}
        try{await env.DB.prepare('SELECT key, count, expires FROM rate_limits LIMIT 1').first();checks.rateLimitsTable=true;}catch{checks.rateLimitsTable=false;}
      }
      const ready=Object.values(checks).every(value=>value===true);
      const adminSecretStatus=typeof env.ADMIN_TOKEN!=='string'||env.ADMIN_TOKEN.length===0?'missing':env.ADMIN_TOKEN.length<32?'too_short':'configured';
      return respond({service:'zikap-orders-api',version:'runtime-checks-2',ready,checks,adminSecretStatus,orders:ready,websiteAudit:ready&&typeof HTMLRewriter==='function',orderHistory:ready&&await historyReady(env),customerAccounts:ready&&await accountsReady(env),automaticUrlAudit:ready&&typeof HTMLRewriter==='function',websiteAuditScope:'up to 3 public source-HTML pages',payments:ready&&await paymentsReady(env)},ready?200:503);
    }
    if(!env.DB||!env.ADMIN_TOKEN||env.ADMIN_TOKEN.length<32)throw new ApiError('Order service is not configured.',503);
    if(path==='/website-audit')return respond(await auditRoute(req,env,{ApiError,hash,jsonBody,rate}));
    if(path==='/stripe/webhook'&&req.method==='POST')return respond(await stripeWebhook(req,env,ApiError));
    if(path.startsWith('/account-api/')){
      const result=await accountRoute(req,env,{ApiError,hash,text,jsonBody,rate,validateOrder,receipt});
      return respond(result.body,result.status,result.headers);
    }
    if(path==='/orders'&&req.method==='POST'){
      await rate(req,env,'create',5);
      const raw=await jsonBody(req);if(raw.consent!==true)throw new ApiError('Consent is required to store the project request.');
      if(raw.company)throw new ApiError('Unable to accept this request.');
      let o;try{o=validateOrder(raw);}catch(e){if(e instanceof ApiError)throw e;throw new ApiError('Check the website URL and required fields.');}
      const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
      const clientKey=raw.requestId!==undefined||raw.receiptKey!==undefined;
      if(clientKey&&(!uuid.test(raw.requestId)||typeof raw.receiptKey!=='string'||raw.receiptKey.length!==72||!uuid.test(raw.receiptKey.slice(0,36))||!uuid.test(raw.receiptKey.slice(36))))throw new ApiError('Invalid request receipt. Please reload and try again.');
      const id=clientKey?raw.requestId:crypto.randomUUID(),token=clientKey?raw.receiptKey:crypto.randomUUID()+crypto.randomUUID(),now=new Date().toISOString();
      const tokenHash=await hash(token);
      const result=await env.DB.prepare('INSERT INTO orders (id,token_hash,created_at,updated_at,package_id,price_usd,name,email,website,pages,topic,language,market,goals) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(id,tokenHash,now,now,o.packageId,o.price,o.name,o.email,o.website,o.pages,o.topic,o.language,o.market,o.goals).run();
      if(!result.meta.changes){
        const existing=await env.DB.prepare('SELECT * FROM orders WHERE id=?').bind(id).first();
        const fields={package_id:o.packageId,name:o.name,email:o.email,website:o.website,pages:o.pages,topic:o.topic,language:o.language,market:o.market,goals:o.goals};
        if(!existing||existing.token_hash!==tokenHash||Object.entries(fields).some(([k,v])=>existing[k]!==v))throw new ApiError('This request receipt is already in use. Keep your existing receipt and check its status.',409);
        return respond({id,token,status:existing.status,price:existing.price_usd,paymentCollected:false,replayed:true});
      }
      return respond({id,token,status:'requested',price:o.price,paymentCollected:false},201);
    }
    const match=path.match(/^\/orders\/([a-f0-9-]{36})(\/revision)?$/);
    if(match){
      await rate(req,env,'lookup',120);
      const row=await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(match[1]).first();
      const token=req.headers.get('authorization')?.replace(/^Bearer /,'')||'';
      if(!row||await hash(token)!==row.token_hash)throw new ApiError('Order not found or receipt key incorrect.',404);
      if(req.method==='GET'&&!match[2]){const payments=await paymentSummaries(env,[row.id]),payment=payments.get(row.id);return respond({...receipt(row),payment,paymentCollected:!payment?.testMode&&(payment?.status==='paid'||payment?.status==='partially_refunded')});}
      if(req.method==='POST'&&match[2]){
        const data=await jsonBody(req),note=text(data.note,2000);
        const result=await env.DB.prepare("UPDATE orders SET revision_used=1,revision_note=?,status='revision_requested',updated_at=? WHERE id=? AND status='delivered' AND revision_used=0").bind(note,new Date().toISOString(),row.id).run();
        if(!result.meta.changes)throw new ApiError('One revision may be requested after delivery.',409);
        return respond({status:'revision_requested'});
      }
    }
    if(path.startsWith('/admin/')){
      await rate(req,env,'admin',240);await admin(req,env);
      if(path==='/admin/orders'&&req.method==='GET'){
        const cursor=new URL(req.url).searchParams.get('before');
        let result;
        if(cursor){
          const parts=cursor.split('|');if(parts.length!==2||!/^\d{4}-\d{2}-\d{2}T[0-9:.]+Z$/.test(parts[0])||!/^[a-f0-9-]{36}$/.test(parts[1]))throw new ApiError('Invalid pagination cursor.');
          result=await env.DB.prepare('SELECT * FROM orders WHERE created_at < ? OR (created_at = ? AND id < ?) ORDER BY created_at DESC, id DESC LIMIT 50').bind(parts[0],parts[0],parts[1]).all();
        }else result=await env.DB.prepare('SELECT * FROM orders ORDER BY created_at DESC, id DESC LIMIT 50').all();
        const last=result.results.at(-1);
        const payments=await paymentSummaries(env,result.results.map(row=>row.id)),unread=await unreadCounts(env,result.results.map(row=>row.id),'owner');
        return respond({orders:result.results.map(({token_hash,...row})=>({...row,payment:payments.get(row.id),unreadMessages:unread.get(row.id)})),next:result.results.length===50?last.created_at+'|'+last.id:null});
      }
      const threadMatch=path.match(/^\/admin\/orders\/([a-f0-9-]{36})\/messages(\/read)?$/),threadId=threadMatch?.[1];
      if(threadId){
        const row=await env.DB.prepare('SELECT id FROM orders WHERE id=?').bind(threadId).first();if(!row)throw new ApiError('Order not found.',404);
        const result=await projectMessages(req,env,row.id,'owner',{ApiError,jsonBody,rate},!!threadMatch[2]);return respond(result.body,result.status,result.headers);
      }
      const historyMatch=path.match(/^\/admin\/orders\/([a-f0-9-]{36})\/history(?:\/([^/]+))?$/);
      if(historyMatch)return respond(await projectHistory(req,env,historyMatch[1],historyMatch[2],ApiError));
      const id=path.match(/^\/admin\/orders\/([a-f0-9-]{36})$/)?.[1];
      if(id&&req.method==='GET'){
        const row=await env.DB.prepare('SELECT * FROM orders WHERE id=?').bind(id).first();if(!row)throw new ApiError('Order not found.',404);
        const {token_hash,...safe}=row,payment=(await paymentSummaries(env,[id])).get(id),unreadMessages=(await unreadCounts(env,[id],'owner')).get(id);return respond({order:{...safe,payment,unreadMessages,editVersion:await editVersion(env,id)}});
      }
      if(id&&req.method==='PATCH'){
        const data=await jsonBody(req,110000),status=text(data.status,30),report=text(data.report,90000,false),note=text(data.note,2000,false);
        if(!states.includes(status))throw new ApiError('Invalid order status.');
        if(status==='delivered'&&!report)throw new ApiError('Add a report before marking delivered.');
        const expected=data.expectedVersion;let changed=false;
        if(expected!==undefined){if(!Number.isSafeInteger(expected)||expected<0||expected>2147483647)throw new ApiError('Invalid saved order version.');if(!await historyReady(env))throw new ApiError('Version protection is unavailable. Refresh after the service is updated.',503);const baseline=await env.DB.prepare('SELECT status,report,owner_note,COALESCE((SELECT version FROM order_edit_versions WHERE order_id=orders.id),0) editVersion FROM orders WHERE id=?').bind(id).first();if(!baseline)throw new ApiError('Order not found.',404);if(baseline.editVersion!==expected)throw new ApiError('This order changed in another page or by a customer revision. Your draft is still on this page. Download it before reopening the order to review the latest saved version.',409);changed=baseline.status!==status||baseline.report!==report||baseline.owner_note!==note;}
        await protectOwnerChange(env,id,status,ApiError);
        const savedAt=new Date().toISOString(),statement=expected===undefined?env.DB.prepare('UPDATE orders SET status=?,report=?,owner_note=?,updated_at=? WHERE id=?').bind(status,report,note,savedAt,id):env.DB.prepare('UPDATE orders SET status=?,report=?,owner_note=?,updated_at=? WHERE id=? AND COALESCE((SELECT version FROM order_edit_versions WHERE order_id=orders.id),0)=?').bind(status,report,note,savedAt,id,expected);
        const result=await statement.run();
        if(!result.meta.changes){const exists=await env.DB.prepare('SELECT id FROM orders WHERE id=?').bind(id).first();if(!exists)throw new ApiError('Order not found.',404);throw new ApiError('This order changed before your update was saved. Download your draft and reopen the order to review the latest version.',409);}
        // Acknowledge only this write. A later GET could already reflect another writer.
        return respond({updated:true,orderUpdate:{status,report,note,updatedAt:savedAt,editVersion:expected===undefined?null:expected+(changed?1:0)}});

      }
      if(id&&req.method==='DELETE'){
        await protectOwnerChange(env,id,'delete',ApiError);
        const result=await env.DB.prepare('DELETE FROM orders WHERE id=?').bind(id).run();
        if(!result.meta.changes)throw new ApiError('Order not found.',404);
        return respond({deleted:true});
      }
    }
    throw new ApiError('Route not found.',404);
  }catch(e){return respond({error:e instanceof ApiError?e.message:'The service could not complete this request. Please try again.'},e instanceof ApiError?e.status:500);}
}};
