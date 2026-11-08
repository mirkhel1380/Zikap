'use strict';
(()=>{
 function attempt(previous,fingerprint,makeId){return previous&&(previous.uncertain||previous.fingerprint===fingerprint)?previous:{id:makeId(),fingerprint,uncertain:false};}
 function sameBrief(body,order){
  try{if(body.consent!==true||body.packageId!==order.packageId||new URL(body.website.trim()).href!==order.website||!Array.isArray(order.pages))return false;
   const pages=body.pages.trim().split(/\r?\n/).map(v=>v.trim()).filter(Boolean);if(JSON.stringify(pages)!==JSON.stringify(order.pages))return false;
   return ['topic','language','market','goals'].every(key=>typeof body[key]==='string'&&body[key].trim()===order[key]);
  }catch{return false;}
 }
 window.ZikapRequestRecovery={attempt,sameBrief};
})();
