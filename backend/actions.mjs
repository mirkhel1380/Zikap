const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
export async function actionsReady(env){
 if(!env.DB)return false;try{await env.DB.prepare('SELECT id,order_id,title,page_url,notes,priority,status,version,created_at,updated_at FROM project_actions LIMIT 1').first();return true;}catch{return false;}
}
const publicAction=row=>({id:row.id,title:row.title,pageUrl:row.page_url,notes:row.notes,priority:row.priority,status:row.status,version:row.version,createdAt:row.created_at,updatedAt:row.updated_at});
export async function projectActions(req,env,order,actionId,h){
 const {ApiError,jsonBody,rate}=h;
 if(!await actionsReady(env))throw new ApiError('Project action plans are being prepared. Please return shortly.',503);
 const result=(body,status=200)=>({body,status,headers:{}});
 if(req.method==='GET'&&!actionId){const {results}=await env.DB.prepare('SELECT * FROM project_actions WHERE order_id=? ORDER BY created_at ASC,id ASC LIMIT 100').bind(order.id).all();return result({actions:results.map(publicAction),limit:100});}
 if(!['POST','PATCH'].includes(req.method)||(req.method==='POST'&&actionId)||(req.method==='PATCH'&&!actionId))throw new ApiError('Action route not found.',404);
 await rate(req,env,'account-actions-write',120);const data=await jsonBody(req,12000);
 const field=(value,max,required=false)=>{if(typeof value!=='string'||value.length>max||(required&&!value.trim()))throw new ApiError('Check the action title, page URL and notes lengths.');return value.trim();};
 const title=field(data.title,200,true),pageUrl=field(data.pageUrl??'',500),notes=field(data.notes??'',2000),priority=data.priority??'medium',status=data.status??'planned';
 if(!['high','medium','low'].includes(priority)||!['planned','doing','done','archived'].includes(status))throw new ApiError('Choose a valid priority and action status.');
 if(pageUrl){let url;try{url=new URL(pageUrl);}catch{throw new ApiError('Enter a complete page URL.');}if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.hostname!==new URL(order.website).hostname)throw new ApiError('The page URL must be on this project’s website and contain no login details.');}
 const now=new Date().toISOString();
 if(req.method==='POST'){
  if(!uuid.test(data.requestId||''))throw new ApiError('Invalid action reference. Reload the project and try again.');
  await env.DB.prepare('INSERT INTO project_actions (id,order_id,title,page_url,notes,priority,status,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM project_actions WHERE order_id=?)<100 ON CONFLICT(id) DO NOTHING').bind(data.requestId,order.id,title,pageUrl,notes,priority,status,now,now,order.id).run();
  const row=await env.DB.prepare('SELECT * FROM project_actions WHERE id=? AND order_id=?').bind(data.requestId,order.id).first();
  if(!row){const count=await env.DB.prepare('SELECT COUNT(*) AS n FROM project_actions WHERE order_id=?').bind(order.id).first();throw new ApiError(count.n>=100?'This project has reached 100 saved actions, including archived actions.':'This action reference is already in use. Reload the action plan.',409);}
  if(row.title!==title||row.page_url!==pageUrl||row.notes!==notes||row.priority!==priority||row.status!==status)throw new ApiError('This action reference already has different details. Reload the action plan.',409);
  return result({action:publicAction(row)},201);
 }
 if(!uuid.test(actionId)||!Number.isSafeInteger(data.version)||data.version<1)throw new ApiError('Reload the action before saving changes.');
 const update=await env.DB.prepare('UPDATE project_actions SET title=?,page_url=?,notes=?,priority=?,status=?,updated_at=?,version=version+1 WHERE id=? AND order_id=? AND version=?').bind(title,pageUrl,notes,priority,status,now,actionId,order.id,data.version).run();
 if(!update.meta.changes){const existing=await env.DB.prepare('SELECT id FROM project_actions WHERE id=? AND order_id=?').bind(actionId,order.id).first();throw new ApiError(existing?'This action changed in another session. Reload actions and open it again before saving.':'Action not found.',existing?409:404);}
 const row=await env.DB.prepare('SELECT * FROM project_actions WHERE id=? AND order_id=?').bind(actionId,order.id).first();return result({action:publicAction(row)});
}
