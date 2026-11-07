// Fixed service IDs and scope limits; editable presentation and one-time whole-USD prices.
export const prices={audit:29,keywords:19,onpage:39,bundle:79};
export const titles={audit:'Technical SEO Starter',keywords:'Keyword Research Starter',onpage:'On-page SEO Starter',bundle:'SEO Starter Bundle'};
const descriptions={audit:'Prioritized technical findings and an action checklist for up to 5 public pages.',keywords:'25 curated keyword ideas, intent groups and a map for up to 5 pages.',onpage:'Proposed titles, descriptions, headings and internal links for up to 3 existing pages.',bundle:'A 5-page technical review, 25-keyword map and edit briefs for 3 existing pages.'};
export async function serviceCatalog(env,ErrorType=Error){
 try{const {results}=await env.DB.prepare('SELECT id,title,description,price_usd price,version,updated_at updatedAt FROM service_catalog').all();if(results.length!==4||results.some(x=>!Object.hasOwn(prices,x.id)||!Number.isInteger(x.price)||x.price<1||x.price>9999))throw Error('Invalid catalog');return {persistent:true,services:Object.keys(prices).map(id=>results.find(x=>x.id===id))};}
 catch{if(env.SERVICE_CATALOG_REQUIRED==='true')throw new ErrorType('Package information is temporarily unavailable. Refresh before making a request.',503);return {persistent:false,services:Object.keys(prices).map(id=>({id,title:titles[id],description:descriptions[id],price:prices[id],version:0,updatedAt:null}))};}
}
export async function quoteOrder(env,o,raw,existing,ErrorType){
 if(existing)return {...o,price:existing.price_usd,catalog:null};
 const catalog=await serviceCatalog(env,ErrorType),service=catalog.services.find(x=>x.id===o.packageId);
 if(catalog.persistent&&(raw.quotedPrice!==service.price||raw.catalogVersion!==service.version))throw new ErrorType('The package information changed or has not loaded. Refresh the package and confirm its current price before submitting.',409);
 return {...o,price:service.price,catalog:catalog.persistent?service:null};
}
export function snapshotStatement(env,o,id,tokenHash){return env.DB.prepare('INSERT INTO order_package_snapshots(order_id,title,description,price_usd,catalog_version) SELECT id,?,?,?,? FROM orders WHERE id=? AND token_hash=? ON CONFLICT(order_id) DO NOTHING').bind(o.catalog.title,o.catalog.description,o.price,o.catalog.version,id,tokenHash);}
export async function orderSnapshots(env,rows){
 if(!rows.length)return [];let found=[];try{found=(await env.DB.prepare('SELECT order_id,title,description FROM order_package_snapshots WHERE order_id IN ('+rows.map(()=>'?').join(',')+')').bind(...rows.map(r=>r.id)).all()).results;}catch{}
 const map=new Map(found.map(s=>[s.order_id,s]));return rows.map(row=>({...row,package_title:map.get(row.id)?.title||titles[row.package_id],package_description:map.get(row.id)?.description||descriptions[row.package_id]}));
}
export async function orderSnapshot(env,row){
 if(row.package_title)return row;
 try{const s=await env.DB.prepare('SELECT title,description,price_usd FROM order_package_snapshots WHERE order_id=?').bind(row.id).first();return {...row,package_title:s?.title||titles[row.package_id],package_description:s?.description||descriptions[row.package_id]};}catch{return {...row,package_title:titles[row.package_id],package_description:descriptions[row.package_id]};}
}
export async function editCatalog(req,env,ErrorType,readBody){
 const path=new URL(req.url).pathname;if(path!=='/admin-api/catalog'&&!/^\/admin-api\/catalog\/(audit|keywords|onpage|bundle)$/.test(path))return null;
 if(path==='/admin-api/catalog'&&req.method==='GET'){const catalog=await serviceCatalog({...env,SERVICE_CATALOG_REQUIRED:'true'},ErrorType);return {services:catalog.services};}
 const id=path.split('/')[3];if(!id||req.method!=='PATCH')throw new ErrorType('Method not allowed.',405);
 await serviceCatalog({...env,SERVICE_CATALOG_REQUIRED:'true'},ErrorType);const data=await readBody(req);
 if(typeof data.title!=='string'||!data.title.trim()||data.title.trim().length>80||/[\r\n\x00-\x1f]/.test(data.title))throw new ErrorType('Use a package name of 1–80 characters on one line.');
 if(typeof data.description!=='string'||!data.description.trim()||data.description.trim().length>400)throw new ErrorType('Use a summary of 1–400 characters.');
 if(!Number.isInteger(data.price)||data.price<1||data.price>9999)throw new ErrorType('Enter a whole-USD one-time price from $1 to $9,999.');
 if(!Number.isInteger(data.expectedVersion)||data.expectedVersion<1||data.expectedVersion>=2147483647)throw new ErrorType('Invalid package version.');
 const service={id,title:data.title.trim(),description:data.description.trim(),price:data.price,version:data.expectedVersion+1,updatedAt:new Date().toISOString()};
 const result=await env.DB.prepare('UPDATE service_catalog SET title=?,description=?,price_usd=?,version=version+1,updated_at=? WHERE id=? AND version=?').bind(service.title,service.description,service.price,service.updatedAt,id,data.expectedVersion).run();
 if(!result.meta.changes)throw new ErrorType('This package changed in another page. Keep your draft and reload the saved catalog before editing again.',409);
 return {service};
}
