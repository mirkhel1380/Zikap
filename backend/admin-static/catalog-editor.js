'use strict';
(()=>{
 const drafts=new Set(),node=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
 window.ZikapCatalogEditor={hasDraft:()=>drafts.size>0,clear:()=>drafts.clear(),mount(host,{services,api,scopeFor,onSaved}){
  host.replaceChildren();
  host.append(node('p','Edit the public package name, summary and one-time USD price. Fixed page/keyword limits stay as shown. Publishing affects new requests; existing requests keep their saved package and price.','catalog-explanation'));
  for(const original of services){
   let saved={...original},busy=false,changed=false;
   const form=node('form',null,'deliverable-card service-card catalog-editor'),heading=node('h2',saved.title),meta=node('p','Version '+saved.version,'tiny'),status=node('p');status.setAttribute('role','status');
   form.append(node('span','EDITABLE SERVICE / ONE-TIME USD','eyebrow'),heading,meta);
   const field=(text,type,value,max)=>{const label=node('label',text),input=node(type==='textarea'?'textarea':'input');input.id='catalog-'+original.id+'-'+(max||'price');if(type!=='textarea')input.type=type;input.value=value;input.required=true;if(max)input.maxLength=max;label.htmlFor=input.id;form.append(label,input);return input;};
   const title=field('Public package name','text',saved.title,80),description=field('Public summary','textarea',saved.description,400),price=field('One-time price in USD','number',saved.price);price.min=1;price.max=9999;price.step=1;
   const scope=node('p','Fixed service scope: '+scopeFor(saved.id),'catalog-scope tiny'),actions=node('div',null,'actions'),publish=node('button','Publish package changes','btn'),reload=node('button','Load latest saved','btn ghost');publish.type='submit';reload.type='button';actions.append(publish,reload);form.append(scope,node('p','No monthly billing, automatic refund or change to an existing order is created here.','tiny'),actions,status);host.append(form);
   const alive=()=>form.isConnected;
   function controls(){for(const x of [title,description,price,publish,reload])x.disabled=busy;publish.disabled=busy||!changed;}
   function populate(service){saved={...service};title.value=saved.title;description.value=saved.description;price.value=saved.price;heading.textContent=saved.title;meta.textContent='Saved version '+saved.version+' / '+(saved.updatedAt?new Date(saved.updatedAt).toLocaleString():'Original catalog');changed=false;drafts.delete(saved.id);controls();}
   form.addEventListener('input',()=>{changed=true;drafts.add(saved.id);status.textContent='Unpublished package draft.';controls();});
   reload.addEventListener('click',async()=>{if(changed&&!confirm('Replace this unpublished package draft with the latest saved version?'))return;busy=true;controls();try{const data=await api('catalog');if(!alive())return;populate(data.services.find(s=>s.id===saved.id));status.textContent='Latest saved package loaded.';}catch(e){if(alive())status.textContent=e.message;}finally{if(alive()){busy=false;controls();}}});
   form.addEventListener('submit',async e=>{e.preventDefault();if(busy||!changed)return;const amount=Number(price.value);if(!Number.isInteger(amount)||amount<1||amount>9999){status.textContent='Enter a whole-USD price from $1 to $9,999.';return;}if(!confirm('Publish '+title.value.trim()+' at $'+amount+' USD, one time, for new requests? Existing orders keep their saved price.'))return;
    busy=true;controls();status.textContent='Publishing package…';try{const result=await api('catalog/'+saved.id,'PATCH',{title:title.value,description:description.value,price:amount,expectedVersion:saved.version});if(!alive())return;populate(result.service);status.textContent='Published. New requests use this version; existing orders retain their saved price.';onSaved(result.service);}catch(e){if(alive())status.textContent=e.message;}finally{if(alive()){busy=false;controls();}}
   });controls();
  }
 }};
})();
