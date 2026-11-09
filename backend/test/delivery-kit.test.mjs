import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const context={window:{}};vm.runInNewContext(await readFile(new URL('../admin-static/delivery-kit.js',import.meta.url),'utf8'),context);const kit=context.window.ZikapDeliveryKit;
const base={website:'https://example.test/',pages:JSON.stringify(['https://example.test/a','https://example.test/b']),topic:'Garden supplies',language:'English',market:'Afghanistan',goals:'Clarify product pages'};
const p={title:'Example package',scope:'Agreed example scope'};
test('technical outline preserves requested scope without fabricating review findings',()=>{
 const text=kit.outline({...base,package_id:'audit'},p);assert.ok(text.includes('Page 1: https://example.test/a'));assert.ok(text.includes('Page 2: https://example.test/b'));assert.ok(text.includes('Review status and access evidence: [ADD'));assert.ok(text.includes(base.goals));assert.ok(!text.includes('KEYWORD IDEAS'));assert.ok(!text.includes('ON-PAGE EDIT BRIEFS'));
});
test('keyword and bundle outlines have exactly 25 research slots and no live metric claims',()=>{
 for(const id of ['keywords','bundle']){const text=kit.outline({...base,package_id:id},p);assert.equal((text.match(/^\d{2}\. \[ADD phrase/gm)||[]).length,25);assert.ok(text.includes('No live volume or difficulty data.'));assert.ok(text.includes('PAGE MAP (UP TO 5 PAGES)'));}
});
test('on-page scope uses supplied pages and bundle does not silently pick three out of five',()=>{
 const text=kit.outline({...base,package_id:'onpage'},p);assert.equal((text.match(/^On-page brief \d/gm)||[]).length,2);assert.ok(text.includes('Page URL: https://example.test/a'));
 const pages=Array.from({length:5},(_,i)=>'https://example.test/'+i),bundle=kit.outline({...base,pages:JSON.stringify(pages),package_id:'bundle'},p);assert.equal((bundle.match(/^On-page brief \d/gm)||[]).length,3);assert.equal((bundle.match(/^Page URL: \[ADD confirm selected/gm)||[]).length,3);for(const url of pages)assert.ok(bundle.includes(url));
});
test('guides require real agreement, evidence and preview rather than setting fake delivery timing',()=>{
 for(const id of ['audit','keywords','onpage','bundle']){const guide=kit.guide({package_id:id});assert.equal(guide.length,6);assert.ok(guide.some(x=>x.includes('date and time zone')));assert.ok(guide.some(x=>x.includes('replace every [ADD ...]')));}
 assert.equal(kit.guide({package_id:'unknown'}).length,0);assert.equal(kit.outline({...base,package_id:'unknown'},p),'');assert.equal(kit.outline({...base,package_id:'audit'},null),'');
});
test('malformed stored page data does not masquerade as a reviewed URL list',()=>{
 for(const pages of ['not JSON','{}','null'])assert.equal(kit.requestedPages({pages}).length,0);assert.equal(kit.requestedPages({pages:[null,4,'https://example.test/a']}).length,1);
});
