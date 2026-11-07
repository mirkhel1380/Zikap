'use strict';
(()=>{
 const labels={paid:'Payment confirmed',partially_refunded:'Partially refunded',refunded:'Refunded',pending:'Checkout pending',expired:'Checkout expired'};
 const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n/100)+' USD';
 const date=value=>{const d=new Date(value);return value&&!Number.isNaN(d.getTime())?d.toLocaleString():'Not recorded';};
 const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text)el.textContent=text;if(cls)el.className=cls;return el;};
 const button=text=>{const el=node('button',text,'btn ghost');el.type='button';return el;};
 window.ZikapPayments={mount(host,{api,openProject,onError}){
  let epoch=0,busy=false,loaded=false,cursor=null,refreshedAt='';const records=new Map();
  const controls=node('div','','payment-history-controls'),searchLabel=node('label','Find a loaded record'),search=document.createElement('input'),modeLabel=node('label','Payment mode'),mode=document.createElement('select'),refresh=button('Refresh payment records'),more=button('Load older payment records'),count=node('p','','tiny'),message=node('p','','payment-history-message'),list=node('div','','payment-history-list'),updated=node('p','','tiny');
  search.id='payment-record-search';search.type='search';search.maxLength=200;search.placeholder='Website, package or project ID';searchLabel.htmlFor=search.id;
  mode.id='payment-record-mode';modeLabel.htmlFor=mode.id;for(const [value,text]of [['all','All records'],['live','Live records'],['test','Test records']]){const option=node('option',text);option.value=value;mode.append(option);}
  const searchGroup=node('div'),modeGroup=node('div');searchGroup.append(searchLabel,search);modeGroup.append(modeLabel,mode);controls.append(searchGroup,modeGroup,refresh);message.setAttribute('role','status');count.setAttribute('role','status');host.replaceChildren(controls,message,count,list,more,updated);
  function render(){
   const query=search.value.trim().toLowerCase(),visible=[...records.values()].filter(p=>(mode.value==='all'||(mode.value==='test')===p.testMode)&&(!query||[p.website,p.packageTitle,p.packageId,p.orderId].join(' ').toLowerCase().includes(query)));
   list.replaceChildren();count.textContent=loaded?'Showing '+visible.length+' of '+records.size+' loaded payment records.'+(cursor?' Older records are available below.':''):'Payment records have not been loaded.';
   for(const p of visible){
    const card=node('article','','payment-record'),heading=node('div','','payment-record-heading'),identity=node('div'),tags=node('div','','payment-record-tags');identity.append(node('h2',p.packageTitle),node('p',p.website,'payment-record-website'));tags.append(node('span',labels[p.status],'payment-record-state state-'+p.status),node('span',p.testMode?'TEST MODE / No real charge':'Live record',p.testMode?'payment-mode-test':'payment-mode-live'));heading.append(identity,tags);card.append(heading,node('p','Project '+p.orderId,'tiny payment-project-id'));
    const details=node('dl','','payment-record-details'),paid=['paid','partially_refunded','refunded'].includes(p.status);
    for(const [title,value]of [[paid?'Paid amount':p.status==='expired'?'Previous checkout amount':'Checkout amount',money(p.amountCents)],['Recorded refund',money(p.refundedCents)],['Payment confirmed',paid?date(p.paidAt):'Not confirmed'],['Checkout started',date(p.startedAt*1000)]])details.append(node('dt',title),node('dd',value));
    const open=button('Open project');open.addEventListener('click',()=>openProject(p.orderId));card.append(details,open);list.append(card);
   }
   if(!visible.length){const empty=node('div','','dashboard-empty');empty.append(node('h2',!loaded?'Load your payment records.':records.size?'No matching loaded records.':'No saved payment records.'),node('p',!loaded?'Choose Refresh payment records to try loading the saved status.':records.size?'Try another search or payment mode. Filters cover loaded records only.':'Only linked projects with a saved checkout or payment record appear here. A project request alone does not create a payment.'));list.append(empty);}
   more.hidden=!cursor;updated.textContent=refreshedAt?'Last refresh: '+date(refreshedAt)+'. Newest checkout starts appear first.':'';
  }
  async function load(older=false){
   if(busy||older&&!cursor)return;const current=epoch;busy=true;refresh.disabled=true;more.disabled=true;message.textContent='Loading saved payment records…';
   try{
    const data=await api('/payments'+(older?'?before='+encodeURIComponent(cursor):''));if(current!==epoch||!host.isConnected)return;
    if(!Array.isArray(data.payments)||data.payments.some(p=>!Object.hasOwn(labels,p.status)||typeof p.testMode!=='boolean'||p.currency!=='usd'||!Number.isSafeInteger(p.amountCents)||p.amountCents<=0||!Number.isSafeInteger(p.refundedCents)||p.refundedCents<0||p.refundedCents>p.amountCents))throw new Error('Payment records could not be verified. Refresh before relying on the status.');
    if(!older)records.clear();for(const p of data.payments)records.set(p.orderId,p);cursor=data.next;loaded=true;if(!older)refreshedAt=data.asOf;render();message.textContent='Saved payment records loaded. Open a project for checkout or a payment-status check.';
   }catch(error){if(current!==epoch||!host.isConnected)return;if(!onError(error)){message.textContent=(error.name==='TimeoutError'?'The payment history request timed out. Please refresh.':error.message||'Payment history could not load.')+(records.size?' Previously loaded records are still shown.':'');}}
   finally{if(current===epoch){busy=false;refresh.disabled=false;more.disabled=false;}}
  }
  function clear(){epoch++;busy=false;loaded=false;cursor=null;refreshedAt='';records.clear();search.value='';mode.value='all';refresh.disabled=false;more.disabled=false;message.textContent='';render();}
  search.addEventListener('input',render);mode.addEventListener('change',render);refresh.addEventListener('click',()=>load());more.addEventListener('click',()=>load(true));clear();
  return{clear,ensureLoaded:()=>{if(!loaded)return load();}};
 }};
})();
