// Orders and delivery API. No payment processor, mail delivery, or live crawling.
const prices = {audit:29,keywords:19,onpage:39,bundle:79};
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
  const origin=req.headers.get('origin'),allowed=env.ALLOWED_ORIGIN;
  const headers={'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Vary':'Origin'};
  if(origin===allowed){headers['Access-Control-Allow-Origin']=origin;headers['Access-Control-Allow-Methods']='GET,POST,PATCH,OPTIONS,DELETE';headers['Access-Control-Allow-Headers']='Content-Type,Authorization';}
  const respond=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if(origin&&origin!==allowed)return respond({error:'Origin not allowed.'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  try{
    const path=new URL(req.url).pathname;
    if(path==='/health'&&req.method==='GET'){
      if(!env.DB||!env.ADMIN_TOKEN||env.ADMIN_TOKEN.length<32)return respond({ready:false},503);
      await env.DB.prepare('SELECT id FROM orders LIMIT 1').first();
      return respond({ready:true,orders:true,automaticUrlAudit:false,payments:false});
    }
    if(!env.DB||!env.ADMIN_TOKEN||env.ADMIN_TOKEN.length<32)throw new ApiError('Order service is not configured.',503);
    if(path==='/orders'&&req.method==='POST'){
      await rate(req,env,'create',5);
      const raw=await jsonBody(req);if(raw.consent!==true)throw new ApiError('Consent is required to store the project request.');
      if(raw.company)throw new ApiError('Unable to accept this request.');
      let o;try{o=validateOrder(raw);}catch(e){if(e instanceof ApiError)throw e;throw new ApiError('Check the website URL and required fields.');}
      const id=crypto.randomUUID(),token=crypto.randomUUID()+crypto.randomUUID(),now=new Date().toISOString();
      await env.DB.prepare('INSERT INTO orders (id,token_hash,created_at,updated_at,package_id,price_usd,name,email,website,pages,topic,language,market,goals) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,await hash(token),now,now,o.packageId,o.price,o.name,o.email,o.website,o.pages,o.topic,o.language,o.market,o.goals).run();
      return respond({id,token,status:'requested',price:o.price,paymentCollected:false},201);
    }
    const match=path.match(/^\/orders\/([a-f0-9-]{36})(\/revision)?$/);
    if(match){
      await rate(req,env,'lookup',120);
      const row=await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(match[1]).first();
      const token=req.headers.get('authorization')?.replace(/^Bearer /,'')||'';
      if(!row||await hash(token)!==row.token_hash)throw new ApiError('Order not found or receipt key incorrect.',404);
      if(req.method==='GET'&&!match[2])return respond(receipt(row));
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
        const cursor=new URL(req.url).searchParams.get('before')||'9999';
        const result=await env.DB.prepare('SELECT * FROM orders WHERE created_at < ? ORDER BY created_at DESC LIMIT 50').bind(cursor).all();
        return respond({orders:result.results.map(({token_hash,...row})=>row),next:result.results.length===50?result.results.at(-1).created_at:null});
      }
      const id=path.match(/^\/admin\/orders\/([a-f0-9-]{36})$/)?.[1];
      if(id&&req.method==='PATCH'){
        const data=await jsonBody(req,110000),status=text(data.status,30),report=text(data.report,90000,false),note=text(data.note,2000,false);
        if(!states.includes(status))throw new ApiError('Invalid order status.');
        if(status==='delivered'&&!report)throw new ApiError('Add a report before marking delivered.');
        const result=await env.DB.prepare('UPDATE orders SET status=?,report=?,owner_note=?,updated_at=? WHERE id=?').bind(status,report,note,new Date().toISOString(),id).run();
        if(!result.meta.changes)throw new ApiError('Order not found.',404);
        return respond({updated:true});
      }
      if(id&&req.method==='DELETE'){
        const result=await env.DB.prepare('DELETE FROM orders WHERE id=?').bind(id).run();
        if(!result.meta.changes)throw new ApiError('Order not found.',404);
        return respond({deleted:true});
      }
    }
    throw new ApiError('Route not found.',404);
  }catch(e){return respond({error:e instanceof ApiError?e.message:'The service could not complete this request. Please try again.'},e instanceof ApiError?e.status:500);}
}};
