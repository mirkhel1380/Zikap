'use strict';
(()=>{
 const el=(tag,text,cls)=>{const n=document.createElement(tag);n.textContent=text;if(cls)n.className=cls;return n;};
 window.ZikapSessions={mount(host,{api,onError}){
  let epoch=0,loaded=false,busy=false,others=false;
  host.className='panel session-panel';
  const heading=el('h3','Signed-in sessions'),intro=el('p','Review sign-in and expiry dates for your account. Up to five sessions can stay signed in. Device names and activity history are not collected.'),refresh=el('button','Refresh sessions','btn ghost'),list=el('ul','','session-list'),status=el('p','','tiny'),form=el('form',''),label=el('label','Confirm your current password'),input=document.createElement('input'),submit=el('button','Sign out other sessions','btn');
  refresh.type='button';status.setAttribute('role','status');label.htmlFor='sessions-password';input.id=label.htmlFor;input.type='password';input.autocomplete='current-password';input.minLength=15;input.maxLength=128;input.required=true;submit.type='submit';
  form.append(el('h4','Close your other sessions'),el('p','This browser stays signed in. Other sessions lose access on their next request. Your password stays the same.'),label,input,submit);host.append(heading,intro,refresh,status,list,form);
  const controls=()=>{refresh.disabled=busy;input.disabled=busy;submit.disabled=busy||!loaded||!others||input.value.length<15||input.value.length>128;};
  function render(data){
   if(!Array.isArray(data.sessions)||data.sessions.length>5||!data.sessions.every(s=>typeof s.current==='boolean'&&Number.isInteger(s.createdAt)&&Number.isInteger(s.expiresAt)))throw new Error('Session dates could not be loaded. Refresh to try again.');
   list.replaceChildren();others=data.sessions.some(s=>!s.current);loaded=true;
   for(const s of data.sessions){const row=el('li','','session-entry');row.append(el('strong',s.current?'This session':'Another session'));
    for(const [title,time] of [['Signed in',s.createdAt],['Expires',s.expiresAt]]){const date=el('time',new Date(time*1000).toLocaleString());date.dateTime=new Date(time*1000).toISOString();const line=el('div',title+': ');line.append(date);row.append(line);}list.append(row);}
   status.textContent=data.sessions.length+' active session'+(data.sessions.length===1?'':'s')+' at the last refresh. '+(!others?'No other sessions were found.':'');
  }
  async function run(revoke=false){if(busy)return;const version=epoch;busy=true;status.textContent=revoke?'Signing out other sessions…':'Loading session dates…';controls();
   try{const data=await api(revoke?'/sessions/revoke-others':'/sessions',revoke?'POST':'GET',revoke?{currentPassword:input.value}:undefined);if(version!==epoch)return;render(data);if(revoke)status.textContent='Other sessions signed out. This browser stays signed in. Refresh to check for later sign-ins.';}
   catch(e){if(version!==epoch)return;if(onError(e))return;loaded=false;status.textContent=(e.message||'Could not load sessions.')+' Refresh before trying again. Previously shown dates may be out of date.';}
   finally{if(version===epoch){input.value='';busy=false;controls();}}
  }
  input.addEventListener('input',controls);refresh.addEventListener('click',()=>run());form.addEventListener('submit',e=>{e.preventDefault();if(!submit.disabled)run(true);});controls();
  return {refresh:()=>run(),clear(){epoch++;loaded=false;busy=false;others=false;input.value='';list.replaceChildren();status.textContent='';controls();},ensureLoaded(){if(!loaded)run();}};
 }};
})();
