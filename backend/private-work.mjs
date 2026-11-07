// Invoked only after the separate administration session and origin checks.
export async function privateWork(req,env,ErrorType,readBody){
 const match=new URL(req.url).pathname.match(/^\/admin-api\/projects\/([a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})\/private-work$/);
 if(!match)return null;
 if(!['GET','PATCH'].includes(req.method))throw new ErrorType('Method not allowed.',405);
 try{await env.DB.prepare('SELECT order_id FROM owner_project_work LIMIT 1').first();}catch{throw new ErrorType('Private workspace is being prepared. Try again after deployment.',503);}
 const id=match[1],order=await env.DB.prepare('SELECT id FROM orders WHERE id=?').bind(id).first();
 if(!order)throw new ErrorType('Project not found.',404);
 if(req.method==='GET'){
  const row=await env.DB.prepare('SELECT completed,private_note,version,updated_at FROM owner_project_work WHERE order_id=?').bind(id).first();
  return {work:row?{completed:JSON.parse(row.completed),note:row.private_note,version:row.version,updatedAt:row.updated_at}:{completed:[],note:'',version:0,updatedAt:null}};
 }
 const data=await readBody(req,24000);
 if(typeof data.note!=='string'||data.note.length>4000)throw new ErrorType('Private notes must be 4,000 characters or fewer.');
 if(!Array.isArray(data.completed)||data.completed.length>4||data.completed.some(x=>!['review-1','review-2','review-3','review-4'].includes(x))||new Set(data.completed).size!==data.completed.length)throw new ErrorType('Invalid review checklist.');
 if(!Number.isSafeInteger(data.expectedVersion)||data.expectedVersion<0||data.expectedVersion>=2147483647)throw new ErrorType('Invalid private workspace version.');
 const completed=[...data.completed].sort(),note=data.note,updatedAt=new Date().toISOString(),version=data.expectedVersion+1;
 const saved=await env.DB.prepare(`INSERT INTO owner_project_work(order_id,completed,private_note,version,updated_at)
 SELECT ?,?,?,1,? WHERE ?=0 OR EXISTS(SELECT 1 FROM owner_project_work WHERE order_id=?)
 ON CONFLICT(order_id) DO UPDATE SET completed=excluded.completed,private_note=excluded.private_note,version=owner_project_work.version+1,updated_at=excluded.updated_at
 WHERE owner_project_work.version=?`).bind(id,JSON.stringify(completed),note,updatedAt,data.expectedVersion,id,data.expectedVersion).run();
 if(!saved.meta.changes)throw new ErrorType('Private work changed in another page. Download your draft before loading the latest saved version.',409);
 return {work:{completed,note,version,updatedAt}};
}
