'use strict';
(()=>{
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
 window.ZikapPrivateWork={mount(host,{api,order,checks=[],alive,onDirty}){
  const form=el('form',null,'private-work'),heading=el('div',null,'private-work-heading');
  heading.append(el('span','OWNER ONLY','eyebrow'),el('h3','Private project workspace'),el('p','Saved review checklist and internal notes. These are never added to the customer report or project conversation.','tiny'));
  const progress=el('p','Loading saved work…','private-progress'),fields=el('fieldset'),legend=el('legend','Review checklist');fields.append(legend);
  const boxes=checks.map((text,i)=>{const label=el('label',null,'owner-check'),box=el('input');box.type='checkbox';box.value='review-'+(i+1);label.append(box,el('span',text));fields.append(label);return box;});
  const label=el('label','Internal notes'),note=el('textarea');note.id='private-note-'+order.id;note.maxLength=4000;note.rows=5;note.placeholder='Record review context, open questions and your next action. Avoid passwords or access keys.';label.htmlFor=note.id;
  const count=el('p','0 / 4,000 characters','tiny'),actions=el('div',null,'actions'),save=el('button','Save private work','btn'),reload=el('button','Load latest saved','btn ghost'),download=el('button','Download private draft','btn ghost'),status=el('p');
  save.type='submit';reload.type=download.type='button';status.setAttribute('role','status');status.setAttribute('aria-live','polite');actions.append(save,reload,download);form.append(heading,progress,fields,label,note,count,actions,status);host.append(form);
  let version=null,changed=false,busy=false,loadRequest=0;
  const path='/admin-api/projects/'+order.id+'/private-work';
  function controls(){fields.disabled=busy||version===null;note.disabled=busy||version===null;save.disabled=busy||version===null||!changed;reload.disabled=busy;download.disabled=busy||version===null;}
  function update(){count.textContent=note.value.length.toLocaleString()+' / 4,000 characters';progress.textContent=boxes.filter(b=>b.checked).length+' / '+boxes.length+' review steps checked. Internal tracking only.';}
  function setSaved(work){version=work.version;note.value=work.note;boxes.forEach(b=>b.checked=work.completed.includes(b.value));changed=false;onDirty(false);update();status.textContent=work.updatedAt?'Private work saved '+new Date(work.updatedAt).toLocaleString()+'.':'No private work saved yet.';}
  async function load(){if(changed&&!confirm('Replace unsaved private work with the latest saved version? Download your draft first if you need a copy.'))return;const request=++loadRequest;busy=true;controls();status.textContent='Loading private work…';try{const data=await api(path);if(!alive()||request!==loadRequest)return;setSaved(data.work);}catch(e){if(alive())status.textContent=e.message;}finally{if(alive()){busy=false;controls();}}}
  form.addEventListener('input',()=>{changed=true;onDirty(true);update();status.textContent='Unsaved private changes. Save to keep them across visits.';controls();});
  form.addEventListener('submit',async event=>{event.preventDefault();if(busy||version===null||!changed)return;busy=true;controls();status.textContent='Saving private work…';try{const data=await api(path,'PATCH',{note:note.value,completed:boxes.filter(b=>b.checked).map(b=>b.value),expectedVersion:version});if(!alive())return;setSaved(data.work);status.textContent='Private work saved. No customer update was sent.';}catch(e){if(alive())status.textContent=e.message;}finally{if(alive()){busy=false;controls();}}});
  reload.addEventListener('click',load);
  download.addEventListener('click',()=>{const text=['Zikap / PRIVATE OWNER DRAFT','Order: '+order.id,'Not a customer deliverable','',...boxes.map((b,i)=>(b.checked?'[x] ':'[ ] ')+checks[i]),'','Internal notes',note.value].join('\n'),url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'})),a=el('a');a.href=url;a.download='zikap-private-draft-'+order.id+'.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  load();
 }};
})();
