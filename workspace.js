'use strict';
(() => {
  const $=id=>document.getElementById(id);
  const base=(window.ZIKAP_API_BASE||'').replace(/\/$/,'');
  let pendingRequest=null;
  const requestUUID=()=>{
    if(typeof crypto.randomUUID==='function')return crypto.randomUUID();
    const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
    const hex=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');return hex.slice(0,8)+'-'+hex.slice(8,12)+'-'+hex.slice(12,16)+'-'+hex.slice(16,20)+'-'+hex.slice(20);
  };
  const states={requested:'Request received',accepted:'Accepted',in_progress:'In progress',delivered:'Report delivered',revision_requested:'Revision requested',declined:'Request declined'};
  async function api(path,method='GET',body,token){
    const headers={};if(body)headers['Content-Type']='application/json';if(token)headers.Authorization='Bearer '+token;
    const res=await fetch(base+path,{method,headers,body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(20000)});
    const data=await res.json();if(!res.ok)throw new Error(data.error||'The service is unavailable. Please try again.');return data;
  }
  const message=(id,e)=>{$(id).textContent=e.name==='TimeoutError'?'The request timed out. Please try again.':e.message||'Could not reach the service.';};
  const save=(filename,body)=>{const url=URL.createObjectURL(new Blob([body],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  const element=(tag,content,cls)=>{const e=document.createElement(tag);e.textContent=content;if(cls)e.className=cls;return e;};
  function scope(){const v=$('service').value;$('page-limit').textContent=v==='onpage'?'(up to 3)':'(up to 5)';$('order-topic').required=['keywords','bundle'].includes(v);$('order-pages').required=['audit','onpage','bundle'].includes(v);}
  $('service').addEventListener('change',scope);scope();
  async function availability(){
    if(!base){$('order-availability').textContent='Project requests are not open yet. You can use the instant HTML report now. No details are being submitted.';$('track-message').textContent='Project tracking is not available yet.';return;}
    try{const health=await api('/health');if(!health.ready)throw new Error('Project service is not ready.');$('order-fields').disabled=false;$('track-button').disabled=false;$('order-availability').textContent='Project request service is connected. Submit for scope and timing review. No payment is collected.';}
    catch(e){$('order-availability').textContent='Project service is unavailable. Please return later. The instant HTML checker is still available.';}
  }
  $('order-form').addEventListener('submit',async event=>{
    event.preventDefault();if(!base)return;
    const button=$('order-form').querySelector('button[type="submit"]');button.disabled=true;$('order-message').textContent='Submitting your project request…';
    const body={packageId:$('service').value,name:$('customer-name').value,email:$('customer-email').value,website:$('order-website').value,pages:$('order-pages').value,topic:$('order-topic').value,language:$('order-language').value,market:$('order-market').value,goals:$('order-goals').value,consent:$('order-consent').checked,company:$('order-company').value};
    const fingerprint=JSON.stringify(body);
    let request;
    try{
      if(!pendingRequest||pendingRequest.fingerprint!==fingerprint)pendingRequest={fingerprint,id:requestUUID(),token:requestUUID()+requestUUID()};
      request=pendingRequest;
      const result=await api('/orders','POST',{...body,requestId:request.id,receiptKey:request.token});
      $('track-id').value=result.id;$('track-key').value=result.token;
      const box=$('order-receipt');box.replaceChildren(element('h3','Request received'),element('p','Save your receipt before leaving. It contains the only private key for tracking your project.'),element('p','Order ID: '+result.id));
      const saveButton=element('button','Download private receipt','btn');saveButton.type='button';saveButton.addEventListener('click',()=>save('zikap-order-'+result.id+'.txt','Zikap project receipt\nOrder ID: '+result.id+'\nPrivate receipt key: '+result.token+'\nTrack at: https://mirkhel1380.github.io/Zikap/workspace.html#track\n\nKeep this file private. The request awaits acceptance. No payment was collected.'));const keyLabel=element('label','Your private receipt key');keyLabel.htmlFor='receipt-key';const keyInput=document.createElement('input');keyInput.id='receipt-key';keyInput.readOnly=true;keyInput.value=result.token;box.append(keyLabel,keyInput,saveButton);box.hidden=false;
      $('order-message').textContent='Your request is stored. Scope and timing still need acceptance. No payment was collected.';button.textContent='Request submitted';
      $('order-fields').disabled=true;
    }catch(e){
      message('order-message',e);
      if(!request){button.disabled=false;return;}
      $('track-id').value=request.id;$('track-key').value=request.token;
      $('order-message').textContent+=' Submission is not confirmed. You can check its status below or retry the same details on this page without creating a second request.';
      const box=$('order-receipt');box.replaceChildren(element('h3','Keep your recovery receipt'),element('p','A connection error does not confirm whether a request was saved. Keep this receipt to check the result before submitting again.'));
      const recovery=element('button','Download recovery receipt','btn ghost');recovery.type='button';recovery.addEventListener('click',()=>save('zikap-request-recovery.txt','Zikap request recovery receipt\nOrder ID: '+request.id+'\nPrivate receipt key: '+request.token+'\n\nSubmission is NOT confirmed. Check this receipt in the Zikap workspace before submitting again. No payment was collected.'));box.append(recovery);box.hidden=false;button.disabled=false;
    }
  });
  async function loadOrder(){
    $('track-message').textContent='Checking your project…';$('track-result').replaceChildren();
    try{
      const id=$('track-id').value.trim(),token=$('track-key').value.trim();
      if(!/^[a-f0-9-]{36}$/.test(id)||token.length!==72)throw new Error('Enter the order ID and private key from your receipt.');
      const order=await api('/orders/'+id,'GET',undefined,token);
      const box=element('article','', 'delivery-card');box.append(element('span',states[order.status]||order.status,'delivery-status'),element('h3','Your project update'),element('p','Website: '+order.website),element('p','Package: '+order.packageId+' · $'+order.price+' USD'),element('p','Updated: '+new Date(order.updatedAt).toLocaleString()));
      if(order.note)box.append(element('p',order.note));
      if(order.report){const report=element('pre',order.report,'delivery-report'),button=element('button','Download report','btn');button.type='button';button.addEventListener('click',()=>save('zikap-report-'+id+'.txt',order.report));box.append(report,button);}
      if(order.status==='delivered'&&!order.revisionUsed){
        const form=document.createElement('form'),label=element('label','Request your one clarification / revision');label.htmlFor='revision-note';const note=document.createElement('textarea');note.id='revision-note';note.required=true;note.maxLength=2000;note.placeholder='Describe the changes within the original agreed scope.';const submit=element('button','Send revision request','btn ghost');submit.type='submit';const status=element('p','');status.setAttribute('role','status');form.append(label,note,submit,status);form.addEventListener('submit',async e=>{e.preventDefault();submit.disabled=true;try{await api('/orders/'+id+'/revision','POST',{note:note.value},token);await loadOrder();}catch(err){status.textContent=err.message;submit.disabled=false;}});box.append(form);
      }
      $('track-result').replaceChildren(box);$('track-message').textContent='Project found. No payment has been collected through this website.';
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
  availability();
})();
