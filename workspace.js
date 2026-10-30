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
  function reveal(target){
    target.focus({preventScroll:true});
    target.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  }
  function showReceipt(id,token,confirmed){
    $('track-id').value=id;$('track-key').value=token;
    const box=$('order-receipt'),title=element('h3',confirmed?'Your request is received. Save your receipt.':'Submission not confirmed. Save your recovery receipt.');
    title.id='receipt-title';
    box.replaceChildren(element('span',confirmed?'YOUR PRIVATE PROJECT RECEIPT':'CONNECTION RECOVERY','eyebrow'),title,element('p',confirmed?'Download this receipt before closing or refreshing this page. It contains both details you need to return to your project.':'A connection error does not confirm whether your request was stored. Save this receipt, then check its status before trying again.'));
    const idLabel=element('label','Order ID');idLabel.htmlFor='receipt-id';
    const idInput=document.createElement('input');idInput.id='receipt-id';idInput.readOnly=true;idInput.value=id;
    const keyLabel=element('label','Private receipt key');keyLabel.htmlFor='receipt-key';
    const keyInput=document.createElement('input');keyInput.id='receipt-key';keyInput.type='password';keyInput.readOnly=true;keyInput.autocomplete='off';keyInput.value=token;
    const toggle=element('button','Show private key','btn ghost');toggle.type='button';toggle.setAttribute('aria-pressed','false');toggle.setAttribute('aria-controls','receipt-key');
    toggle.addEventListener('click',()=>{const show=keyInput.type==='password';keyInput.type=show?'text':'password';toggle.textContent=show?'Hide private key':'Show private key';toggle.setAttribute('aria-pressed',String(show));});
    const downloadReceipt=()=>{
      save('zikap-order-'+id+'.txt','Zikap '+(confirmed?'project receipt':'request recovery receipt')+'\nOrder ID: '+id+'\nPrivate receipt key: '+token+'\nTrack at: https://mirkhel1380.github.io/Zikap/workspace.html#track\n\nKeep this file private. '+(confirmed?'The request awaits acceptance.':'Submission is NOT confirmed. Check its status before submitting again.')+' No payment was collected.');
      $('receipt-download-status').textContent='Download requested. Check your browser downloads for zikap-order-'+id+'.txt and keep the file private.';
    };
    const actions=element('div','','tool-actions'),download=element('button',confirmed?'Download private receipt':'Download recovery receipt','btn');download.type='button';download.addEventListener('click',downloadReceipt);
    const track=element('button','Check this project now','btn ghost');track.type='button';track.addEventListener('click',()=>{ $('track-id').value=id;$('track-key').value=token;loadOrder();reveal($('track-form')); });
    const status=element('p','','tiny');status.id='receipt-download-status';status.setAttribute('role','status');actions.append(download,track,toggle);
    box.append(idLabel,idInput,keyLabel,keyInput,actions,status,element('p','This key belongs to this project only. It is different from the owner access key. It is not emailed to you or saved in browser storage.','tiny'));
    box.hidden=false;
    const tools=$('current-receipt-tools');tools.replaceChildren(element('strong','Your receipt is ready on this page.'),element('p','Your tracking details are already filled in. Download your receipt here or check your project below.'));
    const toolsActions=element('div','','tool-actions'),toolsDownload=element('button',confirmed?'Download private receipt':'Download recovery receipt','btn ghost');toolsDownload.type='button';toolsDownload.addEventListener('click',downloadReceipt);
    const view=element('button','View my receipt','btn ghost');view.type='button';view.addEventListener('click',()=>reveal(box));toolsActions.append(toolsDownload,view);tools.append(toolsActions);tools.hidden=false;
    reveal(box);
  }
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
      $('order-message').textContent='Your request is stored. Scope and timing still need acceptance. No payment was collected.';button.textContent='Request submitted';
      $('order-fields').disabled=true;$('order-fields').hidden=true;$('order-availability').hidden=true;
      showReceipt(result.id,result.token,true);
    }catch(e){
      message('order-message',e);
      if(!request){button.disabled=false;return;}
      $('order-message').textContent+=' Submission is not confirmed. You can check its status below or retry the same details on this page without creating a second request.';
      showReceipt(request.id,request.token,false);button.disabled=false;
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
      $('current-receipt-tools').hidden=true;
      $('track-message').textContent='Receipt opened. Use Check project status to retrieve the server’s latest update. The file itself does not confirm an accepted order.';
    }catch(e){message('track-message',e);}finally{event.target.value='';}
  });
  availability();
})();
