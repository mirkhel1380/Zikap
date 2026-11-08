'use strict';
(()=>{
 const targets=document.querySelectorAll('[data-package-price],[data-package-title],[data-package-description]');if(!targets.length)return;
 async function load(){try{
  const response=await fetch((window.ZIKAP_API_BASE||'').replace(/\/$/,'')+'/catalog',{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error();const data=await response.json();
  if(!Array.isArray(data.services)||data.services.length!==4||new Set(data.services.map(s=>s.id)).size!==4||data.services.some(s=>!['audit','keywords','onpage','bundle'].includes(s.id)||!Number.isInteger(s.price)||s.price<1||s.price>9999||typeof s.title!=='string'||!s.title.trim()||typeof s.description!=='string'||!s.description.trim()))throw Error();
  for(const service of data.services){document.querySelectorAll('[data-package-price="'+service.id+'"]').forEach(el=>{el.textContent='$'+service.price.toLocaleString('en-US');el.dataset.priceState='ready';});document.querySelectorAll('[data-package-title="'+service.id+'"]').forEach(el=>el.textContent=service.title);document.querySelectorAll('[data-package-description="'+service.id+'"]').forEach(el=>el.textContent=service.description);}
  document.querySelectorAll('[data-catalog-status]').forEach(el=>el.textContent='Current USD prices loaded. Packages are one-time projects.');
  document.dispatchEvent(new CustomEvent('zikap-catalog',{detail:data.services}));
 }catch{document.querySelectorAll('[data-package-price]').forEach(el=>{el.textContent='Price unavailable';el.dataset.priceState='unavailable';});document.querySelectorAll('[data-package-description]').forEach(el=>el.textContent='Summary unavailable. Review the listed scope and reload for current package details.');document.querySelectorAll('[data-catalog-status]').forEach(el=>el.textContent='Current prices could not load. Reload this page for package details. Your account will confirm the current quote before a request.');document.dispatchEvent(new CustomEvent('zikap-catalog',{detail:null}));}}
 load();
})();
