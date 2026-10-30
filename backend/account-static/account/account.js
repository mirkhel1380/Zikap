'use strict';
(()=>{
 const $=id=>document.getElementById(id);
 const names={audit:'Technical SEO Starter',keywords:'Keyword Research Starter',onpage:'On-page SEO Starter',bundle:'SEO Starter Bundle'};
 const scopes={audit:'$29 USD · One website, up to 5 public URLs. A prioritized technical findings report and action checklist.',keywords:'$19 USD · 25 curated keyword ideas for one topic, language and market; mapped to up to 5 pages. No live volume or difficulty data.',onpage:'$39 USD · Proposed metadata, content and internal-link improvements for up to 3 existing pages. No publishing or full article writing.',bundle:'$79 USD · Technical review of up to 5 URLs, 25 keyword ideas with a page map, and on-page briefs for up to 3 pages on the same website.'};
 const states={requested:'Request received',accepted:'Accepted',in_progress:'In progress',delivered:'Report delivered',revision_requested:'Revision requested',declined:'Declined'};
 let user=null,epoch=0,listVersion=0,cursor=null,pending=null,recoveryCode='';
 const projects=new Map();
 const makeUUID=()=>{if(typeof crypto.randomUUID==='function')return crypto.randomUUID();const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;const hex=[...bytes].map(v=>v.toString(16).padStart(2,'0')).join('');return hex.slice(0,8)+'-'+hex.slice(8,12)+'-'+hex.slice(12,16)+'-'+hex.slice(16,20)+'-'+hex.slice(20);};
 const node=(tag,value,cls)=>{const n=document.createElement(tag);n.textContent=value;if(cls)n.className=cls;return n;};
 const button=(value,cls='btn ghost')=>{const b=node('button',value,cls);b.type='button';return b;};
 const reveal=el=>{el.focus({preventScroll:true});el.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});};
 const download=(filename,content)=>{const url=URL.createObjectURL(new Blob([content],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 async function api(path,method='GET',body){
  const response=await fetch('/account-api'+path,{method,credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});
  let data;try{data=await response.json();}catch{throw new Error('The account service could not respond. Please try again.');}
  if(!response.ok){const e=new Error(data.error||'The account service is unavailable.');e.status=response.status;throw e;}return data;
 }
 function errorText(e){return e.name==='TimeoutError'?'The request timed out. Please try again.':e.message||'Could not connect. Please try again.';}
 function authMode(mode){
  ['login','register','recover'].forEach(name=>{$(name+'-form').hidden=name!==mode;});
  $('show-login').setAttribute('aria-pressed',String(mode==='login'));$('show-register').setAttribute('aria-pressed',String(mode==='register'));
 }
 function clearAccount(message){
  user=null;epoch++;listVersion++;pending=null;cursor=null;projects.clear();recoveryCode='';$('recovery-key').value='';$('recovery-box').hidden=true;$('dashboard').hidden=true;$('logout').hidden=true;$('auth').hidden=false;
  $('project-list').replaceChildren();$('project-detail').replaceChildren();$('project-detail').hidden=true;
  document.querySelectorAll('input[type=password]').forEach(input=>{input.value='';});$('app-status').textContent=message;authMode('login');
 }
 function sessionError(e){if(e.status===401){clearAccount('Your session ended. Sign in to continue.');return true;}return false;}
 function showRecovery(code){
  recoveryCode=code;$('recovery-key').value=code;$('recovery-key').type='password';$('toggle-recovery').textContent='Show recovery code';$('toggle-recovery').setAttribute('aria-pressed','false');$('recovery-saved').checked=false;$('close-recovery').disabled=true;$('recovery-message').textContent='';$('recovery-box').hidden=false;reveal($('recovery-box'));
 }
 async function enter(data){
  user=data.user;epoch++;pending=null;$('auth').hidden=true;$('dashboard').hidden=false;$('logout').hidden=false;$('app-status').textContent='Signed in. Your projects are available below.';
  $('greeting').textContent='Welcome, '+user.name.split(/\s+/)[0]+'.';$('profile-line').textContent=user.name+' · '+user.email;
  if(data.recoveryKey)showRecovery(data.recoveryKey);await loadProjects();
 }
 function scope(){const value=$('project-package').value;$('package-scope').textContent=scopes[value];$('project-page-limit').textContent=value==='onpage'?'(up to 3)':'(up to 5)';$('project-pages').required=value!=='keywords';$('project-topic').required=['keywords','bundle'].includes(value);}
 const initialPackage=new URLSearchParams(location.search).get('package');if(Object.hasOwn(names,initialPackage))$('project-package').value=initialPackage;scope();$('project-package').addEventListener('change',scope);
 ['login','register'].forEach(mode=>$('show-'+mode).addEventListener('click',()=>authMode(mode)));$('show-recover').addEventListener('click',()=>authMode('recover'));$('back-login').addEventListener('click',()=>authMode('login'));
 for(const mode of ['login','register','recover']){
  $(mode+'-form').addEventListener('submit',async event=>{
   event.preventDefault();const submit=event.currentTarget.querySelector('button[type=submit]'),message=$(mode+'-message');submit.disabled=true;message.textContent=mode==='register'?'Creating your account…':'Checking your details…';
   const body={email:$(mode+'-email').value,password:$(mode+'-password').value};
   if(mode==='register'){body.name=$('register-name').value;body.consent=$('register-consent').checked;}
   if(mode==='recover')body.recoveryKey=$('recover-code').value;
   try{const data=await api('/'+mode,'POST',body);message.textContent='';await enter(data);}
   catch(e){message.textContent=errorText(e)+(mode==='register'&&!e.status?' If a request may have reached the server, try signing in before registering again.':'');}
   finally{submit.disabled=false;$(mode+'-password').value='';if(mode==='recover')$('recover-code').value='';}
  });
 }
 $('logout').addEventListener('click',async()=>{const b=$('logout');b.disabled=true;try{await api('/logout','POST',{});clearAccount('Signed out. Your projects remain in your account.');}catch(e){$('app-status').textContent='Could not confirm sign-out. '+errorText(e);}finally{b.disabled=false;}});
 $('toggle-recovery').addEventListener('click',()=>{const show=$('recovery-key').type==='password';$('recovery-key').type=show?'text':'password';$('toggle-recovery').textContent=show?'Hide recovery code':'Show recovery code';$('toggle-recovery').setAttribute('aria-pressed',String(show));});
 $('download-recovery').addEventListener('click',()=>{if(!recoveryCode)return;download('zikap-account-recovery.txt','Zikap account recovery\nEmail: '+user.email+'\nRecovery code: '+recoveryCode+'\nSign in: https://zikap.m-mirkhel20.workers.dev/account/\n\nKeep this file private. This code can replace your password. Only the latest code works.');$('recovery-message').textContent='Download requested. Check your browser downloads and keep the file private.';});
 $('recovery-saved').addEventListener('change',()=>{$('close-recovery').disabled=!$('recovery-saved').checked;});
 $('close-recovery').addEventListener('click',()=>{if(!$('recovery-saved').checked)return;recoveryCode='';$('recovery-key').value='';$('recovery-box').hidden=true;$('projects').scrollIntoView({block:'start'});});
 function renderProjects(){
  const list=$('project-list');list.replaceChildren();let active=0,delivered=0;
  for(const order of projects.values()){
   if(['requested','accepted','in_progress','revision_requested'].includes(order.status))active++;if(order.report)delivered++;
   const card=node('article','','project-card');card.append(node('span',states[order.status]||order.status,'status'),node('h3',names[order.packageId]||order.packageId),node('p',order.website),node('p','Requested '+new Date(order.createdAt).toLocaleDateString()+' · $'+order.price+' USD'));
   const open=button('View project & report');open.addEventListener('click',()=>openProject(order.id));card.append(open);list.append(card);
  }
  if(!projects.size)list.append(node('p','No projects yet. Request a package below or link an earlier receipt.','empty'));
  $('project-count').textContent=String(projects.size);$('active-count').textContent=String(active);$('report-count').textContent=String(delivered);$('more-projects').hidden=!cursor;
 }
 async function loadProjects(more=false){
  if(!user)return;const version=++listVersion,currentEpoch=epoch;$('projects-message').textContent='Loading your projects…';$('refresh-projects').disabled=true;$('more-projects').disabled=true;
  try{const data=await api('/orders'+(more&&cursor?'?before='+encodeURIComponent(cursor):''));if(currentEpoch!==epoch||version!==listVersion)return;if(!more)projects.clear();for(const order of data.orders)projects.set(order.id,order);cursor=data.next;renderProjects();$('projects-message').textContent='Your project list is up to date.';}
  catch(e){if(currentEpoch===epoch&&!sessionError(e))$('projects-message').textContent=errorText(e);}
  finally{if(currentEpoch===epoch){$('refresh-projects').disabled=false;$('more-projects').disabled=false;}}
 }
 $('refresh-projects').addEventListener('click',()=>loadProjects());$('more-projects').addEventListener('click',()=>loadProjects(true));
 function detail(order){
  const box=$('project-detail');box.replaceChildren(node('span',states[order.status]||order.status,'status'),node('h2',names[order.packageId]||order.packageId),node('p','Order '+order.id,'tiny'),node('p','Last updated '+new Date(order.updatedAt).toLocaleString(),'tiny'));
  const info=node('dl','');for(const [title,value] of [['Website',order.website],['Scope',scopes[order.packageId]||''],['Pages',(order.pages||[]).join('\n')||'No pages supplied'],['Topic',order.topic||'Not supplied'],['Language',order.language],['Market',order.market],['Your goals',order.goals]]){info.append(node('dt',title),node('dd',value||''));}box.append(info);
  box.append(node('h3','Latest project update'),node('p',order.note||'Your request awaits review. Acceptance, scope and timing still need agreement. No payment was collected.'));
  if(order.report){box.append(node('h3','Your specialist report'),node('pre',order.report,'report'));const save=button('Download report','btn');save.addEventListener('click',()=>download('zikap-report-'+order.id+'.txt',order.report));box.append(save);}
  if(order.revisionNote)box.append(node('h3','Your clarification / revision request'),node('p',order.revisionNote));
  if(order.status==='delivered'&&!order.revisionUsed){
   const form=document.createElement('form'),label=node('label','Request one clarification / revision'),note=document.createElement('textarea'),submit=node('button','Send revision request','btn ghost'),message=node('p','');label.htmlFor='revision-note';note.id='revision-note';note.required=true;note.maxLength=2000;note.placeholder='Describe what needs clarification within the original agreed scope.';submit.type='submit';message.setAttribute('role','status');form.append(label,note,submit,message);form.addEventListener('submit',async event=>{event.preventDefault();submit.disabled=true;try{await api('/orders/'+order.id+'/revision','POST',{note:note.value});await loadProjects();await openProject(order.id);}catch(e){if(!sessionError(e))message.textContent=errorText(e);submit.disabled=false;}});box.append(form);
  }else if(order.revisionUsed)box.append(node('p','Your one scoped clarification/revision has been requested. Follow its update here.','tiny'));
  box.hidden=false;reveal(box);
 }
 async function openProject(id){const currentEpoch=epoch;$('projects-message').textContent='Opening project…';try{const data=await api('/orders/'+id);if(currentEpoch!==epoch)return;projects.set(id,data.order);renderProjects();detail(data.order);$('projects-message').textContent='Project loaded.';}catch(e){if(currentEpoch===epoch&&!sessionError(e))$('projects-message').textContent=errorText(e);}}
 $('project-form').addEventListener('submit',async event=>{
  event.preventDefault();const submit=event.currentTarget.querySelector('button[type=submit]'),currentEpoch=epoch;submit.disabled=true;$('project-message').textContent='Submitting your request…';
  const body={packageId:$('project-package').value,website:$('project-website').value,pages:$('project-pages').value,topic:$('project-topic').value,language:$('project-language').value,market:$('project-market').value,goals:$('project-goals').value,consent:$('project-consent').checked,company:''},fingerprint=JSON.stringify(body);
  try{if(!pending||pending.fingerprint!==fingerprint)pending={fingerprint,id:makeUUID()};const data=await api('/orders','POST',{...body,requestId:pending.id});if(currentEpoch!==epoch)return;pending=null;$('project-form').reset();$('project-package').value=body.packageId;scope();$('project-message').textContent='Request received and saved to your account. Check your projects for acceptance and timing. No payment was collected.';await loadProjects();if(currentEpoch===epoch)detail(data.order);}
  catch(e){if(currentEpoch===epoch&&!sessionError(e))$('project-message').textContent=errorText(e)+(!e.status||e.status>=500?' Submission is not confirmed. Refresh My projects before trying again. Retrying unchanged details on this page reuses the same project reference.':'');}
  finally{submit.disabled=false;}
 });
 $('receipt-file').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>12000)throw new Error('Choose a Zikap receipt text file smaller than 12 KB.');const content=await file.text(),id=content.match(/^Order ID: ([a-f0-9-]{36})\r?$/m)?.[1],key=content.match(/^Private receipt key: ([a-f0-9-]{72})\r?$/m)?.[1];if(!id||!key)throw new Error('The file needs an Order ID and private receipt key.');$('link-id').value=id;$('link-key').value=key;$('link-message').textContent='Receipt opened. Choose Link project to connect it to this account.';}catch(e){$('link-message').textContent=errorText(e);}finally{event.target.value='';}});
 $('link-form').addEventListener('submit',async event=>{event.preventDefault();const submit=event.currentTarget.querySelector('button[type=submit]'),currentEpoch=epoch;submit.disabled=true;$('link-message').textContent='Checking your original receipt…';try{const data=await api('/orders/attach','POST',{orderId:$('link-id').value.trim(),receiptKey:$('link-key').value.trim()});if(currentEpoch!==epoch)return;$('link-key').value='';$('link-id').value='';$('link-message').textContent='Project linked. It is now available in My projects.';await loadProjects();if(currentEpoch===epoch)detail(data.order);}catch(e){if(currentEpoch===epoch&&!sessionError(e))$('link-message').textContent=errorText(e);}finally{submit.disabled=false;}});
 for(const kind of ['password','recovery'])$(kind+'-form').addEventListener('submit',async event=>{
  event.preventDefault();const submit=event.currentTarget.querySelector('button[type=submit]'),message=$(kind==='password'?'password-message':'code-message'),input=$(kind==='password'?'current-password':'recovery-password');submit.disabled=true;$('logout').disabled=true;message.textContent='Updating account security…';
  try{const data=await api(kind==='password'?'/password':'/recovery-code','POST',{currentPassword:input.value,...(kind==='password'?{newPassword:$('new-password').value}:{})});message.textContent=kind==='password'?'Password updated. Save your replacement recovery code.':'Your previous recovery code has been replaced.';showRecovery(data.recoveryKey);}
  catch(e){message.textContent=errorText(e);}finally{input.value='';if(kind==='password')$('new-password').value='';submit.disabled=false;$('logout').disabled=false;}
 });
 async function boot(){
  try{const status=await api('/status');if(!status.ready){$('app-status').textContent='Customer accounts are being prepared. Please return shortly. The free tools remain available.';return;}try{await enter(await api('/session'));}catch(e){if(e.status===401){clearAccount('Sign in or create an account to manage your projects.');}else throw e;}}
  catch(e){$('app-status').textContent=errorText(e)+' Please return shortly.';}
 }
 boot();
})();
