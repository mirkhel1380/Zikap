import {aiLimits,aiModel} from './ai-reviews.mjs';
export async function aiControls(req,env,ErrorType,jsonBody){
 if(new URL(req.url).pathname!=='/admin-api/ai-control')return null;
 if(!['GET','PATCH'].includes(req.method))throw new ErrorType('Method not allowed.',405);
 let saved;try{saved=await env.DB.prepare('SELECT paused,version,updated_at FROM ai_runtime_settings WHERE id=1').first();}catch{}if(!saved)throw new ErrorType('AI controls are being prepared.',503);
 let readiness=null;try{const response=await env.ZIKAP_API.fetch(new Request('https://zikap.internal/health'));if(response.ok)readiness=(await response.json()).aiReviews;}catch{}
 if(req.method==='PATCH'){
  const data=await jsonBody(req,1000);if(typeof data.paused!=='boolean'||!Number.isSafeInteger(data.expectedVersion)||data.expectedVersion<0)throw new ErrorType('Send a pause choice and the current saved version.');
  if(!data.paused&&(!readiness?.freePlanConfirmed||!readiness?.binding||!readiness?.schema))throw new ErrorType('The primary service must confirm the free-plan flag, AI binding and schema before resuming.',503);
  const result=await env.DB.prepare('UPDATE ai_runtime_settings SET paused=?,version=version+1,updated_at=? WHERE id=1 AND version=?').bind(data.paused?1:0,new Date().toISOString(),data.expectedVersion).run();if(!result.meta.changes)throw new ErrorType('AI settings changed in another session. Refresh before trying again.',409);
  saved=await env.DB.prepare('SELECT paused,version,updated_at FROM ai_runtime_settings WHERE id=1').first();
 }
 const day=new Date().toISOString().slice(0,10),counts=await env.DB.prepare("SELECT COUNT(*) attempts,COALESCE(SUM(c.ai_state='ready'),0) completed,COALESCE(SUM(c.ai_state='failed'),0) failed,COALESCE(SUM(c.ai_state='generating'),0) inProgress FROM ai_reservations r LEFT JOIN ai_checks c ON c.id=r.check_id WHERE r.day=?").bind(day).first();
 return{control:{paused:!!saved.paused,version:saved.version,updatedAt:saved.updated_at},ready:!!(readiness?.binding&&readiness?.schema&&readiness?.freePlanConfirmed&&!saved.paused),canResume:!!(readiness?.binding&&readiness?.schema&&readiness?.freePlanConfirmed),model:aiModel,limits:aiLimits,usage:{...counts,remaining:Math.max(0,aiLimits.perDay-counts.attempts),day,resetAt:new Date(Date.parse(day+'T00:00:00Z')+86400000).toISOString()},checkedAt:new Date().toISOString()};
}
