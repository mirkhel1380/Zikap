'use strict';
(()=>{
 const el=(tag,text,cls)=>{const n=document.createElement(tag);n.textContent=text;if(cls)n.className=cls;return n;};
 window.ZikapProfile={mount(host,{api,onProfile,onError}){
  let epoch=0,busy=false,loaded=false,baseName='';
  const form=el('form','','profile-edit-form'),heading=el('h3','Edit your name'),label=el('label','Full name'),input=el('input',''),save=el('button','Save name','btn'),refresh=el('button','Refresh saved details','btn ghost'),status=el('p','','tiny');
  label.htmlFor=input.id='profile-edit-name';input.type='text';input.autocomplete='name';input.required=true;input.maxLength=100;save.type='submit';refresh.type='button';status.setAttribute('role','status');const actions=el('div','','actions');actions.append(save,refresh);form.append(heading,label,input,el('p','Your sign-in email and existing project records stay the same.','tiny'),actions,status);host.append(form);
  const valid=()=>!!input.value.trim()&&input.value.trim().length<=100&&!/[\x00-\x1f\x7f]/.test(input.value);
  const dirty=()=>input.value.trim()!==baseName;
  function controls(){input.disabled=busy;save.disabled=busy||!loaded||!dirty()||!valid();refresh.disabled=busy;}
  function accept(data,preserve=false){const p=data.profile;if(!p||typeof p.name!=='string'||typeof p.email!=='string'||typeof p.createdAt!=='string'||!Number.isFinite(Date.parse(p.createdAt)))throw Error('Saved profile details could not be read.');const draft=input.value,keep=preserve&&dirty();baseName=p.name;loaded=true;if(!keep)input.value=p.name;onProfile(p);return keep;}
  async function load(){if(busy)return;const current=epoch;busy=true;status.textContent='Loading saved profile details…';controls();try{const data=await api('/profile');if(current!==epoch)return;const keep=accept(data,true);status.textContent=keep?'Saved details refreshed. Your draft name is kept; review it before saving.':'Saved profile details loaded.';}catch(e){if(current===epoch&&!onError(e)){loaded=false;status.textContent=(e.message||'Could not load profile.')+' Refresh before saving.';}}finally{if(current===epoch){busy=false;controls();}}}
  form.addEventListener('submit',async event=>{event.preventDefault();if(busy||!loaded||!dirty()||!valid())return;const current=epoch,body={name:input.value.trim(),expectedName:baseName};busy=true;status.textContent='Saving your name…';controls();try{const data=await api('/profile','PATCH',body);if(current!==epoch)return;accept(data);status.textContent='Name saved to your account.';}catch(e){if(current===epoch&&!onError(e)){if(e.status===409)loaded=false;status.textContent=e.message||'The name could not be saved. Your draft is kept.';}}finally{if(current===epoch){busy=false;controls();}}});
  input.addEventListener('input',()=>{controls();status.textContent=dirty()?'Unsaved name. Choose Save name to update your account.':'';});refresh.addEventListener('click',load);
  addEventListener('beforeunload',event=>{if(dirty()||busy){event.preventDefault();event.returnValue='';}});controls();
  return {refresh:load,ensureLoaded(){if(!loaded)return load();},hasDraft:()=>dirty(),clear(){epoch++;busy=false;loaded=false;baseName='';input.value='';status.textContent='';controls();}};
 }};
})();
