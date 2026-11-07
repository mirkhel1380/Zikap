 'use strict';
(()=>{
 const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
 window.ZikapAiOperations={mount(host,{api,onChanged=()=>{}}){
  let era=0,busy=false,saved=null;
  function render(message=''){
   host.replaceChildren();host.append(node('span','AI OPERATIONS / OWNER CONTROL','eyebrow'),node('h2','Your daily AI allowance'),node('p','Monitor application attempts and pause new AI suggestions. Source checks and saved results remain available.'));
   const status=node('p',message||'Refresh to load current usage.','tiny');status.setAttribute('role','status');
   if(saved){const u=saved.usage,stats=node('div',null,'ai-usage-grid');for(const [label,value]of [['Attempts today',u.attempts],['Remaining today',u.remaining],['Completed',u.completed],['Failed / unknown',u.failed]]){const card=node('div',null,'ai-usage-card');card.append(node('span',label),node('strong',String(value)));stats.append(card);}host.append(stats,node('p',(saved.control.paused?'Paused by owner':saved.ready?'Ready for customer requests':'Not active')+' / '+u.inProgress+' in progress','ai-state'),node('p','Resets '+new Date(u.resetAt).toLocaleString()+' (00:00 UTC). '+saved.limits.perCustomer+' attempts per customer; '+saved.limits.perDay+' shared per day.','tiny'),node('p','Model: '+saved.model,'tiny'),node('p','These counts cover Zikap only. They are not account-wide neuron usage or a billing estimate. Failed or interrupted attempts count. An in-flight request may finish after pausing.','tiny'));
    if(saved.control.paused){const label=node('label',null,'check'),input=node('input');input.type='checkbox';input.id='ai-resume-confirm';label.htmlFor=input.id;label.append(input,document.createTextNode('I confirm Workers Free is still in use, with no paid AI Gateway billing.'));host.append(label);}
   }
   const actions=node('div',null,'actions'),refresh=node('button','Refresh AI usage','btn ghost');refresh.type='button';refresh.disabled=busy;refresh.addEventListener('click',load);actions.append(refresh);
   if(saved){const toggle=node('button',saved.control.paused?'Resume AI suggestions':'Pause AI suggestions','btn');toggle.type='button';toggle.disabled=busy||(saved.control.paused&&!saved.canResume);toggle.addEventListener('click',async()=>{
    if(busy)return;if(saved.control.paused&&!host.querySelector('#ai-resume-confirm')?.checked){status.textContent='Confirm the current free plan before resuming.';return;}
    const version=saved.control.version,paused=!saved.control.paused,e=era;busy=true;render('Saving AI control…');
    let feedback='';try{const result=await api('PATCH',{paused,expectedVersion:version});if(e!==era)return;saved=result;feedback=paused?'Paused. New AI generation requests are blocked.':'Resumed within the existing daily caps.';onChanged(result);}catch(error){if(e===era){saved=null;feedback=error.message+' Refresh before trying again.';}}finally{if(e===era){busy=false;render(feedback);}}
   });actions.append(toggle);}host.append(actions,status);
  }
  async function load(){if(busy)return;const e=era;busy=true;render('Loading AI usage…');try{const result=await api('GET');if(e!==era)return;saved=result;}catch(error){if(e!==era)return;saved=null;busy=false;render(error.message);return;}if(e===era){busy=false;render('Usage checked '+new Date(saved.checkedAt).toLocaleString());}}
  return{load,clear(){era++;busy=false;saved=null;host.replaceChildren();}};
 }};
})();
