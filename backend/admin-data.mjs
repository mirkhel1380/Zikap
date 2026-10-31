import {prices,titles} from './catalog.mjs';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
function pagination(url,ErrorType,dateType='iso'){const raw=url.searchParams.get('before');if(!raw)return null;const [date,id,...extra]=raw.split('|');if(extra.length||!uuid.test(id||'')||(dateType==='iso'?!/^\d{4}-\d{2}-\d{2}T[0-9:.]+Z$/.test(date||''):!/^\d{1,12}$/.test(date||'')))throw new ErrorType('Invalid list cursor.');return[dateType==='iso'?date:Number(date),id];}
export async function adminData(req,env,ErrorType){const url=new URL(req.url),path=url.pathname;if(req.method!=='GET')return null;
 if(path==='/admin-api/dashboard'){
  const order=await env.DB.prepare("SELECT COUNT(*) total,COALESCE(SUM(status='requested'),0) requested,COALESCE(SUM(status IN ('accepted','in_progress')),0) active,COALESCE(SUM(status='revision_requested'),0) revisions,COALESCE(SUM(status='delivered'),0) delivered,COALESCE(SUM(status='declined'),0) declined,COALESCE(SUM(LENGTH(TRIM(report))>0),0) reports FROM orders").first();
  const customers=await env.DB.prepare('SELECT COUNT(*) total FROM customer_users').first();
  const unread=await env.DB.prepare("SELECT COUNT(*) total,COUNT(DISTINCT m.order_id) projects FROM project_messages m JOIN customer_order_links l ON l.order_id=m.order_id LEFT JOIN project_message_reads r ON r.message_id=m.id AND r.reader_role='owner' WHERE m.sender_role='customer' AND r.message_id IS NULL").first();
  const groups=await env.DB.prepare('SELECT package_id,COUNT(*) total FROM orders GROUP BY package_id').all();
  let payments=null;try{payments=await env.DB.prepare("SELECT COALESCE(SUM(CASE WHEN test_mode=0 AND currency='usd' AND state='paid' THEN amount_cents ELSE 0 END),0) grossCents,COALESCE(SUM(CASE WHEN test_mode=0 AND currency='usd' AND state='paid' THEN refunded_cents ELSE 0 END),0) refundedCents,COALESCE(SUM(test_mode=1),0) testRecords,COALESCE(SUM(test_mode=0 AND state IN ('pending','creating')),0) pending FROM order_payments").first();payments.netCents=payments.grossCents-payments.refundedCents;}catch{}
  return {orders:order,customers:customers.total,unread:unread.total,unreadProjects:unread.projects,payments,packages:groups.results,catalog:Object.entries(prices).map(([id,price])=>({id,title:titles[id],price})),asOf:new Date().toISOString()};
 }
 if(path==='/admin-api/customers'){
  const q=(url.searchParams.get('q')||'').trim();if(q.length>150)throw new ErrorType('Search must be 150 characters or fewer.');const search='%'+q.replace(/[!%_]/g,c=>'!'+c)+'%',cursor=pagination(url,ErrorType);
  const where=" WHERE (u.name LIKE ? ESCAPE '!' OR u.email LIKE ? ESCAPE '!')",bind=[search,search];let clause=where;
  if(cursor){clause+=' AND (u.created_at<? OR (u.created_at=? AND u.id<?))';bind.push(cursor[0],cursor[0],cursor[1]);}
  const total=await env.DB.prepare('SELECT COUNT(*) total FROM customer_users u'+where).bind(search,search).first();
  const rows=await env.DB.prepare('SELECT u.id,u.name,u.email,u.created_at createdAt,COUNT(l.order_id) projects,MAX(o.updated_at) lastProjectUpdate FROM customer_users u LEFT JOIN customer_order_links l ON l.user_id=u.id LEFT JOIN orders o ON o.id=l.order_id'+clause+' GROUP BY u.id,u.name,u.email,u.created_at ORDER BY u.created_at DESC,u.id DESC LIMIT 51').bind(...bind).all();const more=rows.results.length>50,customers=rows.results.slice(0,50),last=customers.at(-1);return{customers,total:total.total,next:more?last.createdAt+'|'+last.id:null};
 }
 const customer=path.match(/^\/admin-api\/customers\/([a-f0-9-]{36})$/);
 if(customer){if(!uuid.test(customer[1]))throw new ErrorType('Customer not found.',404);const user=await env.DB.prepare('SELECT id,name,email,created_at createdAt FROM customer_users WHERE id=?').bind(customer[1]).first();if(!user)throw new ErrorType('Customer not found.',404);
  const cursor=pagination(url,ErrorType);let sql='SELECT o.id,o.website,o.package_id packageId,o.status,o.created_at createdAt,o.updated_at updatedAt FROM orders o JOIN customer_order_links l ON l.order_id=o.id WHERE l.user_id=?',bind=[user.id];if(cursor){sql+=' AND (o.created_at<? OR (o.created_at=? AND o.id<?))';bind.push(cursor[0],cursor[0],cursor[1]);}
  const rows=await env.DB.prepare(sql+' ORDER BY o.created_at DESC,o.id DESC LIMIT 51').bind(...bind).all(),projects=rows.results.slice(0,50),last=projects.at(-1);return{customer:user,projects,next:rows.results.length>50?last.createdAt+'|'+last.id:null};
 }
 if(path==='/admin-api/payments'){
  const mode=url.searchParams.get('mode')||'all';if(!['all','live','test'].includes(mode))throw new ErrorType('Invalid payment mode.');const cursor=pagination(url,ErrorType,'number'),where=mode==='all'?' WHERE 1=1':' WHERE p.test_mode='+(mode==='test'?'1':'0'),bind=[];let clause=where;if(cursor){clause+=' AND (p.started_at<? OR (p.started_at=? AND p.order_id<?))';bind.push(cursor[0],cursor[0],cursor[1]);}
  const total=await env.DB.prepare('SELECT COUNT(*) total FROM order_payments p'+where).first();const rows=await env.DB.prepare('SELECT p.order_id orderId,p.state,p.amount_cents amountCents,p.refunded_cents refundedCents,p.currency,p.test_mode testMode,p.started_at startedAt,p.paid_at paidAt,o.website,o.name FROM order_payments p JOIN orders o ON o.id=p.order_id'+clause+' ORDER BY p.started_at DESC,p.order_id DESC LIMIT 51').bind(...bind).all(),payments=rows.results.slice(0,50).map(r=>({...r,testMode:!!r.testMode})),last=payments.at(-1);return{payments,total:total.total,next:rows.results.length>50?last.startedAt+'|'+last.orderId:null};
 }
 if(path==='/admin-api/system'){
  const response=await env.ZIKAP_API.fetch(new Request('https://zikap.internal/health'));if(!response.ok)throw new ErrorType('The order service could not confirm its readiness.',503);const health=await response.json();return{admin:true,orders:health.ready===true,customers:health.customerAccounts===true,payments:health.payments===true,domain:new URL(req.url).hostname,checkedAt:new Date().toISOString()};
 }
 return null;
}
