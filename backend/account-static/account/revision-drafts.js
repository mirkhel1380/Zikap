'use strict';
(()=>{
 window.ZikapRevisionDrafts={create(){
  const drafts=new Map();
  return {
   get:id=>drafts.get(id)||'',
   save(id,text){if(text.trim())drafts.set(id,text);else drafts.delete(id);},
   acknowledge(id,saved){if(typeof saved==='string'&&drafts.get(id)?.trim()===saved.trim())drafts.delete(id);},
   clear:id=>drafts.delete(id),
   clearAll:()=>drafts.clear(),
   has:()=>drafts.size>0
  };
 }};
})();
