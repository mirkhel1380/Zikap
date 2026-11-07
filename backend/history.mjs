export async function historyReady(env){if(!env.DB)return false;try{await env.DB.prepare('SELECT order_id,version FROM order_edit_versions LIMIT 1').first();await env.DB.prepare('SELECT order_id,version,report,saved_at,replaced_at FROM order_history LIMIT 1').first();return!!await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='trigger' AND name='order_history_capture'").first();}catch{return false;}}
export async function editVersion(env,id){if(!await historyReady(env))return null;const row=await env.DB.prepare('SELECT version FROM order_edit_versions WHERE order_id=?').bind(id).first();return row?.version??0;}
// Customer metadata only. One statement keeps current and retained states consistent.
export async function customerActivity(env,id,ApiError){
 if(!await historyReady(env))throw new ApiError('Recent project activity is temporarily unavailable. Your latest project update is still available.',503);
 const {results}=await env.DB.prepare(`SELECT version,status,savedAt,current FROM (
 SELECT COALESCE(v.version,0) version,o.status,o.updated_at savedAt,1 current
 FROM orders o LEFT JOIN order_edit_versions v ON v.order_id=o.id WHERE o.id=?
 UNION ALL
 SELECT version,status,saved_at savedAt,0 current FROM order_history WHERE order_id=?
 ) ORDER BY current DESC,version DESC LIMIT 21`).bind(id,id).all();
 return {activity:results.map(row=>({version:row.version,status:row.status,savedAt:row.savedAt,current:!!row.current})),retainedLimit:20};
}
export async function projectHistory(req,env,id,version,ApiError){if(req.method!=='GET')throw new ApiError('Method not allowed.',405);if(!await historyReady(env))throw new ApiError('Saved history is not available yet.',503);
 const exists=await env.DB.prepare('SELECT id FROM orders WHERE id=?').bind(id).first();if(!exists)throw new ApiError('Order not found.',404);const currentVersion=await editVersion(env,id);
 if(version!==undefined){if(!/^(0|[1-9][0-9]{0,9})$/.test(version))throw new ApiError('Invalid saved version.');const row=await env.DB.prepare('SELECT version,status,report,owner_note note,revision_used revisionUsed,revision_note revisionNote,saved_at savedAt,replaced_at replacedAt FROM order_history WHERE order_id=? AND version=?').bind(id,Number(version)).first();if(!row)throw new ApiError('This saved version is no longer available. Refresh the history list.',404);return{snapshot:row,currentVersion};}
 const result=await env.DB.prepare('SELECT version,status,LENGTH(TRIM(report))>0 hasReport,LENGTH(report) reportCharacters,saved_at savedAt,replaced_at replacedAt FROM order_history WHERE order_id=? ORDER BY version DESC LIMIT 20').bind(id).all();return{history:result.results,currentVersion,retainedLimit:20};
}
