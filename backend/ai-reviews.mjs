import {auditRoute} from './website-audit.mjs';
export const aiLimits=Object.freeze({perCustomer:2,perDay:20,maxTokens:512,retentionDays:7});
export const aiModel='@cf/google/gemma-4-26b-a4b-it';
const dayAt=now=>new Date(now*1000).toISOString().slice(0,10);
export async function aiReadiness(env){
 let schema=false,paused=true;
 if(env.DB)try{await env.DB.prepare('SELECT id,user_id,created_at,expires_at,audit_json,ai_state,ai_json,error_code FROM ai_checks LIMIT 1').first();await env.DB.prepare('SELECT check_id,user_id,day,created_at FROM ai_reservations LIMIT 1').first();const settings=await env.DB.prepare('SELECT paused FROM ai_runtime_settings WHERE id=1').first();if(settings){paused=!!settings.paused;schema=true;}}catch{}
 const freePlanConfirmed=env.AI_FREE_PLAN_CONFIRMED==='true',binding=typeof env.AI?.run==='function';
 return{ready:schema&&binding&&freePlanConfirmed&&!paused,schema,binding,freePlanConfirmed,paused,limits:aiLimits};
}
async function usage(env,userId,now){
 const day=dayAt(now),row=await env.DB.prepare('SELECT COUNT(*) total,COALESCE(SUM(user_id=?),0) customer FROM ai_reservations WHERE day=?').bind(userId,day).first();
 return{remaining:Math.max(0,aiLimits.perCustomer-row.customer),sharedRemaining:Math.max(0,aiLimits.perDay-row.total),resetAt:new Date(Date.parse(day+'T00:00:00Z')+86400000).toISOString()};
}
function safeCheck(row){return{id:row.id,createdAt:new Date(row.created_at*1000).toISOString(),expiresAt:new Date(row.expires_at*1000).toISOString(),audit:JSON.parse(row.audit_json),aiState:row.ai_state,recommendations:row.ai_json?JSON.parse(row.ai_json):null};}
export function reviewPrompt(audit){
 // Send only trusted, structured finding codes. No page text, URL, user instructions, reports or account data.
 const findings=audit.findings.slice(0,8).map(f=>({id:f.id,check:f.check,category:f.category,severity:f.severity,needsHumanReview:!!f.review}));
 return [{role:'system',content:'You help website owners interpret a limited source-HTML check. Return only a JSON object with a recommendations array of up to 3 objects, each containing findingId, explanation, nextStep and verification. Use only supplied finding IDs. Explain the indicated check in plain English. For needsHumanReview findings, say to confirm intent before changing anything. Do not claim rankings, traffic, keyword metrics, indexing status or verified fixes. Do not invent page titles, business details or new findings. No HTML, markdown links or tools. Suggestions require human review.'},{role:'user',content:JSON.stringify({scope:'Up to 3 public HTML pages; JavaScript, indexing, speed, rankings and backlinks were not tested.',findings})}];
}
function validateOutput(raw,audit){
 if(typeof raw!=='string'||raw.length>10000)throw Error('Invalid response');
 const text=raw.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');const parsed=JSON.parse(text),rows=parsed.recommendations;
 if(!Array.isArray(rows)||!rows.length||rows.length>3)throw Error('Invalid response');
 const allowed=new Set(audit.findings.slice(0,8).map(f=>f.id)),seen=new Set();
 return rows.map(row=>{
  if(!row||!allowed.has(row.findingId)||seen.has(row.findingId))throw Error('Invalid evidence reference');seen.add(row.findingId);
  const result={findingId:row.findingId};for(const field of ['explanation','nextStep','verification']){if(typeof row[field]!=='string'||!row[field].trim()||row[field].length>700)throw Error('Invalid response');result[field]=row[field].trim();}return result;
 });
}
export async function aiReviewRoute(req,env,user,h){
 const {ApiError,jsonBody,rate}=h,path=new URL(req.url).pathname,now=Math.floor(Date.now()/1000),readiness=await aiReadiness(env);
 if(path==='/account-api/ai-checks/status'&&req.method==='GET')return{...readiness,...(readiness.schema?await usage(env,user.id,now):{remaining:0,sharedRemaining:0,resetAt:null})};
 if(!readiness.schema)throw new ApiError('Website review workspace is being prepared. Please return shortly.',503);
 await rate(req,env,'ai-checks-read',120);
 if(path==='/account-api/ai-checks'&&req.method==='GET'){
  const {results}=await env.DB.prepare('SELECT * FROM ai_checks WHERE user_id=? AND expires_at>? ORDER BY created_at DESC,id DESC LIMIT 10').bind(user.id,now).all();
  return{checks:results.map(safeCheck)};
 }
 if(path==='/account-api/ai-checks'&&req.method==='POST'){
  // The original public audit path enforces consent, body limits, SSRF/robots and global/host quotas.
  const audit=typeof env.AI_AUDIT==='function'?await env.AI_AUDIT(req,env,h):await auditRoute(req,env,h);
  const serialized=JSON.stringify(audit);if(serialized.length>65536)throw new ApiError('This check produced too much data to save. Try a smaller public page.',422);
  const id=crypto.randomUUID();await env.DB.batch([env.DB.prepare('DELETE FROM ai_checks WHERE expires_at<=?').bind(now),env.DB.prepare('INSERT INTO ai_checks(id,user_id,created_at,expires_at,audit_json) VALUES(?,?,?,?,?)').bind(id,user.id,now,now+7*86400,serialized)]);
  return{check:safeCheck(await env.DB.prepare('SELECT * FROM ai_checks WHERE id=?').bind(id).first())};
 }
 const match=path.match(/^\/account-api\/ai-checks\/([a-f0-9-]{36})(\/recommendations)?$/);
 if(!match)throw new ApiError('Review route not found.',404);
 const row=await env.DB.prepare('SELECT * FROM ai_checks WHERE id=? AND user_id=? AND expires_at>?').bind(match[1],user.id,now).first();
 if(!row)throw new ApiError('Website check not found.',404);
 if(row.ai_state==='generating'){const attempt=await env.DB.prepare('SELECT created_at FROM ai_reservations WHERE check_id=?').bind(row.id).first();if(attempt&&now-attempt.created_at>90){await env.DB.prepare("UPDATE ai_checks SET ai_state='failed',error_code='AI_OUTCOME_UNKNOWN' WHERE id=? AND ai_state='generating'").bind(row.id).run();row.ai_state='failed';}}
 if(req.method==='GET'&&!match[2])return{check:safeCheck(row)};
 if(req.method!=='POST'||!match[2])throw new ApiError('Method not allowed.',405);
 const body=await jsonBody(req,1000);if(body.consent!==true)throw new ApiError('Confirm sharing the structured findings with the AI service.');
 if(row.ai_state==='ready')return{check:safeCheck(row),cached:true,...await usage(env,user.id,now)};
 if(row.ai_state==='generating')throw new ApiError('These suggestions are already being prepared. Refresh the saved check shortly.',409);
 if(row.ai_state==='failed')throw new ApiError('This attempt did not complete. It will not be retried automatically. Your source findings remain available.',409);
 if(!readiness.ready)throw new ApiError('AI suggestions are not active or have been paused. Your website findings remain available.',503);
 const audit=JSON.parse(row.audit_json);if(!audit.findings.length)throw new ApiError('This sample has no findings to explain. It does not certify the whole website as issue-free.',422);
 const messages=reviewPrompt(audit);if(new TextEncoder().encode(JSON.stringify(messages)).byteLength>10000)throw new ApiError('The findings exceed the limited AI input size.',422);
 // Reservation and state change share a transaction. Failed or unknown calls still consume the reservation.
 const reserved=await env.DB.batch([
  env.DB.prepare("INSERT INTO ai_reservations(check_id,user_id,day,created_at) SELECT id,user_id,?,? FROM ai_checks WHERE id=? AND user_id=? AND ai_state='not_started' AND expires_at>? AND EXISTS(SELECT 1 FROM ai_runtime_settings WHERE id=1 AND paused=0) AND (SELECT COUNT(*) FROM ai_reservations WHERE day=?)<? AND (SELECT COUNT(*) FROM ai_reservations WHERE day=? AND user_id=?)<? ON CONFLICT(check_id) DO NOTHING").bind(dayAt(now),now,row.id,user.id,now,dayAt(now),aiLimits.perDay,dayAt(now),user.id,aiLimits.perCustomer),
  env.DB.prepare("UPDATE ai_checks SET ai_state='generating' WHERE id=? AND user_id=? AND ai_state='not_started' AND EXISTS(SELECT 1 FROM ai_reservations WHERE check_id=ai_checks.id)").bind(row.id,user.id)
 ]);
 if(!reserved[0].meta.changes){if(!(await aiReadiness(env)).ready)throw new ApiError('AI suggestions are paused. Your source findings remain available.',503);const latest=await env.DB.prepare('SELECT ai_state FROM ai_checks WHERE id=?').bind(row.id).first();throw new ApiError(latest?.ai_state==='not_started'?'The free daily allowance is used. Try after the daily reset.':'This check already has an AI attempt. Refresh its saved result.',latest?.ai_state==='not_started'?429:409);}
 try{
  // No premium fallback, external API key or automatic retry. One fixed model and bounded output.
  let timer;const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('AI timeout')),25000);});
  let output;try{output=await Promise.race([env.AI.run(aiModel,{messages,max_completion_tokens:aiLimits.maxTokens,temperature:0.2,stream:false,chat_template_kwargs:{enable_thinking:false},response_format:{type:'json_object'}}),timeout]);}finally{clearTimeout(timer);}
  const choice=output?.choices?.length===1?output.choices[0]:null;
  if(choice?.finish_reason!=='stop'||choice.message?.tool_calls?.length)throw Error('Incomplete AI response');
  const recommendations=validateOutput(choice.message?.content,audit);
  await env.DB.prepare("UPDATE ai_checks SET ai_state='ready',ai_json=? WHERE id=? AND user_id=? AND ai_state='generating'").bind(JSON.stringify(recommendations),row.id,user.id).run();
 }catch{
  await env.DB.prepare("UPDATE ai_checks SET ai_state='failed',error_code='AI_UNAVAILABLE' WHERE id=? AND user_id=? AND ai_state='generating'").bind(row.id,user.id).run();
  throw new ApiError('AI suggestions could not be completed. No automatic retry was made; your source findings are still available.',503);
 }
 return{check:safeCheck(await env.DB.prepare('SELECT * FROM ai_checks WHERE id=? AND user_id=?').bind(row.id,user.id).first()),...await usage(env,user.id,now)};
}
