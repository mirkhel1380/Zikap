import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../admin-static/fulfillment.js',import.meta.url),'utf8');
const context={window:{}};vm.runInNewContext(source,context);const {describe,mount}=context.window.ZikapFulfillment;
const payment={available:true,status:'paid',testMode:false,amountCents:2900,currency:'usd',refundedCents:0};
const order=(patch={})=>({status:'requested',report:'',payment:{...payment},...patch});
test('a real confirmed direct payment queues requested and accepted orders without requiring owner acceptance',()=>{
 for(const status of ['requested','accepted']){const m=describe(order({status}));assert.equal(m.readyForWork,true);assert.equal(m.stage,'paid_queue');assert.equal(m.steps[0].state,'done');assert.match(m.description,/before work begins/);assert.equal(m.steps[2].state,'pending');assert.equal(m.steps[3].state,'pending');}
});
test('test payments, missing mode, unknown amounts, currencies and unconfirmed payments never enter the real paid queue',()=>{
 for(const patch of [{testMode:true},{testMode:null},{testMode:undefined},{amountCents:0},{amountCents:'2900'},{currency:'eur'},{refundedCents:undefined},{refundedCents:500},{status:'pending'},{status:'unpaid'},{status:'unknown'}])assert.equal(describe(order({payment:{...payment,...patch}})).readyForWork,false,JSON.stringify(patch));
 const m=describe(order({payment:{...payment,testMode:true}}));assert.match(m.title,/Test payment/);assert.match(m.description,/no real charge/);
});
test('partial/full refunds and closed orders supersede a work prompt and never imply repayment or automatic refund',()=>{
 for(const status of ['partially_refunded','refunded']){const m=describe(order({payment:{...payment,status,refundedCents:status==='refunded'?2900:500}}));assert.equal(m.readyForWork,false);assert.match(m.title,/refund/i);assert.doesNotMatch(m.description,/continue directly to Stripe/);}
 assert.equal(describe(order({status:'declined'})).stage,'closed');assert.equal(describe(order({status:'declined'})).readyForWork,false);
});
test('fulfillment progresses only from recorded project state and a delivered report',()=>{
 const working=describe(order({status:'in_progress'}));assert.equal(working.stage,'working');assert.equal(working.steps[2].state,'current');assert.equal(working.steps[3].state,'pending');assert.equal(working.readyForWork,false);
 const delivered=describe(order({status:'delivered',report:'Actual completed findings.'}));assert.equal(delivered.stage,'delivered');assert.equal(delivered.steps[3].state,'done');
 const missing=describe(order({status:'delivered',report:'  '}));assert.equal(missing.stage,'delivery_review');assert.equal(missing.steps[3].state,'pending');
 const draft=describe(order({status:'in_progress',report:'An unfinished saved draft.'}));assert.equal(draft.steps[3].state,'pending');
});
test('revision shows the previous report without claiming the clarification is complete',()=>{
 const m=describe(order({status:'revision_requested',report:'Previous report.'}));assert.equal(m.stage,'revision');assert.equal(m.steps[2].label,'Clarification review');assert.equal(m.steps[2].state,'current');assert.equal(m.steps[3].state,'done');
});
test('legacy work without recorded Stripe payment does not invent confirmation or demand another payment',()=>{
 const m=describe(order({status:'in_progress',payment:{available:true,status:'unpaid'}}));assert.equal(m.stage,'working');assert.equal(m.steps[0].state,'pending');assert.equal(m.steps[0].label,'Payment not recorded');assert.doesNotMatch(m.description,/pay|Stripe/);
});
test('pending and unavailable records give explicit status, never a false paid confirmation',()=>{
 assert.equal(describe(order({payment:{...payment,status:'pending'}})).stage,'payment_pending');
 const m=describe(order({payment:{available:false,status:'unpaid'}}));assert.equal(m.stage,'payment_review');assert.match(m.description,/unavailable/);assert.equal(m.steps[0].state,'current');
});
test('owner and customer assets share exactly the same phase and payment rules',async()=>{
 assert.equal(await readFile(new URL('../account-static/account/fulfillment.js',import.meta.url),'utf8'),source);
 assert.equal(await readFile(new URL('../account-static/account/fulfillment.css',import.meta.url),'utf8'),await readFile(new URL('../admin-static/fulfillment.css',import.meta.url),'utf8'));
});
test('rendering twice replaces the old phase without creating duplicate steps or recording work',()=>{
 class Element{constructor(){this.children=[];this.attrs={};this.classList={add(){}};}append(...nodes){this.children.push(...nodes);}replaceChildren(){this.children=[];}setAttribute(k,v){this.attrs[k]=v;}}
 context.document={createElement:()=>new Element()};const host=new Element();mount(host,order(),{owner:true});mount(host,order({status:'delivered',report:'Complete report.'}),{owner:true});
 const lists=host.children.filter(x=>x.className==='fulfillment-steps');assert.equal(lists.length,1);assert.equal(lists[0].children.length,4);assert.equal(host.attrs['aria-label'],'Fulfillment workflow');assert.equal(host.children.find(x=>x.textContent==='Your report is ready').textContent,'Your report is ready');
});

test('recorded scope survives refund review and used clarification never invites a second included request',()=>{
 const refund=describe(order({status:'accepted',payment:{...payment,status:'partially_refunded',refundedCents:500}}));assert.equal(refund.steps[1].state,'done');
 const used=describe(order({status:'delivered',report:'Finished revision.',revisionUsed:true}));assert.match(used.description,/already been requested/);assert.doesNotMatch(used.description,/use the included clarification option/);
 for(const status of ['paid','unknown'])assert.doesNotMatch(describe(order({payment:{available:true,status}})).description,/continue directly to Stripe/);
});
