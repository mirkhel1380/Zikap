'use strict';
(()=>{
  const $=id=>document.getElementById(id),base=(window.ZIKAP_API_BASE||'').replace(/\/$/,'');
  const states={requested:'Request received',accepted:'Accepted',in_progress:'In progress',delivered:'Report delivered',revision_requested:'Revision requested',declined:'Declined'};
  const element=(tag,content,cls)=>{const el=document.createElement(tag);el.textContent=content;if(cls)el.className=cls;return el;};
  const message=(id,e)=>{$(id).textContent=e.name==='TimeoutError'?'The request timed out. Please try again.':e.message||'Could not connect.';};
  const save=(filename,body)=>{const url=URL.createObjectURL(new Blob([body],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  async function api(path,method='GET',body,token){const res=await fetch(base+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(20000)});const data=await res.json();if(!res.ok)throw new Error(data.error||'Service unavailable.');return data;}
  async function loadOrder(){
    $('track-message').textContent='Checking your project…';$('track-result').replaceChildren();
    try{
      const id=$('track-id').value.trim(),token=$('track-key').value.trim();
      if(!/^[a-f0-9-]{36}$/.test(id)||token.length!==72)throw new Error('Enter the order ID and private key from your receipt.');
      const order=await api('/orders/'+id,'GET',undefined,token);
      const box=element('article','', 'delivery-card');box.append(element('span',states[order.status]||order.status,'delivery-status'),element('h3','Your project update'),element('p','Website: '+order.website),element('p','Package: '+order.packageId+' · $'+order.price+' USD'),element('p','Updated: '+new Date(order.updatedAt).toLocaleString()));
      if(order.note)box.append(element('p',order.note));
      if(order.payment){const labels={paid:'Payment confirmed',pending:'Stripe checkout pending',unpaid:'No Stripe payment recorded',partially_refunded:'Partially refunded',refunded:'Refunded'};box.append(element('p','Payment: '+(labels[order.payment.status]||order.payment.status)+(order.payment.testMode?' (test mode; no real charge)':'')));}
      if(order.report){const report=element('pre',order.report,'delivery-report'),button=element('button','Download report','btn');button.type='button';button.addEventListener('click',()=>save('zikap-report-'+id+'.txt',order.report));box.append(report,button);}
      if(order.status==='delivered'&&!order.revisionUsed){
        const form=document.createElement('form'),label=element('label','Request your one clarification / revision');label.htmlFor='revision-note';const note=document.createElement('textarea');note.id='revision-note';note.required=true;note.maxLength=2000;note.placeholder='Describe the changes within the original agreed scope.';const submit=element('button','Send revision request','btn ghost');submit.type='submit';const status=element('p','');status.setAttribute('role','status');form.append(label,note,submit,status);form.addEventListener('submit',async e=>{e.preventDefault();submit.disabled=true;try{await api('/orders/'+id+'/revision','POST',{note:note.value},token);await loadOrder();}catch(err){status.textContent=err.message;submit.disabled=false;}});box.append(form);
      }
      $('track-result').replaceChildren(box);$('track-message').textContent='Project found. Your project and payment updates are shown below.';
    }catch(e){message('track-message',e);}
  }
  $('track-form').addEventListener('submit',event=>{event.preventDefault();loadOrder();});
  $('receipt-import').addEventListener('change',async event=>{
    const file=event.target.files[0];if(!file)return;
    try{
      if(file.size>12000)throw new Error('Choose a Zikap receipt text file smaller than 12 KB.');
      const content=await file.text(),id=content.match(/^Order ID: ([a-f0-9-]{36})\r?$/m)?.[1],key=content.match(/^Private receipt key: ([a-f0-9-]{72})\r?$/m)?.[1];
      if(!id||!key)throw new Error('The receipt needs a valid Order ID and private receipt key.');
      $('track-id').value=id;$('track-key').value=key;
      $('track-message').textContent='Receipt opened. Use Check project status to retrieve the server’s latest update. The file itself does not confirm an accepted order.';
    }catch(e){message('track-message',e);}finally{event.target.value='';}
  });

  (async()=>{try{if(!base)throw new Error('Legacy tracking is unavailable.');const health=await api('/health');if(!health.ready)throw new Error('Legacy tracking is temporarily unavailable.');$('track-button').disabled=false;}catch(e){message('track-message',e);}})();
})();
