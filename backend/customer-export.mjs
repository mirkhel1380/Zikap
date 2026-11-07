import {orderSnapshot,titles} from './catalog.mjs';
import {paymentSummaries} from './payments.mjs';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
function cursorOf(value,type,ErrorType){if(value===undefined||value===null||value==='')return null;if(typeof value!=='string'||value.length>100)throw new ErrorType('Invalid export cursor.');const [date,id,...extra]=value.split('|');if(extra.length||!uuid.test(id||'')||(type==='iso'?!/^\d{4}-\d{2}-\d{2}T[0-9:.]+Z$/.test(date||''):!/^\d{1,12}$/.test(date||'')))throw new ErrorType('Invalid export cursor.');return [type==='iso'?date:Number(date),id];}
export async function customerExport(req,env,user,h,verifyPassword){
 const path=new URL(req.url).pathname;if(!path.startsWith('/account-api/data-export'))return null;
 const {ApiError,rate,jsonBody,hash}=h,now=Math.floor(Date.now()/1000);
 if(!['/account-api/data-export/start','/account-api/data-export/part','/account-api/data-export/finish'].includes(path))throw new ApiError('Export route not found.',404);
 if(req.method!=='POST')throw new ApiError('Method not allowed.',405);
 try{await env.DB.prepare('SELECT token_hash FROM customer_export_grants LIMIT 1').first();}catch{throw new ApiError('Account downloads are being prepared. Try again after deployment.',503);}
 const data=await jsonBody(req,path.endsWith('/start')?3000:1000);
 if(path.endsWith('/start')){
  await rate(req,env,'data-export-password:'+user.id,5);await verifyPassword(data.currentPassword);
  const grant=crypto.getRandomValues(new Uint8Array(32)),token=[...grant].map(n=>n.toString(16).padStart(2,'0')).join(''),expiresAt=now+600;
  await env.DB.batch([env.DB.prepare('DELETE FROM customer_export_grants WHERE expires_at<=?').bind(now),env.DB.prepare('INSERT INTO customer_export_grants(token_hash,user_id,session_hash,created_at,expires_at) VALUES(?,?,?,?,?)').bind(await hash(token),user.id,user.token_hash,now,expiresAt)]);
  const account=await env.DB.prepare('SELECT name,email,created_at createdAt FROM customer_users WHERE id=?').bind(user.id).first();
  return {grant:token,expiresAt:new Date(expiresAt*1000).toISOString(),account,generatedAt:new Date().toISOString(),format:'zikap-account-export-1'};
 }
 await rate(req,env,'data-export-read:'+user.id,1500);
 const token=req.headers.get('X-Zikap-Export')||'';if(!/^[a-f0-9]{64}$/.test(token))throw new ApiError('Confirm your password to start a new account download.',403);
 const grant=await env.DB.prepare('SELECT token_hash,created_at FROM customer_export_grants WHERE token_hash=? AND user_id=? AND session_hash=? AND expires_at>?').bind(await hash(token),user.id,user.token_hash,now).first();
 if(!grant)throw new ApiError('This download authorization expired or belongs to another session. Start again.',403);
 if(path.endsWith('/finish')){await env.DB.prepare('DELETE FROM customer_export_grants WHERE token_hash=?').bind(grant.token_hash).run();return {finished:true};}
 const cutoff=new Date((grant.created_at+1)*1000).toISOString();
 if(data.section==='projects'){
  const cursor=cursorOf(data.cursor,'iso',ApiError),bind=[user.id,cutoff];let where=' WHERE l.user_id=? AND o.created_at<?';if(cursor){where+=' AND (o.created_at<? OR (o.created_at=? AND o.id<?))';bind.push(cursor[0],cursor[0],cursor[1]);}
  const {results}=await env.DB.prepare('SELECT o.* FROM orders o JOIN customer_order_links l ON l.order_id=o.id'+where+' ORDER BY o.created_at DESC,o.id DESC LIMIT 2').bind(...bind).all();const row=results[0];if(!row)return {section:'projects',project:null,next:null};
  const saved=await orderSnapshot(env,row),payment=(await paymentSummaries(env,[row.id])).get(row.id);
  const [messages,actions]=await Promise.all([env.DB.prepare('SELECT id,sender_role role,body,created_at createdAt FROM project_messages WHERE order_id=? ORDER BY created_at,id').bind(row.id).all(),env.DB.prepare('SELECT id,title,page_url pageUrl,notes,priority,status,created_at createdAt,updated_at updatedAt FROM project_actions WHERE order_id=? ORDER BY created_at,id').bind(row.id).all()]);
  const project={id:row.id,createdAt:row.created_at,updatedAt:row.updated_at,status:row.status,package:{id:row.package_id,title:saved.package_title||titles[row.package_id],summary:saved.package_description,priceUSD:row.price_usd,billing:'one-time'},brief:{website:row.website,pages:JSON.parse(row.pages),topic:row.topic,language:row.language,market:row.market,goals:row.goals},customerUpdate:row.owner_note,report:row.report,revision:{used:!!row.revision_used,note:row.revision_note},payment,messages:messages.results,actionPlan:actions.results};
  return {section:'projects',project,next:results.length>1?row.created_at+'|'+row.id:null};
 }
 if(data.section==='checks'){
  const cursor=cursorOf(data.cursor,'number',ApiError),bind=[user.id,now,grant.created_at];let where=' WHERE user_id=? AND expires_at>? AND created_at<=?';if(cursor){where+=' AND (created_at<? OR (created_at=? AND id<?))';bind.push(cursor[0],cursor[0],cursor[1]);}
  const {results}=await env.DB.prepare('SELECT id,created_at,expires_at,audit_json,ai_state,ai_json FROM ai_checks'+where+' ORDER BY created_at DESC,id DESC LIMIT 2').bind(...bind).all(),row=results[0];
  return {section:'checks',check:row?{id:row.id,createdAt:new Date(row.created_at*1000).toISOString(),expiresAt:new Date(row.expires_at*1000).toISOString(),audit:JSON.parse(row.audit_json),aiState:row.ai_state,suggestions:row.ai_json?JSON.parse(row.ai_json):null}:null,next:row&&results.length>1?row.created_at+'|'+row.id:null};
 }
 throw new ApiError('Choose a valid export section.');
}
