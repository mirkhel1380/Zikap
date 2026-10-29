'use strict';
(()=>{
 const $=id=>document.getElementById(id);let plan=null;
 const storageKey='zikap-content-plan-v1';
 const dirty=()=>{if($('plan-save-status'))$('plan-save-status').textContent='You have unsaved changes. Save on this device or download an editable backup.';};
 const stages=['Planned','Drafting','In review','Ready to publish','Published'];
 const today=new Date();today.setMinutes(today.getMinutes()-today.getTimezoneOffset());$('plan-date').value=today.toISOString().slice(0,10);
 const addDays=(date,days)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);};
 const save=(name,text,type)=>{const u=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};
 const cell=s=>'"'+(/^[=+\-@\t\r]/.test(String(s).trim())?"'":'')+String(s).replaceAll('"','""')+'"';
 function progress(){const done=plan.items.filter(i=>i.status==='Published').length,review=plan.items.filter(i=>i.status==='In review').length;$('plan-progress').textContent=plan.items.length+' planned articles · '+review+' in review · '+done+' marked published by you';}
 function field(parent,labelText,value,update,options={}){const label=document.createElement('label'),input=document.createElement(options.choices?'select':options.multiline?'textarea':'input'),id='plan-item-'+parent.dataset.index+'-'+parent.children.length;label.htmlFor=id;label.textContent=labelText;input.id=id;if(options.choices){options.choices.forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;input.append(o);});}else{input.maxLength=options.multiline?3000:300;if(!options.multiline)input.type='text';}input.value=value;input.addEventListener('input',()=>{update(input.value);dirty();});parent.append(label,input);return input;}
 function render(){
  $('plan-heading').textContent=plan.business+' · 30-day content plan';$('plan-summary').textContent=plan.start+' to '+addDays(plan.start,29)+' · '+plan.cadence+' article(s) per week · Audience: '+plan.audience;
  $('plan-rows').replaceChildren();
  plan.items.forEach((item,i)=>{
   const row=document.createElement('article');row.className='planner-item';row.dataset.index=String(i);
   const top=document.createElement('div');top.className='planner-item-top';const n=document.createElement('span');n.textContent='ARTICLE '+String(i+1).padStart(2,'0');const date=document.createElement('strong');date.textContent=item.date;top.append(n,date);row.append(top);
   field(row,'Working title',item.title,v=>item.title=v);
   field(row,'Primary keyword or question (your choice)',item.keyword,v=>item.keyword=v);
   field(row,'Intended reader action',item.action,v=>item.action=v);
   field(row,'Relevant internal page to link (optional)',item.link,v=>item.link=v);
   field(row,'Content brief / outline',item.outline,v=>item.outline=v,{multiline:true});
   field(row,'Your workflow status',item.status,v=>{item.status=v;progress();},{choices:stages});
   $('plan-rows').append(row);
  });progress();$('plan-results').hidden=false;
 }
 $('planner-form').addEventListener('submit',e=>{
  e.preventDefault();$('plan-message').textContent='';
  const cadence=Number($('plan-cadence').value),count=cadence*4,topics=$('plan-topics').value.split(/\r?\n/).map(t=>t.trim()).filter(Boolean),start=$('plan-date').value;
  if(![1,2,3].includes(cadence)||!/^\d{4}-\d{2}-\d{2}$/.test(start)||!Number.isFinite(Date.parse(start+'T12:00:00Z'))){$('plan-message').textContent='Choose a valid start date and publishing pace.';return;}
  if(topics.length!==count||topics.some(t=>t.length>200)){$('plan-message').textContent='Add exactly '+count+' topics, one per line, with up to 200 characters each. Adjust the publishing pace if needed.';return;}
  if(new Set(topics.map(t=>t.toLowerCase())).size!==topics.length){$('plan-message').textContent='Remove duplicate topics before building your plan.';return;}
  const business=$('plan-business').value.trim(),audience=$('plan-audience').value.trim(),goal=$('plan-goal').value.trim();if(!business||!audience||!goal){$('plan-message').textContent='Complete your business, audience, and content goal.';return;}
  plan={business,audience,goal,start,cadence,items:topics.map((title,i)=>({date:addDays(start,Math.floor(i/cadence)*7+Math.floor((i%cadence)*7/cadence)),title,keyword:'',action:goal,link:'',status:'Planned',outline:'Reader: '+audience+'\nMain topic: '+title+'\nReader outcome: '+goal+'\n\nComplete before drafting:\n- Main question and a concise answer\n- Supporting sections and practical examples\n- First-hand experience or reliable evidence to add\n- Sources to verify\n- Relevant internal links\n- Useful next step\n\nReview before publication:\n- Fact-check claims and sources\n- Check originality, title, description, headings and images\n- Confirm links and final page preview'}))};render();dirty();$('plan-message').textContent='Your plan is ready below. Edit your briefs and statuses, then save or download a copy before leaving this page.';
 });
 $('plan-sample').addEventListener('click',()=>{$('plan-business').value='Example Garden';$('plan-audience').value='First-time home gardeners';$('plan-goal').value='Choose suitable plants and start a small garden';$('plan-cadence').value='1';$('plan-topics').value='How to start a balcony herb garden\nChoosing containers for a small garden\nA beginner watering routine\nCommon herb-growing mistakes to avoid';$('planner-form').requestSubmit();});
 $('plan-csv').addEventListener('click',()=>{if(!plan)return;const rows=[['Scheduled date','Working title','Primary keyword or question','Reader action','Internal page','Your workflow status','Content brief'],...plan.items.map(i=>[i.date,i.title,i.keyword,i.action,i.link,i.status,i.outline])];save('zikap-content-calendar.csv','\uFEFF'+rows.map(r=>r.map(cell).join(',')).join('\r\n'),'text/csv;charset=utf-8');});
 $('plan-briefs').addEventListener('click',()=>{if(!plan)return;save('zikap-content-briefs.txt','Zikap — Your 30-day content plan\nBusiness: '+plan.business+'\nAudience: '+plan.audience+'\nGoal: '+plan.goal+'\nPeriod: '+plan.start+' to '+addDays(plan.start,29)+'\n\nThis plan uses your topics. No search demand has been researched. Statuses are set by you; nothing is automatically published.\n\n'+plan.items.map((i,n)=>'ARTICLE '+(n+1)+' · '+i.date+'\nTitle: '+i.title+'\nPrimary keyword / question: '+i.keyword+'\nReader action: '+i.action+'\nInternal page: '+i.link+'\nStatus: '+i.status+'\n\n'+i.outline).join('\n\n'+ '='.repeat(35)+'\n\n'),'text/plain;charset=utf-8');});
 function validatedBackup(data){
  const fail=()=>{throw new Error('This file is not a valid Zikap content plan backup.');};
  const str=(v,max)=>{if(typeof v!=='string'||v.length>max)fail();return v;};
  const validDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
  if(!data||data.version!==1||!data.plan||typeof data.plan!=='object')fail();
  const p=data.plan;if(![1,2,3].includes(p.cadence)||!validDate(p.start)||!Array.isArray(p.items)||p.items.length!==p.cadence*4)fail();
  const clean={business:str(p.business,120),audience:str(p.audience,200),goal:str(p.goal,300),start:p.start,cadence:p.cadence,items:[]};
  for(const row of p.items){if(!row||!validDate(row.date)||row.date<p.start||row.date>addDays(p.start,29)||!stages.includes(row.status))fail();clean.items.push({date:row.date,title:str(row.title,300),keyword:str(row.keyword,300),action:str(row.action,300),link:str(row.link,300),outline:str(row.outline,3000),status:row.status});}
  return clean;
 }
 const backup=()=>JSON.stringify({version:1,plan},null,2);
 function restore(data){
  const next=validatedBackup(data);plan=next;
  $('plan-business').value=plan.business;$('plan-audience').value=plan.audience;$('plan-goal').value=plan.goal;$('plan-date').value=plan.start;$('plan-cadence').value=String(plan.cadence);$('plan-topics').value=plan.items.map(i=>i.title).join('\n');render();dirty();
 }
 $('plan-save-device').addEventListener('click',()=>{if(!plan)return;try{localStorage.setItem(storageKey,backup());$('plan-save-status').textContent='Saved on this device. Save again after making changes.';$('plan-restore-status').textContent='A saved plan is available in this browser.';}catch{$('plan-save-status').textContent='Browser storage is unavailable or full. Download an editable backup instead.';}});
 $('plan-backup').addEventListener('click',()=>{if(!plan)return;save('zikap-content-plan.json',backup(),'application/json;charset=utf-8');$('plan-save-status').textContent='Editable backup prepared for download. Keep the file and save again after edits.';});
 $('plan-restore').addEventListener('click',()=>{try{const saved=localStorage.getItem(storageKey);if(!saved){$('plan-restore-status').textContent='No saved plan was found in this browser. You can open a backup file instead.';return;}restore(JSON.parse(saved));$('plan-save-status').textContent='Restored from this browser. Save again after making changes.';$('plan-restore-status').textContent='Your saved plan and article statuses were restored below.';}catch{$('plan-restore-status').textContent='The saved copy could not be restored. Try opening a downloaded Zikap backup file.';}});
 $('plan-import').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>250000)throw new Error('Use a Zikap JSON backup smaller than 250 KB.');const data=JSON.parse(await file.text());restore(data);$('plan-restore-status').textContent='Backup opened successfully. Your edited briefs and statuses are ready below.';$('plan-save-status').textContent='Opened from a backup. Save on this device if you want to restore it here later.';}catch(e){$('plan-restore-status').textContent=e instanceof SyntaxError?'This file contains invalid JSON. Choose a Zikap content plan backup.':e.message||'Could not open this backup. Your current plan has not changed.';}finally{event.target.value='';}});
 try{if(localStorage.getItem(storageKey))$('plan-restore-status').textContent='A saved plan is available in this browser. Use Restore saved plan to open it.';}catch{$('plan-restore-status').textContent='Device storage is unavailable. Download and open backup files to keep your work.';}

})();
