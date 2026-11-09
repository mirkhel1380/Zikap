import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../account-static/account/account.js',import.meta.url),'utf8');
const start=source.indexOf("$('project-form').addEventListener('submit',async event=>{"),end=source.indexOf(" $('check-request-submission').addEventListener",start);
const handlerSource=source.slice(start,end);
const recovery=await readFile(new URL('../account-static/account/request-recovery.js',import.meta.url),'utf8');
function setup({ack=true,price=29,delayed=false,failure=false}={}){
 const fields={package:'audit',website:'https://example.test',pages:'https://example.test/',topic:'Topic',language:'English',market:'United States',goals:'A useful technical review.'};
 const elements=Object.fromEntries(Object.entries(fields).map(([key,value])=>['project-'+key,{value}]));
 elements['project-consent']={checked:true};elements['project-payment-confirm']={checked:ack,reportValidity(){}};elements['project-message']={textContent:''};
 let handler,complete;
 elements['project-form']={addEventListener(type,fn){handler=fn;},reportValidity(){}};
 const calls=[],details=[],order={id:'saved-project',packageId:'audit',price,packageTitle:'Technical SEO Starter',packageDescription:'Fixed scope'};
 const ctx=vm.createContext({window:{},epoch:1,detailVersion:0,requestSubmitting:false,requestChecking:false,pending:null,currentCatalog:[{id:'audit',price:29,title:'Technical SEO Starter',description:'Fixed scope',version:1}],
  $:id=>elements[id],requestReadiness:()=>({errors:{}}),requestBusy:busy=>ctx.requestSubmitting=busy,makeUUID:()=>crypto.randomUUID(),
  api:async(path,method,body)=>{calls.push({path,method,body});if(delayed)await new Promise(resolve=>complete=resolve);if(failure)throw new Error('Synthetic lost response');return{order};},
  resetSavedBrief:()=>ctx.pending=null,loadProjects:async()=>{},detail:(...args)=>details.push(args),loadCatalog:async()=>{},sessionError:()=>false,errorText:e=>e.message});
 vm.runInContext(recovery,ctx);vm.runInContext(handlerSource,ctx);
 return{ctx,elements,calls,details,submit:()=>handler({preventDefault(){}}),complete:()=>complete()};
}
test('a confirmed brief saves once and requests automatic checkout for its exact saved scope and price',async()=>{
 const a=setup();await a.submit();assert.equal(a.calls.length,1);assert.equal(a.calls[0].path,'/orders');assert.equal(a.calls[0].body.quotedPrice,29);assert.equal(a.details.length,1);assert.equal(a.details[0][1].directCheckout,true);assert.equal(a.ctx.pending,null);
});
test('leaving the form during a delayed save prevents a late checkout redirect even after returning',async()=>{
 const a=setup({delayed:true}),saving=a.submit();a.ctx.detailVersion+=2;a.complete();await saving;assert.equal(a.calls.length,1);assert.equal(a.details.length,0);assert.equal(a.ctx.requestSubmitting,false);
});
test('a stored quote mismatch opens review without automatically acknowledging a different amount',async()=>{
 const a=setup({price:19});await a.submit();assert.equal(a.details.length,1);assert.equal(a.details[0][1].directCheckout,false);
});
test('a lost save response retains the reference for an idempotent retry',async()=>{
 const a=setup({failure:true});await a.submit();assert.equal(a.ctx.pending.uncertain,true);await a.submit();assert.equal(a.calls.length,2);assert.equal(a.calls[0].body.requestId,a.calls[1].body.requestId);assert.equal(a.details.length,0);
});
test('missing explicit payment acknowledgement cannot submit a brief for automatic checkout',async()=>{
 const a=setup({ack:false});await a.submit();assert.equal(a.calls.length,0);assert.equal(a.details.length,0);
});
