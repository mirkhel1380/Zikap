'use strict';
(()=>{
 const $=id=>document.getElementById(id);
 const names={audit:'Technical SEO Starter',keywords:'Keyword Research Starter',onpage:'On-page SEO Starter',bundle:'SEO Starter Bundle'};
 const scopes={audit:'$29 USD · One website, up to 5 public URLs. A prioritized technical findings report and action checklist.',keywords:'$19 USD · 25 curated keyword ideas for one topic, language and market; mapped to up to 5 pages. No live volume or difficulty data.',onpage:'$39 USD · Proposed metadata, content and internal-link improvements for up to 3 existing pages. No publishing or full article writing.',bundle:'$79 USD · Technical review of up to 5 URLs, 25 keyword ideas with a page map, and on-page briefs for up to 3 pages on the same website.'};
 const states={requested:'Request received',accepted:'Accepted',in_progress:'In progress',delivered:'Report delivered',revision_requested:'Revision requested',declined:'Declined'};
 let user=null,epoch=0,listVersion=0,cursor=null,pending=null,recoveryCode='',paymentTestMode=null,detailVersion=0;
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
  document.title='My account | Zikap';
  document.body.classList.remove('signed-in','sidebar-open');document.dispatchEvent(new Event('zikap-session-cleared'));user=null;epoch++;listVersion++;detailVersion++;pending=null;cursor=null;projects.clear();recoveryCode='';$('recovery-key').value='';$('recovery-box').hidden=true;$('dashboard').hidden=true;$('logout').hidden=true;$('auth').hidden=false;
  for(const id of ['recent-projects','recent-updates','report-library','status-breakdown'])$(id).replaceChildren();$('account-name').textContent='My account';$('account-avatar').textContent='Z';$('greeting').textContent='Welcome back.';$('profile-line').textContent='';$('project-search').value='';$('project-filter').value='all';$('project-results').textContent='';$('project-list').replaceChildren();$('project-detail').replaceChildren();$('project-detail').hidden=true;
  document.querySelectorAll('input[type=password]').forEach(input=>{input.value='';});$('app-status').textContent=message;authMode('login');
 }
 function sessionError(e){if(e.status===401){clearAccount('Your session ended. Sign in to continue.');return true;}return false;}
 function showRecovery(code){
  recoveryCode=code;$('recovery-key').value=code;$('recovery-key').type='password';$('toggle-recovery').textContent='Show recovery code';$('toggle-recovery').setAttribute('aria-pressed','false');$('recovery-saved').checked=false;$('close-recovery').disabled=true;$('recovery-message').textContent='';$('recovery-box').hidden=false;reveal($('recovery-box'));
 }
 async function enter(data){
  document.body.classList.add('signed-in');user=data.user;epoch++;pending=null;$('auth').hidden=true;$('dashboard').hidden=false;$('logout').hidden=false;$('app-status').textContent='Signed in. Your projects are available below.';
  $('account-name').textContent=user.name;$('account-avatar').textContent=user.name.trim().slice(0,1).toUpperCase();$('greeting').textContent='Welcome back, '+user.name.split(/\s+/)[0]+'.';setView();$('profile-line').textContent=user.name+' · '+user.email;
  if(data.recoveryKey)showRecovery(data.recoveryKey);await loadProjects();
  const params=new URLSearchParams(location.search),id=params.get('order');
  if(params.get('payment')==='return'&&/^[a-f0-9-]{36}$/.test(id||'')){try{await api('/orders/'+id+'/payment-status','POST',{});await loadProjects();await openProject(id);}catch(e){$('projects-message').textContent='Check your project payment status. '+errorText(e);}}
  if(params.get('payment')==='cancel')$('projects-message').textContent='Checkout was closed. Open your project to check its current payment status.';
 }
 function requestReadiness(){
  const items=[['Package selected',!!$('project-package').value],['Website and scoped pages',!!$('project-website').value&&$('project-website').checkValidity()&&(!$('project-pages').required||!!$('project-pages').value.trim())],['Topic and target audience',!!$('project-language').value.trim()&&!!$('project-market').value.trim()&&(!$('project-topic').required||!!$('project-topic').value.trim())],['Goals and consent',!!$('project-goals').value.trim()&&$('project-consent').checked]];
  const box=$('request-readiness');box.replaceChildren();for(const [label,ready]of items){const row=node('div','','readiness-item'+(ready?' ready':''));row.append(node('span',ready?'Done':'To do','readiness-state'),node('span',label));box.append(row);}
 }
 $('project-form').addEventListener('input',requestReadiness);$('project-form').addEventListener('change',requestReadiness);
 function scope(){const value=$('project-package').value;$('package-scope').textContent=scopes[value];$('project-page-limit').textContent=value==='onpage'?'(up to 3)':'(up to 5)';$('project-pages').required=value!=='keywords';$('project-topic').required=['keywords','bundle'].includes(value);requestReadiness();}
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
 $('logout').addEventListener('click',async()=>{const b=$('logout');b.disabled=true;$('workspace-logout').disabled=true;try{await api('/logout','POST',{});clearAccount('Signed out. Your projects remain in your account.');}catch(e){$('app-status').textContent='Could not confirm sign-out. '+errorText(e);}finally{b.disabled=false;$('workspace-logout').disabled=false;}});
 $('toggle-recovery').addEventListener('click',()=>{const show=$('recovery-key').type==='password';$('recovery-key').type=show?'text':'password';$('toggle-recovery').textContent=show?'Hide recovery code':'Show recovery code';$('toggle-recovery').setAttribute('aria-pressed',String(show));});
 $('download-recovery').addEventListener('click',()=>{if(!recoveryCode)return;download('zikap-account-recovery.txt','Zikap account recovery\nEmail: '+user.email+'\nRecovery code: '+recoveryCode+'\nSign in: https://zikap.m-mirkhel20.workers.dev/account/\n\nKeep this file private. This code can replace your password. Only the latest code works.');$('recovery-message').textContent='Download requested. Check your browser downloads and keep the file private.';});
 $('recovery-saved').addEventListener('change',()=>{$('close-recovery').disabled=!$('recovery-saved').checked;});
 $('close-recovery').addEventListener('click',()=>{if(!$('recovery-saved').checked)return;recoveryCode='';$('recovery-key').value='';$('recovery-box').hidden=true;setView('overview');$('overview').focus();});
 const views={performance:'Search performance',overview:'Overview',projects:'My projects',reports:'Report library','new-project':'New request','free-tools':'SEO tools','link-project':'Link a receipt','account-security':'Account & security'};
 function setView(preferred){
  if(!user)return;const key=preferred||location.hash.slice(1),view=Object.hasOwn(views,key)?key:'overview';
  document.querySelectorAll('.workspace-view').forEach(section=>{section.hidden=section.id!==view;});
  document.querySelectorAll('[data-view]').forEach(link=>{if(link.dataset.view===view)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
  if(preferred)history.replaceState(null,'','#'+view);$('view-title').textContent=views[view];document.title=views[view]+' | Zikap';document.body.classList.remove('sidebar-open');$('workspace-menu').setAttribute('aria-expanded','false');
 }
 addEventListener('hashchange',()=>{setView();if(user){const key=location.hash.slice(1);if(Object.hasOwn(views,key))$(key).focus({preventScroll:true});}});
 document.querySelectorAll('[data-view]').forEach(link=>link.addEventListener('click',()=>{if(location.hash===link.getAttribute('href'))setView(link.dataset.view);}));
 $('workspace-menu').addEventListener('click',()=>{const open=document.body.classList.toggle('sidebar-open');$('workspace-menu').setAttribute('aria-expanded',String(open));});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'){document.body.classList.remove('sidebar-open');$('workspace-menu').setAttribute('aria-expanded','false');}});
 $('workspace-logout').addEventListener('click',()=>{if(!$('logout').disabled)$('logout').click();});
 function websiteLabel(order){try{return new URL(order.website).hostname;}catch{return order.website;}}
 function projectRow(order,compact=false){
  const card=node('article','','project-card'+(compact?' compact':'')),identity=node('div','','project-identity'),mark=node('span',(websiteLabel(order)||'W').slice(0,1).toUpperCase(),'website-mark'),text=node('div','');
  text.append(node('h3',websiteLabel(order)),node('p',names[order.packageId]||order.packageId));identity.append(mark,text);
  const status=node('span',states[order.status]||order.status,'status status-'+order.status),meta=node('div','','project-meta');meta.append(node('strong','$'+order.price+' USD'),node('span',new Date(order.createdAt).toLocaleDateString(undefined,{month:'short',day:'numeric'})));
  const open=button('View project');open.setAttribute('aria-label','View project for '+websiteLabel(order));open.addEventListener('click',()=>openProject(order.id));card.append(identity,status,meta,open);return card;
 }
 function renderOverview(){
  const all=[...projects.values()],recent=$('recent-projects'),updates=$('recent-updates'),library=$('report-library');recent.replaceChildren();updates.replaceChildren();library.replaceChildren();
  all.slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,4).forEach(order=>recent.append(projectRow(order,true)));
  const reports=all.filter(o=>o.report);for(const order of reports){const card=node('article','','report-card');card.append(node('span','SPECIALIST REPORT','eyebrow'),node('h2',names[order.packageId]||order.packageId),node('p',order.website),node('span',states[order.status]||order.status,'status status-'+order.status),node('p','Updated '+new Date(order.updatedAt).toLocaleDateString(),'tiny'));const actions=node('div','','actions'),read=button('Read report'),save=button('Download report','btn');read.addEventListener('click',()=>openProject(order.id));save.addEventListener('click',()=>download('zikap-report-'+order.id+'.txt',order.report));actions.append(read,save);card.append(actions);library.append(card);}
  all.slice().sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).slice(0,3).forEach(order=>{const item=node('article','','update-item'),dot=node('span','','update-dot'),content=node('div','');content.append(node('strong',websiteLabel(order)),node('p',order.note||nextStep(order)),node('small',(states[order.status]||order.status)+' · '+new Date(order.updatedAt).toLocaleDateString()));item.append(dot,content);updates.append(item);});
  const empty=(title,text)=>{const box=node('div','','dashboard-empty');box.append(node('span','','empty-emblem'),node('h3',title),node('p',text));const link=node('a','Start a project','btn');link.href='#new-project';box.append(link);return box;};
  if(!all.length){recent.append(empty('Your first project starts here.','Choose a focused package and tell us what you want to improve.'));updates.append(node('p','Project updates will appear after you submit a request.','empty-copy'));}
  if(!reports.length)library.append(empty('A home for your SEO reports.','Your specialist reports will appear here when added to a project.'));
  $('review-count').textContent=String(all.filter(o=>o.status==='requested').length);const percentage=all.length?Math.round(reports.length/all.length*100):0;$('report-percentage').textContent=percentage+'%';$('report-ring').style.setProperty('--report-percent',percentage+'%');
  const breakdown=$('status-breakdown');breakdown.replaceChildren();for(const [key,label]of [['requested','Awaiting review'],['active','Accepted / in progress'],['delivered','Delivered'],['declined','Declined']]){const count=all.filter(o=>key==='active'?['accepted','in_progress','revision_requested'].includes(o.status):o.status===key).length,row=node('div','','breakdown-row');row.append(node('span',label),node('strong',String(count)));breakdown.append(row);}
 }
 function nextStep(order){
  if(order.status==='requested')return 'We will review your website and confirm scope and timing. Check this project for an update.';
  if(order.status==='accepted')return order.payment?.available&&!['paid','partially_refunded','refunded'].includes(order.payment.status)?'Review the agreed scope and timing, then use the payment section below.':'Your request is accepted. Check the latest update for agreed timing and the next arrangement.';
  if(order.status==='in_progress')return 'Your specialist review is in progress. Check the latest update for timing and any questions.';
  if(order.status==='revision_requested')return 'Your clarification request is with the specialist. The current report remains available while you wait for an update.';
  if(order.status==='delivered')return order.revisionUsed?'Read the latest report and update. Your included clarification has already been requested.':'Read and download your report. You can request one clarification within the original agreed scope.';
  return 'Read the latest update for the reason this request was declined. A different scope needs a new request.';
 }
 function renderProjects(){
  const list=$('project-list');list.replaceChildren();let active=0,delivered=0,shown=0;const query=$('project-search').value.trim().toLowerCase(),filter=$('project-filter').value;
  for(const order of projects.values()){
   if(['requested','accepted','in_progress','revision_requested'].includes(order.status))active++;if(order.report)delivered++;
   const isActive=['requested','accepted','in_progress','revision_requested'].includes(order.status);
   if(query&&![order.website,names[order.packageId],order.topic,order.id].join(' ').toLowerCase().includes(query))continue;
   if(filter!=='all'&&!(filter==='active'?isActive:filter==='reports'?!!order.report:order.status===filter))continue;
   shown++;
   list.append(projectRow(order));
  }
  if(!projects.size)list.append(node('p','No projects yet. Choose New request to start a project, or link an earlier receipt.','empty'));
  if(projects.size&&!shown)list.append(node('p','No loaded projects match these filters. Clear filters or load older projects.','empty'));
  $('project-results').textContent='Showing '+shown+' of '+projects.size+' loaded projects'+(cursor?'. Older projects are available below.':'.');
  renderOverview();$('project-count').textContent=String(projects.size);$('active-count').textContent=String(active);$('report-count').textContent=String(delivered);$('more-projects').hidden=!cursor;
 }
 async function loadProjects(more=false){
  if(!user)return;const version=++listVersion,currentEpoch=epoch;$('projects-message').textContent='Loading your projects…';$('refresh-projects').disabled=true;$('more-projects').disabled=true;$('workspace-refresh').disabled=true;$('workspace-sync').textContent='Updating projects…';
  try{const data=await api('/orders'+(more&&cursor?'?before='+encodeURIComponent(cursor):''));if(currentEpoch!==epoch||version!==listVersion)return;if(!more)projects.clear();for(const order of data.orders)projects.set(order.id,order);cursor=data.next;renderProjects();$('workspace-sync').textContent='Projects up to date';$('projects-message').textContent='Your project list is up to date.';}
  catch(e){if(currentEpoch===epoch&&!sessionError(e)){$('projects-message').textContent=errorText(e);$('workspace-sync').textContent='Could not refresh projects. Try Refresh.';}}
  finally{if(currentEpoch===epoch){$('refresh-projects').disabled=false;$('more-projects').disabled=false;$('workspace-refresh').disabled=false;}}
 }
 $('workspace-refresh').addEventListener('click',()=>loadProjects());
 $('project-search').addEventListener('input',renderProjects);$('project-filter').addEventListener('change',renderProjects);$('clear-project-filters').addEventListener('click',()=>{$('project-search').value='';$('project-filter').value='all';renderProjects();$('project-search').focus();});
 $('refresh-projects').addEventListener('click',()=>loadProjects());$('more-projects').addEventListener('click',()=>loadProjects(true));
 function mountActionPlan(host,order){
  const currentEpoch=epoch,alive=()=>currentEpoch===epoch&&host.isConnected;
  let tasks=[],editing=null,creation=null,busy=false;
  const labels={planned:'Planned',doing:'In progress',done:'Done',archived:'Archived'},priorityLabels={high:'High priority',medium:'Medium priority',low:'Low priority'};
  const heading=node('div','','surface-heading'),headingText=node('div',''),reload=button('Refresh actions');headingText.append(node('h3','Your SEO action plan'),node('p','Turn your report recommendations into work you can track.'));heading.append(headingText,reload);
  const intro=node('p','These are your manually managed tasks. Saving or marking a task done does not change your website, verify a fix or change the specialist’s project status.','tiny');
  const summary=node('div','','action-summary'),count=node('strong','0 of 0 completed'),bar=document.createElement('progress');bar.max=1;bar.value=0;bar.setAttribute('aria-label','Completed actions');summary.append(count,bar);
  const message=node('p','Loading saved actions…');message.setAttribute('role','status');
  const layout=node('div','','action-plan-layout'),listSide=node('div',''),filters=node('div','','action-filters'),filter=document.createElement('select'),search=document.createElement('input'),list=node('div','','action-list');
  search.type='search';search.placeholder='Find an action';search.maxLength=200;search.setAttribute('aria-label','Find an action');filter.setAttribute('aria-label','Action status');for(const [value,label]of [['active','All active actions'],...Object.entries(labels)]){const option=node('option',label);option.value=value;filter.append(option);}filters.append(search,filter);listSide.append(filters,list);
  const form=document.createElement('form');form.className='action-editor';const formTitle=node('h4','Add an action'),inputs={};
  function field(key,label,tag,max){const input=document.createElement(tag),id='action-'+key+'-'+order.id,l=node('label',label);input.id=id;l.htmlFor=id;if(max)input.maxLength=max;inputs[key]=input;form.append(l,input);return input;}
  form.append(formTitle);field('title','Action title','input',200).required=true;field('pageUrl','Page URL (optional)','input',500).type='url';inputs.pageUrl.placeholder=order.website;
  for(const [key,label,choices]of [['priority','Priority',priorityLabels],['status','Status',labels]]){const select=field(key,label,'select');for(const [value,text]of Object.entries(choices)){const option=node('option',text);option.value=value;select.append(option);}}
  field('notes','Your notes (optional)','textarea',2000).rows=3;const controls=node('div','','actions'),save=node('button','Save action','btn'),cancel=button('Cancel edit');save.type='submit';cancel.hidden=true;controls.append(save,cancel);form.append(controls,node('p','Changes are saved only when you choose Save action. Up to 100 tasks per project, including archived tasks.','tiny'));
  layout.append(listSide,form);const exportButton=button('Download action plan'),footer=node('div','','actions');footer.append(exportButton);host.append(heading,intro,summary,message,layout,footer);
  function body(){return Object.fromEntries(Object.entries(inputs).map(([key,input])=>[key,input.value.trim()]));}
  function reset(){editing=null;creation=null;form.reset();inputs.priority.value='medium';inputs.status.value='planned';formTitle.textContent='Add an action';save.textContent='Save action';cancel.hidden=true;}
  function lock(value){busy=value;for(const input of Object.values(inputs))input.disabled=value;save.disabled=value;reload.disabled=value;cancel.disabled=value;list.querySelectorAll('button').forEach(b=>b.disabled=value);}
  function failure(error){if(!alive())return;if(!sessionError(error))message.textContent=errorText(error);}
  async function change(task,status){if(busy)return;lock(true);message.textContent='Saving action status…';try{const result=await api('/orders/'+order.id+'/actions/'+task.id,'PATCH',{...task,status});if(!alive())return;tasks=tasks.map(t=>t.id===task.id?result.action:t);render();message.textContent='Action status saved to your account.';}catch(e){failure(e);}finally{if(alive())lock(false);}}
  function render(){
   const active=tasks.filter(t=>t.status!=='archived'),done=active.filter(t=>t.status==='done').length;count.textContent=done+' of '+active.length+' active actions completed';bar.max=active.length||1;bar.value=done;exportButton.disabled=!tasks.length;
   const query=search.value.trim().toLowerCase(),visible=tasks.filter(t=>(filter.value==='active'?t.status!=='archived':t.status===filter.value)&&[t.title,t.pageUrl,t.notes].join(' ').toLowerCase().includes(query)).sort((a,b)=>({high:0,medium:1,low:2}[a.priority]-{high:0,medium:1,low:2}[b.priority])||a.createdAt.localeCompare(b.createdAt));list.replaceChildren();
   for(const task of visible){const card=node('article','','action-card'),tags=node('div','','action-tags');tags.append(node('span',priorityLabels[task.priority],'priority priority-'+task.priority),node('span',labels[task.status],'status'));card.append(tags,node('h4',task.title));if(task.pageUrl)card.append(node('p',task.pageUrl,'action-page'));if(task.notes)card.append(node('p',task.notes,'action-notes'));const buttons=node('div','','actions'),edit=button('Edit'),move=button(task.status==='done'?'Reopen':task.status==='archived'?'Restore':'Mark done'),archive=button('Archive');
    edit.addEventListener('click',()=>{if(busy)return;editing=task;creation=null;for(const key of Object.keys(inputs))inputs[key].value=task[key];formTitle.textContent='Edit action';save.textContent='Save changes';cancel.hidden=false;inputs.title.focus();});move.addEventListener('click',()=>change(task,['done','archived'].includes(task.status)?'planned':'done'));archive.addEventListener('click',()=>change(task,'archived'));buttons.append(edit,move);if(task.status!=='archived')buttons.append(archive);for(const b of buttons.children)b.disabled=busy;card.append(buttons);list.append(card);}
   if(!visible.length)list.append(node('p',tasks.length?'No actions match this view. Change the search or status filter.':'No saved actions yet. Add your first task from your report or your own plan.','empty'));
  }
  async function load(){if(busy)return;lock(true);message.textContent='Loading saved actions…';try{const result=await api('/orders/'+order.id+'/actions');if(!alive())return;tasks=result.actions;render();message.textContent='Action plan is up to date.';}catch(e){failure(e);}finally{if(alive())lock(false);}}
  form.addEventListener('submit',async event=>{event.preventDefault();if(busy)return;lock(true);message.textContent='Saving your action…';const values=body(),fingerprint=JSON.stringify(values);try{let result;if(editing)result=await api('/orders/'+order.id+'/actions/'+editing.id,'PATCH',{...values,version:editing.version});else{if(!creation||creation.fingerprint!==fingerprint)creation={fingerprint,id:makeUUID()};result=await api('/orders/'+order.id+'/actions','POST',{...values,requestId:creation.id});}if(!alive())return;const found=tasks.some(t=>t.id===result.action.id);tasks=found?tasks.map(t=>t.id===result.action.id?result.action:t):[...tasks,result.action];reset();render();message.textContent='Action saved to your account.';}catch(e){failure(e);}finally{if(alive())lock(false);}});
  cancel.addEventListener('click',reset);reload.addEventListener('click',load);search.addEventListener('input',render);filter.addEventListener('change',render);
  exportButton.addEventListener('click',()=>{if(!tasks.length)return;download('zikap-actions-'+order.id+'.txt',['Zikap / Your manual SEO action plan','Project: '+order.id,'Website: '+order.website,'Exported: '+new Date().toISOString(),'These are customer-managed tasks, not verified fixes or a payment receipt.',...tasks.map((task,i)=>[(i+1)+'. '+task.title,'Status: '+labels[task.status],'Priority: '+priorityLabels[task.priority],'Page: '+(task.pageUrl||'Not specified'),'Notes: '+(task.notes||'None'),'Last saved: '+task.updatedAt].join('\n'))].join('\n\n'));});
  reset();render();load();
 }
 function detail(order){
  setView('projects');const box=$('project-detail');box.replaceChildren(node('span',states[order.status]||order.status,'status'),node('h2',names[order.packageId]||order.packageId),node('p','Order '+order.id,'tiny'),node('p','Last updated '+new Date(order.updatedAt).toLocaleString(),'tiny'));
  const controls=node('div','','actions'),refresh=button('Refresh this project'),saveBrief=button('Download request summary'),jumpActions=button('Open action plan'),jumpMessages=button('Open messages'),close=button('Close project');
  refresh.addEventListener('click',()=>openProject(order.id));close.addEventListener('click',()=>{detailVersion++;box.hidden=true;box.replaceChildren();$('refresh-projects').focus();});
  saveBrief.addEventListener('click',()=>download('zikap-request-'+order.id+'.txt',['Zikap project request','Order ID: '+order.id,'Package: '+names[order.packageId],'Price: $'+order.price+' USD','Current status: '+(states[order.status]||order.status),'Updated: '+order.updatedAt,'Website: '+order.website,'Scope: '+scopes[order.packageId],'Pages: '+(order.pages||[]).join('\n'),'Topic: '+(order.topic||'Not supplied'),'Language: '+order.language,'Market: '+order.market,'Your goals: '+order.goals,'Latest update: '+(order.note||'No specialist update yet.'),'Next step: '+nextStep(order),'This is a request summary, not a payment receipt.'].join('\n\n')));
  jumpActions.addEventListener('click',()=>{const target=box.querySelector('.project-action-plan');if(target)reveal(target);});jumpMessages.addEventListener('click',()=>{const target=box.querySelector('.project-thread');if(target)reveal(target);});controls.append(refresh,saveBrief,jumpActions,jumpMessages,close);box.append(controls);
  const next=node('section','','next-step');next.append(node('span','YOUR NEXT STEP','eyebrow'),node('p',nextStep(order)));box.append(next);
  const info=node('dl','');for(const [title,value] of [['Website',order.website],['Scope',scopes[order.packageId]||''],['Pages',(order.pages||[]).join('\n')||'No pages supplied'],['Topic',order.topic||'Not supplied'],['Language',order.language],['Market',order.market],['Your goals',order.goals]]){info.append(node('dt',title),node('dd',value||''));}box.append(info);
  box.append(node('h3','Latest project update'),node('p',order.note||'Your request awaits review. Acceptance, scope and timing still need agreement. Submitting a request does not charge you.'));
  const payment=order.payment||{available:false,status:'unpaid'},paymentBox=node('section','','payment-panel');paymentBox.append(node('h3','Payment'));
  const paidLabels={paid:'Payment confirmed',partially_refunded:'Partially refunded',refunded:'Refunded'};
  if(paidLabels[payment.status])paymentBox.append(node('p',paidLabels[payment.status]+(payment.testMode?' (Stripe test mode; no real charge)':'')));
  else if(!payment.available)paymentBox.append(node('p','Online checkout is not enabled yet. Sending a project request does not charge you.'));
  else if(order.status!=='accepted')paymentBox.append(node('p','Stripe checkout opens after your project is accepted and the scope and timing are confirmed.'));
  else{
   paymentBox.append(node('p',(payment.status==='pending'?'An existing checkout is pending. ':'')+'One-time payment: $'+order.price+' USD. Card details are entered on Stripe’s hosted checkout page.'));
   if(payment.testMode===true||paymentTestMode===true)paymentBox.append(node('p','TEST MODE / No real payment will be collected.','note'));
   const label=node('label','','check'),check=document.createElement('input');check.type='checkbox';check.id='pay-confirm-'+order.id;label.htmlFor=check.id;label.append(check,node('span','I confirm the package scope and the $'+order.price+' USD amount.'));
   const pay=button('Continue to Stripe checkout','btn'),message=node('p','');pay.disabled=true;message.setAttribute('role','status');check.addEventListener('change',()=>{pay.disabled=!check.checked;});
   pay.addEventListener('click',async()=>{if(!check.checked)return;pay.disabled=true;message.textContent='Preparing your secure checkout…';try{const result=await api('/orders/'+order.id+'/checkout','POST',{acknowledged:true});if(result.url){const url=new URL(result.url);if(url.protocol!=='https:'||url.hostname!=='checkout.stripe.com')throw new Error('The checkout page could not be verified.');location.assign(url.href);}else await openProject(order.id);}catch(e){if(!sessionError(e))message.textContent=errorText(e);pay.disabled=!check.checked;}});
   paymentBox.append(label,pay,message);
  }
  if(payment.status==='pending'){
   const confirm=button('Check Stripe payment status'),message=node('p','');message.setAttribute('role','status');confirm.addEventListener('click',async()=>{confirm.disabled=true;message.textContent='Checking Stripe…';try{await api('/orders/'+order.id+'/payment-status','POST',{});await loadProjects();await openProject(order.id);}catch(e){if(!sessionError(e))message.textContent=errorText(e);confirm.disabled=false;}});paymentBox.append(confirm,message);
  }
  box.append(paymentBox);
  if(order.report){box.append(node('h3','Your specialist report'),node('pre',order.report,'report'));const save=button('Download report','btn');save.addEventListener('click',()=>download('zikap-report-'+order.id+'.txt',order.report));box.append(save);}
  const actionHost=node('section','','project-action-plan');actionHost.tabIndex=-1;actionHost.setAttribute('aria-label','Your SEO action plan');box.append(actionHost);mountActionPlan(actionHost,order);
  const messageEpoch=epoch,threadHost=node('section','');box.append(threadHost);window.ZikapProjectThread.mount(threadHost,{api,path:'/orders/'+order.id+'/messages',role:'customer',alive:()=>epoch===messageEpoch&&threadHost.isConnected,onError:sessionError,makeUUID});
  if(order.revisionNote)box.append(node('h3','Your clarification / revision request'),node('p',order.revisionNote));
  if(order.status==='delivered'&&!order.revisionUsed){
   const form=document.createElement('form'),label=node('label','Request one clarification / revision'),note=document.createElement('textarea'),submit=node('button','Send revision request','btn ghost'),message=node('p','');label.htmlFor='revision-note';note.id='revision-note';note.required=true;note.maxLength=2000;note.placeholder='Describe what needs clarification within the original agreed scope.';submit.type='submit';message.setAttribute('role','status');form.append(label,note,submit,message);form.addEventListener('submit',async event=>{event.preventDefault();submit.disabled=true;try{await api('/orders/'+order.id+'/revision','POST',{note:note.value});await loadProjects();await openProject(order.id);}catch(e){if(!sessionError(e))message.textContent=errorText(e);submit.disabled=false;}});box.append(form);
  }else if(order.revisionUsed)box.append(node('p','Your one scoped clarification/revision has been requested. Follow its update here.','tiny'));
  box.hidden=false;reveal(box);
 }
 async function openProject(id){const currentEpoch=epoch,version=++detailVersion;$('projects-message').textContent='Opening project…';try{const data=await api('/orders/'+id);if(currentEpoch!==epoch||version!==detailVersion)return;projects.set(id,data.order);renderProjects();detail(data.order);$('projects-message').textContent='Project loaded.';}catch(e){if(currentEpoch===epoch&&version===detailVersion&&!sessionError(e))$('projects-message').textContent=errorText(e);}}
 $('project-form').addEventListener('submit',async event=>{
  event.preventDefault();const submit=event.currentTarget.querySelector('button[type=submit]'),currentEpoch=epoch;submit.disabled=true;$('project-message').textContent='Submitting your request…';
  const body={packageId:$('project-package').value,website:$('project-website').value,pages:$('project-pages').value,topic:$('project-topic').value,language:$('project-language').value,market:$('project-market').value,goals:$('project-goals').value,consent:$('project-consent').checked,company:''},fingerprint=JSON.stringify(body);
  try{if(!pending||pending.fingerprint!==fingerprint)pending={fingerprint,id:makeUUID()};const data=await api('/orders','POST',{...body,requestId:pending.id});if(currentEpoch!==epoch)return;pending=null;$('project-form').reset();$('project-package').value=body.packageId;scope();$('project-message').textContent='Request saved to your account. Check acceptance, timing and payment status in your project. Submitting a request does not charge you.';await loadProjects();if(currentEpoch===epoch)detail(data.order);}
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
  try{const status=await api('/status');paymentTestMode=status.paymentTestMode;if(!status.ready){$('app-status').textContent='Customer accounts are being prepared. Please return shortly. The free tools remain available.';return;}try{await enter(await api('/session'));}catch(e){if(e.status===401){clearAccount('Sign in or create an account to manage your projects.');}else throw e;}}
  catch(e){$('app-status').textContent=errorText(e)+' Please return shortly.';}
 }
 boot();
})();
