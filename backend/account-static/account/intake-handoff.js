'use strict';
(()=>{
 const ids=['audit','keywords','onpage','bundle'];
 function parse(search){
  const params=new URLSearchParams(search),intent={packageId:ids.includes(params.get('package'))?params.get('package'):null,website:'',pages:''};
  const raw=params.get('website');if(!raw||raw.length>500)return intent;
  try{const site=new URL(raw);if(!['https:','http:'].includes(site.protocol)||site.username||site.password||site.search)return intent;site.hash='';if(site.href.length>500)return intent;intent.website=site.href;
   const rawPages=params.get('pages')||site.href;if(rawPages.length>2600)return intent;
   const lines=rawPages.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);if(lines.length>5)return intent;
   const pages=lines.map(line=>{const page=new URL(line);if(!['http:','https:'].includes(page.protocol)||page.origin!==site.origin||page.username||page.password||page.search||line.length>500)throw Error();page.hash='';if(page.href.length>500)throw Error();return page.href;});intent.pages=pages.join('\n');
  }catch{/* Invalid link data is never trusted as a project brief. */}
  return intent;
 }
 function create(search){let pending=parse(search);return {hasSelection:()=>!!pending&&(!!pending.packageId||!!pending.website),take(){const value=pending;pending=null;return value;},clear(){pending=null;}};}
 window.ZikapIntake={parse,create};
})();
