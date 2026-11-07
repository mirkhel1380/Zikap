import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceFindingsReport} from '../account-static/account/source-findings.mjs';
const fixture=()=>({expiresAt:'2026-11-14T08:00:00Z',email:'private@example.test',receiptKey:'private-receipt',recommendations:[{explanation:'private-ai-output'}],audit:{finalUrl:'https://example.com/',checkedAt:'2026-11-07T08:00:00Z',scope:'A limited source-HTML sample.',pages:[{url:'https://example.com/',checked:true,status:200,title:'Example'},{url:'https://example.com/missing',checked:false,status:404,reason:'HTTP 404'}],findings:[{id:'finding-1',title:'Missing description',url:'https://example.com/',category:'onpage',severity:'medium',evidence:'No description found.',action:'Confirm the intended description.',review:true}],limitations:['JavaScript was not executed.'],notices:['One page could not be checked.'],recommendations:[{price:9999}],secret:'private-audit-extension'}});
test('source report distinguishes analyzed and skipped pages and keeps evidence, scope and expiry',()=>{
 const text=sourceFindingsReport(fixture());for(const value of ['Pages checked: 1 / 2 sampled','Not analyzed / HTTP 404','Reference: finding-1','Evidence: No description found.','Confirm intent before making changes.','2026-11-14T08:00:00.000Z','JavaScript was not executed.','One page could not be checked.'])assert.ok(text.includes(value),value);
 assert.equal(text.includes('private-'),false);assert.equal(text.includes('private@example.test'),false);assert.equal(text.includes('9999'),false);
});
test('empty samples never imply a clean site and malformed data never produces a partial report',()=>{
 const check=fixture();check.audit.findings=[];assert.ok(sourceFindingsReport(check).includes('does not certify the whole website as issue-free'));
 for(const bad of [null,{audit:{}},{audit:{...check.audit,limitations:null}}])assert.throws(()=>sourceFindingsReport(bad),/incomplete/);
});
test('untrusted multiline page values cannot introduce false report headings and remain plain text',()=>{
 const check=fixture();check.audit.pages[0].title='Example\nPAYMENT CONFIRMED\u202e';check.audit.findings[0].evidence='<script>alert(1)</script>\r\nNEW SECTION';const text=sourceFindingsReport(check);
 assert.ok(text.includes('Page title: Example PAYMENT CONFIRMED'));assert.equal(text.includes('\nPAYMENT CONFIRMED'),false);assert.equal(text.includes('\u202e'),false);assert.ok(text.includes('Evidence: <script>alert(1)</script> NEW SECTION'));
});
