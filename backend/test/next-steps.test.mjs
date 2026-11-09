import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const context={window:{}};vm.runInNewContext(await readFile(new URL('../account-static/account/next-steps.js',import.meta.url),'utf8'),context);const {suggestions}=context.window.ZikapNextSteps;
const order=(id,patch={})=>({id,website:'https://example.test/'+id,packageTitle:'Saved package',packageId:'audit',status:'requested',checkoutEligible:false,updatedAt:'2026-11-08T10:00:00.000Z',unreadMessages:0,...patch});
test('next steps prioritize real unread messages, keep one suggestion per project and sort ties deterministically',()=>{
 const result=suggestions([order('report',{status:'delivered',report:'Report'}),order('checkout',{status:'accepted',checkoutEligible:true,payment:{available:true,status:'pending'}}),order('message',{status:'accepted',unreadMessages:2,payment:{available:true,status:'pending'}}),order('waiting')]);
 assert.equal(result.map(x=>x.kind).join(','),'messages,checkout,report');assert.equal(result[0].id,'message');assert.match(result[0].description,/2 unread messages/);assert.equal(new Set(result.map(x=>x.id)).size,result.length);
 assert.equal(suggestions([order('b',{unreadMessages:1}),order('a',{unreadMessages:1})]).map(x=>x.id).join(','),'a,b');
 assert.equal(suggestions([order('old',{unreadMessages:1,updatedAt:'2026-11-07T10:00:00.000Z'}),order('new',{unreadMessages:1})])[0].id,'new');
});
test('checkout prompts never request repayment for paid/refunded, unaccepted or unavailable checkouts',()=>{
 for(const status of ['paid','partially_refunded','refunded','unknown'])assert.equal(suggestions([order(status,{status:'accepted',checkoutEligible:true,payment:{available:true,status}})]).length,0);
 for(const status of ['requested','in_progress','delivered','declined'])assert.equal(suggestions([order(status,{status,payment:{available:true,status:'unpaid'}})]).length,0);
 assert.equal(suggestions([order('off',{status:'accepted',checkoutEligible:true,payment:{available:false,status:'unpaid'}})]).length,0);
 const pending=suggestions([order('pending',{status:'accepted',checkoutEligible:true,payment:{available:true,status:'pending',testMode:true}})])[0];assert.match(pending.description,/before trying another payment/);assert.match(pending.description,/Test mode: no real charge/);
 assert.equal(suggestions([order('unpaid',{status:'accepted',checkoutEligible:true,payment:{available:true,status:'unpaid'}})])[0].title,'Complete package payment');
});
test('report prompts require a real delivered report and do not imply unread tracking or an unused revision',()=>{
 for(const [status,report] of [['in_progress','Draft'],['revision_requested','Current report'],['delivered','  '],['delivered',null]])assert.equal(suggestions([order('skip',{status,report})]).length,0);
 const used=suggestions([order('delivered',{status:'delivered',report:'Useful report',revisionUsed:true})])[0];assert.match(used.description,/already been requested/);assert.doesNotMatch(used.description,/unread|not read/i);
 const available=suggestions([order('delivered',{status:'delivered',report:'Useful report',revisionUsed:false})])[0];assert.match(available.description,/one clarification within the original agreed scope/);
 for(const unreadMessages of [undefined,NaN,-1,'2'])assert.equal(suggestions([order('unknown',{unreadMessages})]).length,0);
});

test('requested fixed packages can prompt payment only with explicit server eligibility',()=>{
 const eligible=order('direct',{checkoutEligible:true,payment:{available:true,status:'unpaid'}});
 assert.equal(suggestions([eligible])[0].kind,'checkout');
 assert.equal(suggestions([{...eligible,checkoutEligible:false}]).length,0);
 for(const status of ['paid','refunded','partially_refunded'])assert.equal(suggestions([{...eligible,payment:{available:true,status}}]).length,0);
});
