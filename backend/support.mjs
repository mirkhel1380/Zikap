const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const topics=['account','project','payment','refund','privacy','general'];
const message=row=>({id:row.id,role:row.sender_role,body:row.body,createdAt:row.created_at,unread:row.unread===undefined?null:!!row.unread});
const thread=row=>({id:row.id,topic:row.topic,subject:row.subject,status:row.status,version:row.version,createdAt:row.created_at,updatedAt:row.updated_at,unreadCount:row.unreadCount??0,...(row.customerName!==undefined?{customer:{name:row.customerName,email:row.customerEmail}}:{})});
function cursor(value,ErrorType){if(!value)return null;const[date,id,...rest]=value.split('|');if(value.length>100||rest.length||!/^\d{4}-\d{2}-\d{2}T[0-9:.]+Z$/.test(date||'')||!uuid.test(id||''))throw new ErrorType('Invalid support cursor.');return[date,id];}
export async function supportReady(env){try{for(const table of ['support_threads','support_messages','support_message_reads'])await env.DB.prepare('SELECT * FROM '+table+' LIMIT 1').first();return true;}catch{return false;}}
// Call only after the caller validates the role-specific session and request origin.
export async function supportRoute(req,env,actor,role,{ApiError,jsonBody,rate}){
 if(!['customer','owner'].includes(role))throw new ApiError('Support access is unavailable.',403);
 const url=new URL(req.url),prefix=role==='owner'?'/admin-api/support':'/account-api/support',path=url.pathname;
 if(path!==prefix&&!path.startsWith(prefix+'/'))return null;
 if(!await supportReady(env))throw new ApiError('Help & support is being prepared. Please return shortly.',503);
 const identity=role+':'+actor.id;await rate(req,env,'support-read:'+identity,180);
 const own=role==='owner'?'':' AND t.user_id=?',ownBind=role==='owner'?[]:[actor.id];
 const unreadSQL="(SELECT COUNT(*) FROM support_messages m WHERE m.thread_id=t.id AND m.sender_role<>? AND NOT EXISTS(SELECT 1 FROM support_message_reads r WHERE r.message_id=m.id AND r.reader_role=?))";
 if(path===prefix){
  if(req.method==='GET'){
   const state=url.searchParams.get('status')||'all',topic=url.searchParams.get('topic')||'all',before=cursor(url.searchParams.get('before'),ApiError);
   if(!['all','open','waiting','resolved','unread'].includes(state)||!['all',...topics].includes(topic))throw new ApiError('Choose a valid support filter.');
   let where=' WHERE 1=1'+own,bind=[role,role,...ownBind];if(state==='unread'){where+=' AND '+unreadSQL+'>0';bind.push(role,role);}else if(state!=='all'){where+=' AND t.status=?';bind.push(state);}if(topic!=='all'){where+=' AND t.topic=?';bind.push(topic);}if(before){where+=' AND (t.created_at<? OR (t.created_at=? AND t.id<?))';bind.push(before[0],before[0],before[1]);}
   const rows=await env.DB.prepare('SELECT t.*,'+unreadSQL+' AS unreadCount'+(role==='owner'?',u.name customerName,u.email customerEmail':'')+' FROM support_threads t'+(role==='owner'?' JOIN customer_users u ON u.id=t.user_id':'')+where+' ORDER BY t.created_at DESC,t.id DESC LIMIT 26').bind(...bind).all(),visible=rows.results.slice(0,25),last=visible.at(-1);
   const totals=await env.DB.prepare("SELECT COUNT(*) total,COALESCE(SUM(t.status='open'),0) open,COALESCE(SUM(t.status='waiting'),0) waiting,COALESCE(SUM(t.status='resolved'),0) resolved FROM support_threads t WHERE 1=1"+own).bind(...ownBind).first();const unreadTotal=await env.DB.prepare("SELECT COUNT(*) n FROM support_messages m JOIN support_threads t ON t.id=m.thread_id WHERE m.sender_role<>? AND NOT EXISTS(SELECT 1 FROM support_message_reads r WHERE r.message_id=m.id AND r.reader_role=?)"+own).bind(role,role,...ownBind).first();return{threads:visible.map(thread),next:rows.results.length>25?last.created_at+'|'+last.id:null,totals:{...totals,unread:unreadTotal.n},checkedAt:new Date().toISOString()};
  }
  if(req.method!=='POST'||role!=='customer')throw new ApiError('Method not allowed.',405);
  await rate(req,env,'support-create:'+actor.id,5);const data=await jsonBody(req,24000);
  if((typeof data.requestId!=='string'||!uuid.test(data.requestId))||!topics.includes(data.topic)||typeof data.subject!=='string'||!data.subject.trim()||data.subject.trim().length>120||/[\r\n]/.test(data.subject)||typeof data.body!=='string'||!data.body.trim()||data.body.length>4000)throw new ApiError('Choose a topic, write a subject up to 120 characters and a message up to 4,000 characters.');
  const subject=data.subject.trim(),body=data.body.trim(),now=new Date().toISOString();
  await env.DB.batch([env.DB.prepare("INSERT INTO support_threads(id,user_id,topic,subject,created_at,updated_at) SELECT ?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM support_threads WHERE user_id=? AND status<>'resolved')<20 AND NOT EXISTS(SELECT 1 FROM support_messages WHERE id=?) ON CONFLICT(id) DO NOTHING").bind(data.requestId,actor.id,data.topic,subject,now,now,actor.id,data.requestId),env.DB.prepare("INSERT INTO support_messages(id,thread_id,sender_role,body,created_at) SELECT id,id,'customer',?,? FROM support_threads WHERE id=? AND user_id=? AND subject=? AND topic=? ON CONFLICT(id) DO NOTHING").bind(body,now,data.requestId,actor.id,subject,data.topic)]);
  const saved=await env.DB.prepare('SELECT t.*,m.body initialBody FROM support_threads t JOIN support_messages m ON m.id=t.id AND m.thread_id=t.id AND m.sender_role=? WHERE t.id=? AND t.user_id=?').bind('customer',data.requestId,actor.id).first();
  if(!saved||saved.subject!==subject||saved.topic!==data.topic||saved.initialBody!==body)throw new ApiError('This request reference is in use or you have reached 20 open requests. Refresh your support list before trying again.',409);
  return{thread:thread(saved)};
 }
 const match=path.slice(prefix.length).match(/^\/([a-f0-9-]{36})(?:\/(messages)(\/read)?)?$/);if(!match||!uuid.test(match[1]))throw new ApiError('Support route not found.',404);
 const row=await env.DB.prepare('SELECT t.*'+(role==='owner'?',u.name customerName,u.email customerEmail':'')+' FROM support_threads t'+(role==='owner'?' JOIN customer_users u ON u.id=t.user_id':'')+' WHERE t.id=?'+own).bind(match[1],...ownBind).first();if(!row)throw new ApiError('Support request not found.',404);
 if(!match[2]){
  if(req.method==='GET')return{thread:thread(row)};
  if(req.method!=='PATCH'||role!=='owner')throw new ApiError('Method not allowed.',405);
  const data=await jsonBody(req,1000);if(!['open','waiting','resolved'].includes(data.status)||!Number.isSafeInteger(data.expectedVersion)||data.expectedVersion<1||data.expectedVersion>=2147483647)throw new ApiError('Choose a valid status and saved request version.');
  const updatedAt=new Date().toISOString(),saved=await env.DB.prepare('UPDATE support_threads SET status=?,version=version+1,updated_at=? WHERE id=? AND version=?').bind(data.status,updatedAt,row.id,data.expectedVersion).run();if(!saved.meta.changes)throw new ApiError('This request changed after you opened it. Your status choice is still on this page. Load the latest request before updating it.',409);
  return{thread:{...thread(row),status:data.status,version:data.expectedVersion+1,updatedAt}};
 }
 const unread=async()=> (await env.DB.prepare('SELECT '+unreadSQL+' AS n FROM support_threads t WHERE t.id=?').bind(role,role,row.id).first()).n;
 if(match[3]){
  if(req.method!=='POST')throw new ApiError('Method not allowed.',405);const data=await jsonBody(req,5000),ids=data.messageIds;
  if(!Array.isArray(ids)||!ids.length||ids.length>50||new Set(ids).size!==ids.length||ids.some(id=>typeof id!=='string'||!uuid.test(id)))throw new ApiError('Choose up to 50 valid loaded messages.');
  const placeholders=ids.map(()=>'?').join(','),found=await env.DB.prepare('SELECT COUNT(*) n FROM support_messages WHERE thread_id=? AND sender_role<>? AND id IN ('+placeholders+')').bind(row.id,role,...ids).first();if(found.n!==ids.length)throw new ApiError('Refresh the support conversation before marking messages read.');
  await env.DB.prepare('INSERT INTO support_message_reads(message_id,reader_role,read_at) SELECT id,?,? FROM support_messages WHERE thread_id=? AND sender_role<>? AND id IN ('+placeholders+') ON CONFLICT(message_id,reader_role) DO NOTHING').bind(role,new Date().toISOString(),row.id,role,...ids).run();return{read:true,unreadCount:await unread()};
 }
 if(req.method==='GET'){
  const before=cursor(url.searchParams.get('before'),ApiError),bind=[role,role,row.id];let where=' WHERE m.thread_id=?';if(before){where+=' AND (m.created_at<? OR (m.created_at=? AND m.id<?))';bind.push(before[0],before[0],before[1]);}
  const rows=await env.DB.prepare('SELECT m.*,(m.sender_role<>? AND NOT EXISTS(SELECT 1 FROM support_message_reads r WHERE r.message_id=m.id AND r.reader_role=?)) AS unread FROM support_messages m'+where+' ORDER BY m.created_at DESC,m.id DESC LIMIT 51').bind(...bind).all(),visible=rows.results.slice(0,50),last=visible.at(-1);return{messages:visible.reverse().map(message),next:rows.results.length>50?last.created_at+'|'+last.id:null,linked:true,limit:200,readTracking:true,unreadCount:await unread()};
 }
 if(req.method!=='POST')throw new ApiError('Method not allowed.',405);
 await rate(req,env,'support-message:'+identity,role==='owner'?100:20);const data=await jsonBody(req,24000);if((typeof data.requestId!=='string'||!uuid.test(data.requestId))||typeof data.body!=='string'||!data.body.trim()||data.body.length>4000)throw new ApiError('Write a message between 1 and 4,000 characters and use a valid reference.');
 const body=data.body.trim(),now=new Date().toISOString();await env.DB.prepare("INSERT INTO support_messages(id,thread_id,sender_role,body,created_at) SELECT ?,?,?,?,? FROM support_threads t WHERE t.id=? AND (SELECT COUNT(*) FROM support_messages WHERE thread_id=t.id)<200 AND (?='owner' OR t.status<>'resolved' OR (SELECT COUNT(*) FROM support_threads WHERE user_id=t.user_id AND status<>'resolved')<20) ON CONFLICT(id) DO NOTHING").bind(data.requestId,row.id,role,body,now,row.id,role).run();
 const saved=await env.DB.prepare('SELECT * FROM support_messages WHERE id=? AND thread_id=? AND sender_role=?').bind(data.requestId,row.id,role).first();if(!saved||saved.body!==body)throw new ApiError('This message reference is in use, or a support limit was reached (200 messages per request; 20 open requests). Refresh before retrying.',409);
 return{message:message(saved)};
}
