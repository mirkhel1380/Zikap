const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
export async function messagesReady(env){if(!env.DB)return false;try{await env.DB.prepare('SELECT id,order_id,sender_role,body,created_at FROM project_messages LIMIT 1').first();return true;}catch{return false;}}
export async function messageReadsReady(env){if(!await messagesReady(env))return false;try{await env.DB.prepare('SELECT message_id,reader_role,read_at FROM project_message_reads LIMIT 1').first();return true;}catch{return false;}}
export async function unreadCounts(env,ids,role){
 const counts=new Map(ids.map(id=>[id,null]));if(!ids.length||!await messageReadsReady(env))return counts;
 for(const id of ids)counts.set(id,0);const {results}=await env.DB.prepare('SELECT m.order_id,COUNT(*) AS n FROM project_messages m LEFT JOIN project_message_reads r ON r.message_id=m.id AND r.reader_role=? WHERE m.order_id IN ('+ids.map(()=>'?').join(',')+') AND m.sender_role<>? AND r.message_id IS NULL GROUP BY m.order_id').bind(role,...ids,role).all();for(const row of results)counts.set(row.order_id,row.n);return counts;
}
const publicMessage=row=>({id:row.id,role:row.sender_role,body:row.body,createdAt:row.created_at,unread:row.unread===undefined?null:!!row.unread});
// Callers must establish customer order ownership or owner bearer authentication first.
export async function projectMessages(req,env,orderId,role,h,markRead=false){
 const {ApiError,jsonBody,rate}=h,result=(body,status=200)=>({body,status,headers:{}});
 if(!['customer','owner'].includes(role))throw new ApiError('Message access is unavailable.',403);
 if(!await messagesReady(env))throw new ApiError('Project messages are being prepared. Please return shortly.',503);
 const readTracking=await messageReadsReady(env);
 if(markRead){
  if(req.method!=='POST')throw new ApiError('Message route not found.',404);
  if(!readTracking)throw new ApiError('Message read tracking is being prepared.',503);
  await rate(req,env,'project-message-read-'+role,120);const data=await jsonBody(req,5000),ids=data.messageIds;
  if(!Array.isArray(ids)||!ids.length||ids.length>50||new Set(ids).size!==ids.length||ids.some(id=>typeof id!=='string'||!uuid.test(id)))throw new ApiError('Choose up to 50 valid loaded messages.');
  const placeholders=ids.map(()=>'?').join(','),found=await env.DB.prepare('SELECT COUNT(*) AS n FROM project_messages WHERE order_id=? AND sender_role<>? AND id IN ('+placeholders+')').bind(orderId,role,...ids).first();
  if(found.n!==ids.length)throw new ApiError('Refresh the conversation before marking loaded messages read.');
  await env.DB.prepare('INSERT INTO project_message_reads (message_id,reader_role,read_at) SELECT id,?,? FROM project_messages WHERE order_id=? AND sender_role<>? AND id IN ('+placeholders+') ON CONFLICT(message_id,reader_role) DO NOTHING').bind(role,new Date().toISOString(),orderId,role,...ids).run();
  return result({read:true,unreadCount:(await unreadCounts(env,[orderId],role)).get(orderId)});
 }
 const linked=!!await env.DB.prepare('SELECT order_id FROM customer_order_links WHERE order_id=?').bind(orderId).first();
 if(req.method==='GET'){
  const before=new URL(req.url).searchParams.get('before');let statement;
  const sql=readTracking?'SELECT m.*,(m.sender_role<>? AND NOT EXISTS (SELECT 1 FROM project_message_reads r WHERE r.message_id=m.id AND r.reader_role=?)) AS unread FROM project_messages m WHERE order_id=?':'SELECT * FROM project_messages WHERE order_id=?',prefix=readTracking?[role,role,orderId]:[orderId];
  if(before){const [date,id,...rest]=before.split('|');if(rest.length||!/^\d{4}-\d{2}-\d{2}T[0-9:.]+Z$/.test(date)||!uuid.test(id||''))throw new ApiError('Invalid message cursor.');statement=env.DB.prepare(sql+' AND (created_at<? OR (created_at=? AND id<?)) ORDER BY created_at DESC,id DESC LIMIT 50').bind(...prefix,date,date,id);}
  else statement=env.DB.prepare(sql+' ORDER BY created_at DESC,id DESC LIMIT 50').bind(...prefix);
  const {results}=await statement.all(),last=results.at(-1);return result({messages:results.slice().reverse().map(publicMessage),next:results.length===50?last.created_at+'|'+last.id:null,linked,limit:200,readTracking,unreadCount:(await unreadCounts(env,[orderId],role)).get(orderId)});
 }
 if(req.method!=='POST')throw new ApiError('Message route not found.',404);
 if(!linked)throw new ApiError('The customer needs to link this project to an account before project messaging is available.',409);
 await rate(req,env,'project-message-'+role,role==='owner'?60:20);const data=await jsonBody(req,26000);
 if(!uuid.test(data.requestId||'')||typeof data.body!=='string'||!data.body.trim()||data.body.length>4000)throw new ApiError('Write a message between 1 and 4,000 characters and use a valid message reference.');
 const body=data.body.trim(),now=new Date().toISOString();
 await env.DB.prepare('INSERT INTO project_messages (id,order_id,sender_role,body,created_at) SELECT ?,?,?,?,? WHERE (SELECT COUNT(*) FROM project_messages WHERE order_id=?)<200 ON CONFLICT(id) DO NOTHING').bind(data.requestId,orderId,role,body,now,orderId).run();
 const row=await env.DB.prepare('SELECT * FROM project_messages WHERE id=? AND order_id=? AND sender_role=?').bind(data.requestId,orderId,role).first();
 if(!row){const count=await env.DB.prepare('SELECT COUNT(*) AS n FROM project_messages WHERE order_id=?').bind(orderId).first();throw new ApiError(count.n>=200?'This project has reached its limit of 200 saved messages.':'This message reference is already in use. Refresh the conversation.',409);}
 if(row.body!==body)throw new ApiError('This message reference already contains different text. Refresh the conversation before trying again.',409);
 return result({message:publicMessage(row)},201);
}
