import {titles} from './catalog.mjs';

const emailPattern=/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,63}$/;
const retryWindow=23*60*60;
export function emailSettings(env) {
 let settings;
 try { settings=JSON.parse(env.EMAIL_SETTINGS||'{}'); } catch { return {enabled:false,valid:false,checks:{settings:false,key:false,sender:false,startAt:false}}; }
 if(!settings||typeof settings!=='object'||Array.isArray(settings)||(settings.enabled!==undefined&&typeof settings.enabled!=='boolean'))return {enabled:false,valid:false,checks:{settings:false,key:false,sender:false,startAt:false}};
 const enabled=settings.enabled===true;
 const key=typeof env.RESEND_API_KEY==='string'&&/^re_[A-Za-z0-9_-]{8,200}$/.test(env.RESEND_API_KEY);
 const sender=typeof settings.from==='string'&&settings.from.length<=254&&emailPattern.test(settings.from)&&(!settings.replyTo||(typeof settings.replyTo==='string'&&emailPattern.test(settings.replyTo)));
 const date=typeof settings.startAt==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(settings.startAt)?Date.parse(settings.startAt):NaN;
 const startAt=Number.isFinite(date)&&new Date(date).toISOString().replace('.000Z','Z')===settings.startAt;
 return {enabled,valid:key&&sender&&startAt,from:sender?settings.from:null,replyTo:settings.replyTo||null,startAt:startAt?Math.floor(date/1000):null,checks:{settings:true,key,sender:!!sender,startAt}};
}
export async function emailReadiness(env) {
 const config=emailSettings(env);let schema=false;
 if(env.DB)try { await env.DB.prepare('SELECT id,order_id,kind,metadata,created_at,state,attempts,next_attempt,first_attempt,lease_until,lease_token,payload,provider_id,error_code,accepted_at FROM email_outbox LIMIT 1').first();schema=true; } catch {}
 return {enabled:config.enabled,ready:config.enabled&&config.valid&&schema,checks:{...config.checks,schema}};
}
const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function renderNotification(event,recipient,config) {
 if(typeof recipient.email!=='string'||recipient.email.length>254||!emailPattern.test(recipient.email))throw new Error('INVALID_RECIPIENT');
 const meta=JSON.parse(event.metadata),packageName=titles[meta.packageId]||'your SEO project';
 let subject,title,copy;
 if(event.kind==='request_received'){
  subject='Zikap: your project request is received';title='Your next step starts here.';
  copy='We received your request for '+packageName+'. Zikap will review the scope and timing before acceptance. Submitting this request has not charged you.';
 } else if(event.kind==='project_accepted'){
  subject='Zikap: your project request is accepted';title='Your request is accepted.';
  copy='Your request for '+packageName+' was accepted. Review the agreed scope, timing and latest project update before continuing to the available payment step.';
 } else if(event.kind==='report_ready'){
  subject='Zikap: a report is ready to review';title='Your report is ready.';
  copy='A specialist report for '+packageName+' was saved to your project. Open the latest version to read or download it, view recommendations and check your included clarification option.';
 } else if(event.kind==='payment_confirmed'){
  if(!Number.isSafeInteger(meta.amountCents)||meta.amountCents<0||meta.currency!=='usd'||![0,1].includes(meta.testMode))throw new Error('INVALID_EVENT');
  const amount=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(meta.amountCents/100);
  subject=meta.testMode?'Zikap TEST MODE: simulated payment confirmed':'Zikap: payment confirmed';title=meta.testMode?'Test payment recorded.':'Your payment is confirmed.';
  copy=meta.testMode?amount+' was recorded in Stripe test mode. No real charge was made.': 'A one-time payment of '+amount+' USD was confirmed for your project. This email is a project update; check Stripe and your project for the latest payment or refund status.';
 } else throw new Error('INVALID_EVENT');
 const url=recipient.linked?'https://zikap.m-mirkhel20.workers.dev/account/#projects':'https://mirkhel1380.github.io/Zikap/workspace.html';
 const instruction=recipient.linked?'Sign in to your customer account to view your project.':'Open project tracking and use the private receipt key you saved when submitting your request.';
 const foot='This is a transactional update for a Zikap project request. Reports, messages, passwords and private receipt keys are never attached. If you did not request this project, you can ignore this email.';
 const text=['Zikap',title,copy,instruction,url,'Project reference: '+event.order_id,foot].join('\n\n');
 // Fixed links only. User-provided website URLs, reports, messages and names never enter the template.
 const html='<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#f3f6fb;font-family:Arial,Helvetica,sans-serif;color:#18263e"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:30px 14px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:auto;background:#fff;border:1px solid #e0e7f2;border-radius:14px"><tr><td style="padding:25px 30px;background:#142542;color:#fff;font-size:23px;font-weight:bold;border-radius:14px 14px 0 0">Zikap</td></tr><tr><td style="padding:30px"><p style="font-size:10px;letter-spacing:2px;color:#2563eb">YOUR SEO WORKSPACE</p><h1 style="font-size:27px;line-height:1.3;margin:16px 0">'+escape(title)+'</h1><p style="font-size:14px;line-height:1.9;color:#64748b">'+escape(copy)+'</p><p style="font-size:13px;line-height:1.8;color:#64748b">'+escape(instruction)+'</p><p style="margin:26px 0"><a href="'+url+'" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-size:13px;font-weight:bold;padding:13px 20px;border-radius:7px">'+(recipient.linked?'Open your workspace':'Open project tracking')+'</a></p><p style="font-size:10px;color:#8a98ae;overflow-wrap:anywhere">Project reference: '+escape(event.order_id)+'</p></td></tr><tr><td style="padding:20px 30px;border-top:1px solid #edf1f7;font-size:10px;line-height:1.9;color:#8a98ae">'+escape(foot)+'</td></tr></table></td></tr></table></body></html>';
 const payload={from:'Zikap <'+config.from+'>',to:[recipient.email],subject,html,text};
 if(config.replyTo)payload.reply_to=config.replyTo;
 return payload;
}

