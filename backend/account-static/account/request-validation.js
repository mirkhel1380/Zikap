'use strict';
(()=>{
 const ids=['audit','keywords','onpage','bundle'];
 const validCatalog=services=>Array.isArray(services)&&services.length===4&&new Set(services.map(s=>s?.id)).size===4&&services.every(s=>s&&ids.includes(s.id)&&Number.isInteger(s.price)&&s.price>=1&&s.price<=9999&&Number.isSafeInteger(s.version)&&s.version>=0&&typeof s.title==='string'&&!!s.title.trim()&&typeof s.description==='string'&&!!s.description.trim());
 function check(data){
  const errors={},max=data.packageId==='onpage'?3:5,lines=String(data.pages||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);let website;
  if(!ids.includes(data.packageId))errors.package='Choose a valid starter package.';
  try{website=new URL(data.website.trim());if(!['http:','https:'].includes(website.protocol)||website.username||website.password)throw Error();}catch{errors.website='Use a complete HTTP or HTTPS website URL without a username or password.';}
  if(String(data.website||'').trim().length>500)errors.website='Use a website URL of up to 500 characters.';
  if(lines.length>max)errors.pages='This package allows up to '+max+' page URLs. Remove the extra lines or choose another package.';
  else if(!lines.length&&data.packageId!=='keywords')errors.pages='Add at least one page URL to review.';
  else if(String(data.pages||'').trim().length>2600)errors.pages='Keep the page list within 2,600 characters.';
  else for(let i=0;i<lines.length;i++){
   let page;try{page=new URL(lines[i]);}catch{errors.pages='Line '+(i+1)+': enter one complete URL per line.';break;}
   if(!['http:','https:'].includes(page.protocol)||page.username||page.password){errors.pages='Line '+(i+1)+': use an HTTP or HTTPS URL without a username or password.';break;}
   if(website&&!errors.website&&page.origin!==website.origin){errors.pages='Line '+(i+1)+': use the same protocol, hostname and port as your website URL.';break;}
  }
  for(const [key,limit,required,label] of [['topic',200,['keywords','bundle'].includes(data.packageId),'main topic'],['language',80,true,'content language'],['market',100,true,'target market'],['goals',3000,true,'project goals']]){
   const value=String(data[key]||'').trim();if(required&&!value)errors[key]='Enter your '+label+'.';else if(value.length>limit)errors[key]='Keep your '+label+' within '+limit+' characters.';
  }
  if(data.consent!==true)errors.consent='Confirm that Zikap may store these project details.';
  return {errors,pageCount:lines.length,pageLimit:max};
 }
 window.ZikapRequestValidation={check,validCatalog};
})();
