'use strict';
(()=>{
 const $=id=>document.getElementById(id),base=(window.ZIKAP_API_BASE||'').replace(/\/$/,'');
 let key='',cursor=null,session=0;
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
  const r=await fetch(base+path,{method,headers:{Authorization:'Bearer '+key,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(20000)});
  const data=await r.json();if(!r.ok)throw new Error(data.error||'Service unavailable.');return data;
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
  const query=$('owner-search').value.trim().toLowerCase(),state=$('owner-filter').value;let shown=0,review=0,delivered=0;
  for(const {order,box} of loaded.values()){
   if(['requested','revision_requested'].includes(order.status))review++;
   if(order.status==='delivered')delivered++;
   const matches=(!state||order.status===state)&&(!query||[order.id,order.name,order.email,order.website].join(' ').toLowerCase().includes(query));
   box.hidden=!matches;if(matches)shown++;
  }
  $('owner-total').textContent=String(loaded.size);$('owner-review').textContent=String(review);$('owner-delivered').textContent=String(delivered);
  $('owner-filter-status').textContent=shown+' of '+loaded.size+' loaded requests shown.';$('owner-empty').hidden=shown!==0;
 }
 function render(order){
  const p=packages[order.package_id],box=node('article','','owner-order'),prefix='o-'+order.id;
  const head=node('div','','owner-order-heading'),badge=node('span',states[order.status]||order.status,'delivery-status');
  head.append(node('h2',p?p.title:order.package_id),badge);box.append(head,node('p',order.name+' · '+order.email),node('p',order.website),node('p','Order: '+order.id+' · Received: '+order.created_at,'tiny'));
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
  const status=node('p','');status.setAttribute('role','status');form.append(preview,save,remove,status);
  function updateDraft(){count.textContent=report.value.length.toLocaleString()+' / 90,000 characters';insert.disabled=!!report.value.trim()||!p;download.disabled=!report.value.trim();preview.hidden=true;draftNote.textContent='Unsaved edits on this page. Preview before saving, or download a draft to keep a copy.';}
  [state,note,report].forEach(el=>el.addEventListener('input',updateDraft));count.textContent=report.value.length.toLocaleString()+' / 90,000 characters';download.disabled=!report.value.trim();
  form.addEventListener('submit',async e=>{
   e.preventDefault();
   if(state.value==='delivered'&&(!report.value.trim()||/\[ADD\b/i.test(report.value))){status.textContent='Delivery needs a completed report. Replace every [ADD ...] placeholder and include the actual findings before saving as delivered.';report.focus();return;}
   save.disabled=true;remove.disabled=true;
   try{await api('/admin/orders/'+order.id,'PATCH',{status:state.value,note:note.value,report:report.value});order.status=state.value;order.owner_note=note.value;order.report=report.value;badge.textContent=states[order.status];preview.hidden=true;draftNote.textContent='Saved to the server. Your edits are available to the customer with their receipt.';status.textContent='Saved. The customer can see this update with their receipt.';filterOrders();}
   catch(err){status.textContent=err.message;}finally{save.disabled=false;remove.disabled=false;}
  });
  remove.addEventListener('click',async()=>{if(!confirm('Permanently delete this project request, report, saved actions and messages?'))return;remove.disabled=true;try{await api('/admin/orders/'+order.id,'DELETE');loaded.delete(order.id);box.remove();filterOrders();}catch(err){status.textContent=err.message;remove.disabled=false;}});
  const threadDetails=node('details','','owner-thread'),threadHost=node('section',''),threadSession=session;let mounted=false;
  threadDetails.append(node('summary','Project messages'),node('p','Account customers can ask questions here. Replies stay with this project; no email is sent. This conversation does not consume the included formal revision.','tiny'),threadHost);
  threadDetails.addEventListener('toggle',()=>{if(threadDetails.open&&!mounted){mounted=true;window.ZikapProjectThread.mount(threadHost,{api,path:'/admin/orders/'+order.id+'/messages',role:'owner',alive:()=>threadSession===session&&threadHost.isConnected});}});
  box.append(form,threadDetails);loaded.set(order.id,{order,box});$('owner-orders').append(box);
 }
 async function load(more=false){
  const requestSession=session;
  if(!base){$('owner-status').textContent='The order server has not been connected yet.';return;}
  $('owner-login').querySelector('button[type=submit]').disabled=true;$('owner-more').disabled=true;
  $('owner-refresh').disabled=true;
  try{
   if(!more){$('owner-orders').replaceChildren();loaded.clear();cursor=null;$('owner-desk').hidden=true;$('owner-more').hidden=true;}
   $('owner-status').textContent='Loading…';const data=await api('/admin/orders'+(cursor?'?before='+encodeURIComponent(cursor):''));
   if(requestSession!==session)return;
   data.orders.forEach(order=>{if(!loaded.has(order.id))render(order);});cursor=data.next;$('owner-more').hidden=!cursor;$('owner-desk').hidden=false;
   filterOrders();$('owner-status').textContent=loaded.size+' request(s) loaded. Totals cover loaded requests only.';
  }catch(e){if(requestSession===session)$('owner-status').textContent=e.message;}finally{if(requestSession===session){$('owner-login').querySelector('button[type=submit]').disabled=false;$('owner-more').disabled=false;$('owner-refresh').disabled=false;}}
 }
 $('owner-login').addEventListener('submit',e=>{e.preventDefault();session++;key=$('owner-key').value;$('owner-key').value='';load();});
 $('owner-more').addEventListener('click',()=>load(true));$('owner-search').addEventListener('input',filterOrders);$('owner-filter').addEventListener('change',filterOrders);
 $('owner-refresh').addEventListener('click',()=>{if(confirm('Reload saved requests and discard unsaved page drafts?'))load();});
 $('owner-lock').addEventListener('click',()=>{session++;key='';cursor=null;loaded.clear();$('owner-key').value='';$('owner-orders').replaceChildren();$('owner-more').hidden=true;$('owner-more').disabled=false;$('owner-login').querySelector('button[type=submit]').disabled=false;$('owner-desk').hidden=true;$('owner-search').value='';$('owner-filter').value='';$('owner-status').textContent='Desk locked. Unsaved page drafts have been cleared.';});
})();