// Only cron invokes this dispatcher. There is no public endpoint that can send mail.
export async function dispatchNotifications(env,{now=Math.floor(Date.now()/1000),limit=5}={}) {
 const status=await emailReadiness(env);if(!status.ready)return {active:false,processed:0};
 const config=emailSettings(env),count=Math.max(1,Math.min(Number.isInteger(limit)?limit:5,5));
 // Activation is a boundary: never send a backlog created while the service was disabled.
 await env.DB.prepare("UPDATE email_outbox SET state='skipped',error_code='BEFORE_ACTIVATION' WHERE state='pending' AND first_attempt IS NULL AND created_at<?").bind(config.startAt).run();
 await env.DB.prepare("UPDATE email_outbox SET state='uncertain',error_code='ACTIVATION_CHANGED',lease_token='',lease_until=0 WHERE created_at<? AND first_attempt IS NOT NULL AND (state='pending' OR (state='sending' AND lease_until<=?))").bind(config.startAt,now).run();
 const {results}=await env.DB.prepare("SELECT id FROM email_outbox WHERE created_at>=? AND ((state='pending' AND next_attempt<=?) OR (state='sending' AND lease_until<=?)) ORDER BY created_at,id LIMIT ?").bind(config.startAt,now,now,count).all();
 let processed=0;
 for(const candidate of results){
  const lease=crypto.randomUUID();
  const claimed=await env.DB.prepare("UPDATE email_outbox SET state='sending',lease_token=?,lease_until=?,attempts=attempts+1,first_attempt=COALESCE(first_attempt,?) WHERE id=? AND ((state='pending' AND next_attempt<=?) OR (state='sending' AND lease_until<=?))").bind(lease,now+120,now,candidate.id,now,now).run();
  if(!claimed.meta.changes)continue;
  processed++;
  const row=await env.DB.prepare('SELECT * FROM email_outbox WHERE id=? AND lease_token=?').bind(candidate.id,lease).first();
  if(!row)continue;
  const finish=(state,code='',provider='')=>env.DB.prepare("UPDATE email_outbox SET state=?,error_code=?,provider_id=?,lease_until=0,lease_token='',next_attempt=?,accepted_at=CASE WHEN ?='accepted' THEN ? ELSE accepted_at END WHERE id=? AND lease_token=? AND state='sending'").bind(state,code,provider,now+Math.min(1800,60*2**Math.min(row.attempts,5)),state,now,row.id,lease).run();
  if(now-row.first_attempt>=retryWindow){await finish('uncertain','RETRY_WINDOW_EXPIRED');continue;}
  let payload=row.payload;
  if(!payload){
   try{
    const recipient=await env.DB.prepare('SELECT COALESCE(u.email,o.email) email,l.user_id linked FROM orders o LEFT JOIN customer_order_links l ON l.order_id=o.id LEFT JOIN customer_users u ON u.id=l.user_id WHERE o.id=?').bind(row.order_id).first();
    if(!recipient){await finish('skipped','ORDER_REMOVED');continue;}
    payload=JSON.stringify(renderNotification(row,recipient,config));
    const persisted=await env.DB.prepare("UPDATE email_outbox SET payload=? WHERE id=? AND lease_token=? AND state='sending' AND payload IS NULL").bind(payload,row.id,lease).run();
    if(!persisted.meta.changes)continue;
   }catch {await finish('failed','INVALID_EVENT');continue;}
  }
  try{
   const transport=typeof env.EMAIL_HTTP==='function'?env.EMAIL_HTTP:fetch;
   const response=await transport('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'zikap-notification/'+row.id},body:payload,signal:AbortSignal.timeout(10000),redirect:'error'});
   if(response.ok){
    let data;try{data=await response.json();}catch{}
    if(typeof data?.id==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(data.id))await finish('accepted','',data.id);
    else await finish('pending','PROVIDER_RESPONSE');
   }else {
    // Provider bodies may contain addresses or secrets; never persist or return them.
    await response.body?.cancel();
    const retry=response.status===408||response.status===409||response.status===429||response.status>=500;
    await finish(retry?'pending':'failed',response.status===401||response.status===403?'PROVIDER_CONFIGURATION':retry?'PROVIDER_RETRY':'PROVIDER_REJECTED');
   }
  }catch {await finish('pending','PROVIDER_UNAVAILABLE');}
 }
 return {active:true,processed};
}
