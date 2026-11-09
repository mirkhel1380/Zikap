'use strict';
(()=>{
 function suggestions(orders){
  const items=[];
  for(const order of orders){let kind,title,description,rank;
   if(Number.isInteger(order.unreadMessages)&&order.unreadMessages>0){kind='messages';rank=0;title='Read project messages';description=order.unreadMessages+' unread message'+(order.unreadMessages===1?'':'s')+'. Open the project conversation for the latest questions and updates.';}
   else if(order.checkoutEligible===true&&order.payment?.available===true&&['unpaid','pending'].includes(order.payment.status)){kind='checkout';rank=1;title=order.payment.status==='pending'?'Check pending checkout':'Complete package payment';description=order.payment.status==='pending'?'A checkout is pending. Check its latest status in the project before trying another payment.':'Review the saved package scope and one-time price, then continue to Stripe checkout.';if(order.payment.testMode===true)description+=' Test mode: no real charge.';}
   else if(order.status==='delivered'&&typeof order.report==='string'&&order.report.trim()){kind='report';rank=2;title='Read delivered report';description=order.revisionUsed?'Your report is available. Your included clarification has already been requested; check the latest update.':'Your report is available to read and download. You can request one clarification within the original agreed scope.';}
   else continue;
   items.push({id:order.id,website:order.website,packageTitle:order.packageTitle||order.packageId,updatedAt:order.updatedAt,kind,title,description,rank});
  }
  return items.sort((a,b)=>a.rank-b.rank||String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))||String(a.id).localeCompare(String(b.id)));
 }
 const el=(tag,text,cls)=>{const node=document.createElement(tag);node.textContent=text;if(cls)node.className=cls;return node;};
 function mount(host,{openProject}){
  let generation=0;
  function clear(){generation++;host.replaceChildren();host.hidden=true;}
  function render(orders,{state='loading',hasMore=false}={}){
   clear();if(state==='ready'&&!orders.length)return;host.hidden=false;const current=generation,heading=el('div','','section-heading'),titles=el('div',''),all=el('a','Browse projects','btn ghost');all.href='#projects';titles.append(el('span','YOUR NEXT STEPS','eyebrow'),el('h2','Know what to do next.'));heading.append(titles,all);host.append(heading);
   const status=el('p','','tiny');status.setAttribute('role','status');const items=suggestions(orders),shown=items.slice(0,6),list=el('div','','next-steps-grid');
   if(state==='loading')status.textContent='Refreshing project information. Previous suggestions may be out of date.';
   else if(state==='error')status.textContent='Could not refresh next steps. Use Refresh above before relying on these suggestions. Previous suggestions may be out of date.';
   else status.textContent='Showing '+shown.length+' of '+items.length+' suggested next steps from '+orders.length+' loaded projects.'+(hasMore?' Older projects are available in My projects.':'')+' One suggestion per project; report-reading completion is not tracked.';
   host.append(status,list);
   for(const item of shown){const card=el('article','','next-action-card'),type=el('span',({messages:'MESSAGES',checkout:'CHECKOUT',report:'REPORT'})[item.kind],'eyebrow'),open=el('button','Open project','btn ghost');let site=item.website;try{site=new URL(site).hostname;}catch{}
    card.append(type,el('h3',item.title),el('strong',site),el('p',item.packageTitle,'tiny'),el('p',item.description));open.type='button';open.disabled=state!=='ready';open.setAttribute('aria-label','Open '+item.kind+' project for '+site);open.addEventListener('click',()=>{if(current===generation&&!open.disabled)openProject(item.id);});card.append(open);list.append(card);
   }
   if(!items.length&&state==='ready')list.append(el('p','No message, checkout or delivered-report prompts in the loaded projects. Browse My projects for other updates.','note'));
  }
  return {render,clear};
 }
 window.ZikapNextSteps={suggestions,mount};
})();
