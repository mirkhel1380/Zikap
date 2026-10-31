'use strict';
(()=>{
 const $=id=>document.getElementById(id),base=location.origin;
 let cursor=null,session=0,selected=null,detailVersion=0;const dirty=new Set();
 const loaded=new Map();
 const states={requested:'Request received',accepted:'Accepted',in_progress:'In progress',delivered:'Report delivered',revision_requested:'Revision requested',declined:'Declined'};
 const packages={
  audit:{title:'Technical SEO Starter',scope:'One website; up to 5 public URLs. Prioritized technical findings and an action checklist.',checks:['Confirm the reviewed URLs and access limitations.','Record evidence, affected URL, priority and recommended action for each finding.','Explain how the customer can verify each proposed fix.','Separate observations from checks that were not performed.']},
  keywords:{title:'Keyword Research Starter',scope:'25 curated keyword ideas for one topic, language and market; map to up to 5 pages. No live volume or difficulty data.',checks:['Confirm the topic, target market and content language.','Prepare 25 relevant ideas with intent and business-fit notes.','Group ideas and map them to up to 5 existing or proposed pages.','Explain the research method and any unmeasured data.']},
  onpage:{title:'On-page SEO Starter',scope:'Proposed improvements for up to 3 existing pages. Recommendations only; no publishing or full article writing.',checks:['Confirm the purpose and existing content of each reviewed page.','Provide proposed titles, descriptions, headings and content edits.','Recommend useful internal links with a reason for each.','Separate proposed changes from work actually implemented.']},
  bundle:{title:'SEO Starter Bundle',scope:'One website: technical review of up to 5 URLs, 25 keyword ideas mapped to up to 5 pages, and on-page briefs for up to 3 pages.',checks:['Complete the technical findings and verification checklist.','Include 25 keyword ideas, intent groups and a page map.','Include on-page edit briefs for up to 3 existing pages.','Combine priorities, limitations and implementation responsibilities.']}
 };
 const node=(tag,content,cls)=>{const n=document.createElement(tag);n.textContent=content;if(cls)n.className=cls;return n;};
 const button=(text,cls='btn ghost')=>{const b=node('button',text,cls);b.type='button';return b;};
 const saveFile=(name,text)=>{const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 async function api(path,method='GET',body){
  const r=await fetch(base+path,{method,credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(20000)});
  const data=await r.json();if(r.status===401)document.dispatchEvent(new Event('zikap-admin-expired'));if(!r.ok){const error=new Error(data.error||'Service unavailable.');error.status=r.status;throw error;}return data;
 }
 function outline(order){
  const p=packages[order.package_id];if(!p)return '';
  const parts=['DRAFT REPORT — REPLACE EVERY [ADD ...] BEFORE DELIVERY','Zikap / '+p.title,'Website: '+order.website,'Scope: '+p.scope,'Language: '+order.language+' / Market: '+order.market,'','REVIEW CONTEXT','Review date: [ADD date]','Reviewed pages / topic: [ADD exact scope]','Method and access limitations: [ADD what was checked and what was not]','','SUMMARY','[ADD the main observations and priorities supported by evidence]'];
  if(['audit','bundle'].includes(order.package_id))parts.push('','TECHNICAL FINDINGS','Repeat this block for each real finding:','Affected URL: [ADD URL]','Observation and evidence: [ADD evidence]','Priority and reason: [ADD priority]','Recommended action: [ADD action]','Verification: [ADD how to verify]','Checks with no issue observed: [ADD checks]','Checks not performed: [ADD limitations]');
  if(['keywords','bundle'].includes(order.package_id)){
   parts.push('','KEYWORD IDEAS','Topic: '+order.topic,'For each idea, record phrase | intent | relevance | topic group. No live metrics are connected.');
   for(let i=1;i<=25;i++)parts.push(String(i).padStart(2,'0')+'. [ADD phrase, intent, relevance and group]');
   parts.push('','PAGE MAP (UP TO 5 PAGES)','[ADD target page, assigned group, existing/new decision and rationale]','Research method: [ADD sources, date and validation approach]');
  }
  if(['onpage','bundle'].includes(order.package_id))parts.push('','ON-PAGE EDIT BRIEFS (UP TO 3 EXISTING PAGES)','Repeat this block for each included page:','Page URL and purpose: [ADD URL and purpose]','Current observation: [ADD evidence]','Proposed title: [ADD title]','Proposed meta description: [ADD description]','Proposed heading/content edits: [ADD recommendations]','Internal links: [ADD source, target and reason]','Implementation status: [ADD what is proposed versus implemented]');
  parts.push('','PRIORITIZED NEXT STEPS','[ADD action, responsible person and verification]','','LIMITATIONS AND HANDOFF','[ADD exclusions, open questions and next decision]','One clarification/revision within the agreed scope is included. Rankings, traffic and revenue are not guaranteed.');
  return parts.join('\n');
 }
 function filterOrders(){
  let review=0,delivered=0,unread=0,known=true;for(const {order,box} of loaded.values()){if(['requested','revision_requested'].includes(order.status))review++;if(order.status==='delivered')delivered++;if(Number.isInteger(order.unreadMessages))unread+=order.unreadMessages;else known=false;if(box)box.hidden=selected!==order.id;}
  $('owner-total').textContent=String(loaded.size);$('owner-review').textContent=String(review);$('owner-delivered').textContent=String(delivered);$('owner-unread').textContent=known?String(unread):'—';
  window.ZikapAdminWorkspace?.render();
 }
 function render(order){
  const p=packages[order.package_id],box=node('article','','owner-order'),prefix='o-'+order.id;
  const head=node('div','','owner-order-heading'),badge=node('span',states[order.status]||order.status,'delivery-status');
  head.append(node('h2',p?p.title:order.package_id),badge);box.append(head,node('p',order.name+' · '+order.email),node('p',order.website),node('p','Order: '+order.id+' · Received: '+order.created_at,'tiny'));
  const unreadNotice=node('p',order.unreadMessages>0?order.unreadMessages+' unread customer message'+(order.unreadMessages===1?'':'s'):'','owner-unread-notice');unreadNotice.hidden=!(order.unreadMessages>0);box.append(unreadNotice);
  const payment=order.payment;
  if(payment){const labels={unpaid:'No Stripe payment recorded',pending:'Stripe checkout pending',paid:'Stripe payment confirmed',partially_refunded:'Partially refunded in Stripe',refunded:'Refunded in Stripe'};box.append(node('p',(labels[payment.status]||payment.status)+(payment.testMode?' / TEST MODE — no real charge':'')+(payment.amountCents?' · $'+(payment.amountCents/100).toFixed(2)+' USD':''),'availability'));}
  const brief=node('details','','owner-brief');brief.open=true;brief.append(node('summary','Customer brief'),node('pre','Page URLs: '+order.pages+'\nTopic: '+order.topic+'\nLanguage: '+order.language+'\nMarket: '+order.market+'\nGoals: '+order.goals));
  if(order.revision_note)brief.append(node('p','Customer revision request: '+order.revision_note,'owner-revision'));box.append(brief);
  if(p){
   const guide=node('details','','owner-scope');guide.append(node('summary','Package scope and review checklist'),node('p',p.scope),node('p','Working checklist only. Ticks stay on this page and are not saved or sent to the customer.','tiny'));
   p.checks.forEach((text,i)=>{const l=node('label','','owner-check'),c=document.createElement('input');c.type='checkbox';c.id=prefix+'-check-'+i;l.htmlFor=c.id;l.append(c,node('span',text));guide.append(l);});box.append(guide);
  }
  const form=document.createElement('form');
  const label=(title,el,id)=>{const l=node('label',title);l.htmlFor=id;el.id=id;form.append(l,el);};
  const state=document.createElement('select');state.required=true;
  if(order.status==='revision_requested'){const o=node('option','Choose the next status for this revision');o.value='';o.disabled=true;state.append(o);}
  ['requested','accepted','in_progress','delivered','declined'].forEach(s=>{const o=node('option',states[s]);o.value=s;state.append(o);});
  state.value=order.status==='revision_requested'?'':order.status;label('Next project status',state,prefix+'-status');
  const note=document.createElement('textarea');note.maxLength=2000;note.value=order.owner_note||'';note.placeholder='Confirm scope, agreed timing and the next step. This is visible to the customer.';label('Customer-visible update',note,prefix+'-note');
  const report=document.createElement('textarea');report.maxLength=90000;report.value=order.report||'';report.placeholder='Write or import the actual project deliverable. The outline contains no research findings.';label('Report / deliverable',report,prefix+'-report');
  const count=node('p','','tiny');count.id=prefix+'-count';report.setAttribute('aria-describedby',count.id);form.append(count);
  const draftNote=node('p','Draft edits stay on this page until you save. Download a draft before closing if you need a copy.','tiny');form.append(draftNote);
  const actions=node('div','','tool-actions'),insert=button('Insert package report outline'),previewButton=button('Preview customer update'),download=button('Download report draft');
  insert.disabled=!!report.value.trim()||!p;
  insert.addEventListener('click',()=>{if(report.value.trim())return;report.value=outline(order);updateDraft();report.focus();status.textContent='Outline inserted. Complete the actual review and replace every [ADD ...] before delivery.';});
  download.addEventListener('click',()=>{if(report.value.trim())saveFile('zikap-report-draft-'+order.id+'.txt',report.value);});
  const preview=node('section','','owner-preview');preview.hidden=true;preview.setAttribute('aria-label','Unsaved customer update preview');
  previewButton.addEventListener('click',()=>{
   preview.replaceChildren(node('span','PREVIEW / NOT SAVED','eyebrow'),node('h3','What the customer will see'),node('span',states[state.value]||'Choose a project status','delivery-status'),node('p','Website: '+order.website),node('p','Package: '+(p?p.title:order.package_id)));
   if(note.value)preview.append(node('p',note.value));if(report.value)preview.append(node('pre',report.value,'delivery-report'));
   if(!note.value&&!report.value)preview.append(node('p','No update or report has been entered yet.'));
   preview.hidden=false;
  });
  actions.append(insert,previewButton,download);form.append(actions);
  const upload=document.createElement('input');upload.type='file';upload.accept='.txt,text/plain';label('Replace report with a prepared text file (up to 90 KB)',upload,prefix+'-upload');
  upload.addEventListener('change',async()=>{const file=upload.files[0];if(!file)return;try{if(file.size>90000)throw new Error('Report file must be at most 90 KB.');const text=await file.text();if(text.length>90000)throw new Error('Report must be at most 90,000 characters.');report.value=text;updateDraft();status.textContent='Report imported into the draft. Preview and save when ready.';}catch(err){status.textContent=err.message;}finally{upload.value='';}});
  const save=node('button','Save customer update','btn');save.type='submit';
  const remove=button('Delete this request');
  const status=node('p','');status.setAttribute('role','status');const reopen=button('Reopen latest saved order');reopen.hidden=true;reopen.addEventListener('click',()=>open(order.id));form.append(preview,save,remove,status,reopen);
  function updateDraft(){dirty.add(order.id);count.textContent=report.value.length.toLocaleString()+' / 90,000 characters';insert.disabled=!!report.value.trim()||!p;download.disabled=!report.value.trim();preview.hidden=true;draftNote.textContent='Unsaved edits on this page. Preview before saving, or download a draft to keep a copy.';}
  [state,note,report].forEach(el=>el.addEventListener('input',updateDraft));count.textContent=report.value.length.toLocaleString()+' / 90,000 characters';download.disabled=!report.value.trim();
  form.addEventListener('submit',async e=>{
   e.preventDefault();
   if(state.value==='delivered'&&(!report.value.trim()||/\[ADD\b/i.test(report.value))){status.textContent='Delivery needs a completed report. Replace every [ADD ...] placeholder and include the actual findings before saving as delivered.';report.focus();return;}
   const snapshot={status:state.value,note:note.value,report:report.value,...(Number.isInteger(order.editVersion)?{expectedVersion:order.editVersion}:{})},saveSession=session;for(const control of form.querySelectorAll('button,input,textarea,select'))control.disabled=true;
   try{const result=await api('/admin/orders/'+order.id,'PATCH',snapshot);if(saveSession!==session||!box.isConnected)return;const saved=result.orderUpdate;if(!saved)throw new Error('The save response could not confirm the editing version. Download this draft, then reopen the saved order.');Object.assign(order,{status:saved.status,report:saved.report,owner_note:saved.note,updated_at:saved.updatedAt,editVersion:saved.editVersion});state.value=saved.status;note.value=saved.note;report.value=saved.report;count.textContent=report.value.length.toLocaleString()+' / 90,000 characters';dirty.delete(order.id);badge.textContent=states[order.status];preview.hidden=true;draftNote.textContent='Saved to the server. The customer can see this update in their project.';status.textContent='Customer update saved.';reopen.hidden=true;if(historyDetails.open)loadHistory();filterOrders();window.ZikapAdminWorkspace.refreshSummary();}
   catch(err){if(saveSession===session){status.textContent=err.message;if(err.status===409)reopen.hidden=false;}}finally{if(box.isConnected){for(const control of form.querySelectorAll('button,input,textarea,select'))control.disabled=false;insert.disabled=!!report.value.trim()||!p;download.disabled=!report.value.trim();}}

  });
  remove.addEventListener('click',async()=>{if(!confirm('Permanently delete this project request, report, saved actions, messages and saved history?'))return;remove.disabled=true;try{await api('/admin/orders/'+order.id,'DELETE');loaded.delete(order.id);dirty.delete(order.id);selected=null;box.remove();$('order-editor').hidden=true;filterOrders();window.ZikapAdminWorkspace.refreshSummary();}catch(err){status.textContent=err.message;remove.disabled=false;}});
  const historyDetails=node('details','','owner-history'),historySummary=node('summary','Saved report history'),historyContent=node('div','','history-content'),historyMessage=node('p',''),historyList=node('div','','history-list'),historyPreview=node('section','','history-preview'),historyRefresh=button('Refresh saved history');let historyLoaded=false,historyVersion=0,snapshotVersion=0;const historySession=session;
  historyMessage.setAttribute('role','status');historyPreview.hidden=true;
  historyContent.append(node('p','Keeps up to 20 previous saved states from future edits. Report restoration loads text into your draft for review and explicit saving; the current project status and customer revision remain in place.','tiny'),historyRefresh,historyMessage,historyList,historyPreview);historyDetails.append(historySummary,historyContent);
  const historyAlive=()=>historySession===session&&box.isConnected;
  async function viewSaved(version){const request=++snapshotVersion;historyMessage.textContent='Loading saved version…';try{const data=await api('/admin/orders/'+order.id+'/history/'+version);if(!historyAlive()||request!==snapshotVersion)return;const saved=data.snapshot;historyPreview.replaceChildren(node('span','PREVIOUS SAVED STATE / VERSION '+saved.version,'eyebrow'),node('h3',states[saved.status]||saved.status),node('p','Saved '+new Date(saved.savedAt).toLocaleString()+' / Replaced '+new Date(saved.replacedAt).toLocaleString(),'tiny'),node('h4','Previous customer-visible update'),node('p',saved.note||'No update was saved.'),node('h4','Previous report'),node('pre',saved.report||'No report was saved in this version.','history-report'));
   if(saved.revisionNote)historyPreview.append(node('h4','Clarification recorded in this saved state'),node('p',saved.revisionNote));
   const actions=node('div','','actions'),restore=button('Use report as draft'),exportSaved=button('Download this saved report'),closeSaved=button('Close saved version');restore.disabled=!saved.report;exportSaved.disabled=!saved.report;
   restore.addEventListener('click',()=>{if(!historyAlive()||save.disabled)return;if(dirty.has(order.id)&&report.value!==saved.report&&!confirm('Replace your unsaved report draft with this saved report? Download the draft first if you need a copy.'))return;report.value=saved.report;updateDraft();status.textContent='Saved report version '+saved.version+' loaded into your draft. Review, preview and save to publish it. Current status, update note and customer revision are preserved.';report.focus();report.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});
   exportSaved.addEventListener('click',()=>saveFile('zikap-report-'+order.id+'-version-'+saved.version+'.txt',saved.report));closeSaved.addEventListener('click',()=>{snapshotVersion++;historyPreview.replaceChildren();historyPreview.hidden=true;});actions.append(restore,exportSaved,closeSaved);historyPreview.append(actions);historyPreview.hidden=false;historyMessage.textContent='Viewing previous version '+saved.version+'. Current saved version: '+data.currentVersion+'.';
  }catch(err){if(historyAlive()&&request===snapshotVersion)historyMessage.textContent=err.message;}}
  async function loadHistory(){const request=++historyVersion;snapshotVersion++;historyRefresh.disabled=true;historyMessage.textContent='Loading saved history…';historyPreview.replaceChildren();historyPreview.hidden=true;try{const data=await api('/admin/orders/'+order.id+'/history');if(!historyAlive()||request!==historyVersion)return;historyLoaded=true;historyList.replaceChildren();for(const saved of data.history){const item=node('div','','history-row'),label=node('div');label.append(node('strong','Version '+saved.version+' / '+(states[saved.status]||saved.status)),node('small','Saved '+new Date(saved.savedAt).toLocaleString()+' / '+saved.reportCharacters.toLocaleString()+' report characters'));const read=button('View saved version');read.addEventListener('click',()=>viewSaved(saved.version));item.append(label,read);historyList.append(item);}if(!data.history.length)historyList.append(node('p','No previous saved states yet. Future changes will keep earlier versions here.','tiny'));historyMessage.textContent='Current saved version: '+data.currentVersion+'. '+data.history.length+' previous state(s) retained, up to '+data.retainedLimit+'.';if(Number.isInteger(order.editVersion)&&data.currentVersion!==order.editVersion){historyMessage.textContent+=' This page has an older editing version. Download your draft before reopening the latest order.';reopen.hidden=false;}}
   catch(err){if(historyAlive()&&request===historyVersion)historyMessage.textContent=err.message;}finally{if(historyAlive()&&request===historyVersion)historyRefresh.disabled=false;}}
  historyRefresh.addEventListener('click',loadHistory);historyDetails.addEventListener('toggle',()=>{if(historyDetails.open&&!historyLoaded)loadHistory();});
  const threadDetails=node('details','','owner-thread'),threadHost=node('section',''),threadSession=session;let mounted=false;
  const threadSummary=node('summary','Project messages'+(order.unreadMessages>0?' / '+order.unreadMessages+' unread':''));threadDetails.append(threadSummary,node('p','Account customers can ask questions here. Replies stay with this project; no email is sent. This conversation does not consume the included formal revision.','tiny'),threadHost);
  threadDetails.addEventListener('toggle',()=>{if(threadDetails.open&&!mounted){mounted=true;window.ZikapProjectThread.mount(threadHost,{api,path:'/admin/orders/'+order.id+'/messages',role:'owner',alive:()=>threadSession===session&&threadHost.isConnected,onUnreadChange:count=>{order.unreadMessages=count;unreadNotice.textContent=count>0?count+' unread customer message'+(count===1?'':'s'):'';unreadNotice.hidden=!(count>0);threadSummary.textContent='Project messages'+(count>0?' / '+count+' unread':'');filterOrders();window.ZikapAdminWorkspace.refreshSummary();}});}});
  box.append(form,historyDetails,threadDetails);loaded.set(order.id,{order,box});$('owner-orders').append(box);
 }
 async function load(more=false){
  const requestSession=session;
  if(!base){$('owner-status').textContent='The order server has not been connected yet.';return;}
  $('owner-refresh').disabled=true;$('owner-more').disabled=true;
  $('owner-refresh').disabled=true;
  try{
   if(!more){dirty.clear();selected=null;detailVersion++;$('order-editor').hidden=true;$('owner-orders').replaceChildren();loaded.clear();cursor=null;$('owner-desk').hidden=true;$('owner-more').hidden=true;}
   $('owner-status').textContent='Loading…';const data=await api('/admin/orders'+(cursor?'?before='+encodeURIComponent(cursor):''));
   if(requestSession!==session)return;
   data.orders.forEach(order=>{if(!loaded.has(order.id))loaded.set(order.id,{order,box:null});});cursor=data.next;$('owner-more').hidden=!cursor;$('owner-desk').hidden=false;
   filterOrders();$('owner-status').textContent=loaded.size+' request(s) loaded. Totals cover loaded requests only.';
  }catch(e){if(requestSession===session)$('owner-status').textContent=e.message;}finally{if(requestSession===session){$('owner-refresh').disabled=false;$('owner-more').disabled=false;$('owner-refresh').disabled=false;}}
 }
 $('owner-more').addEventListener('click',()=>load(true));$('owner-search').addEventListener('input',filterOrders);$('owner-filter').addEventListener('change',filterOrders);
 $('owner-refresh').addEventListener('click',()=>window.ZikapAdminWorkspace.refresh());
 function clear(){session++;detailVersion++;selected=null;dirty.clear();$('order-editor').hidden=true;cursor=null;loaded.clear();$('owner-orders').replaceChildren();$('owner-more').hidden=true;$('owner-more').disabled=false;$('owner-refresh').disabled=false;$('owner-desk').hidden=true;$('owner-search').value='';$('owner-filter').value='';$('owner-status').textContent='Signed out. Unsaved drafts have been cleared.';}
 async function open(id,messages=false){
  if(selected&&dirty.has(selected)&&!confirm('Discard unsaved edits before opening another order?'))return;
  const version=++detailVersion,requestSession=session;$('owner-status').textContent='Opening order…';
  try{const result=await api('/admin/orders/'+id);if(version!==detailVersion||requestSession!==session)return;if(selected)dirty.delete(selected);for(const record of loaded.values())record.box=null;$('owner-orders').replaceChildren();selected=id;render(result.order);$('order-editor').hidden=false;window.ZikapAdminWorkspace.navigate('requests');filterOrders();if(messages)$('owner-orders').querySelector('.owner-thread').open=true;(messages?$('owner-orders').querySelector('.owner-thread'):$('order-editor')).scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});$('owner-status').textContent='Order loaded.';}catch(e){if(requestSession===session)$('owner-status').textContent=e.message;}
 }
 $('close-order').addEventListener('click',()=>{if(selected&&dirty.has(selected)&&!confirm('Discard unsaved edits and close this order?'))return;if(selected){dirty.delete(selected);const record=loaded.get(selected);if(record)record.box=null;}detailVersion++;selected=null;$('owner-orders').replaceChildren();$('order-editor').hidden=true;$('requests-view').focus();});
 addEventListener('beforeunload',event=>{if(dirty.size){event.preventDefault();event.returnValue='';}});
 window.ZikapAdminDesk={load:()=>{session++;return load();},more:()=>load(true),clear,open,api,records:()=>[...loaded.values()].map(v=>v.order),hasMore:()=>!!cursor,hasDraft:()=>dirty.size>0,packages,states};
})();
