import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const context={window:{},URL,URLSearchParams};vm.runInNewContext(await readFile(new URL('../account-static/account/intake-handoff.js',import.meta.url),'utf8'),context);const {parse,create}=context.window.ZikapIntake;
test('all four public package choices survive a one-time handoff without accepting price or consent from the URL',()=>{
 for(const id of ['audit','keywords','onpage','bundle']){const handoff=create('?package='+id+'&price=1&consent=true');assert.equal(handoff.hasSelection(),true);const selection=handoff.take();assert.equal(selection.packageId,id);assert.deepEqual(Object.keys(selection).sort(),['packageId','pages','website']);assert.equal(handoff.take(),null);assert.equal(handoff.hasSelection(),false);}
 for(const id of ['unknown','__proto__','constructor',''])assert.equal(parse('?package='+id).packageId,null);
});
test('linked URLs are normalized and credential-bearing, foreign, query and oversized page lists are rejected',()=>{
 const query=data=>'?'+new URLSearchParams(data);const valid=parse(query({package:'onpage',website:'https://example.com/#section',pages:'https://example.com/a#heading\r\nhttps://example.com/b'}));assert.equal(valid.website,'https://example.com/');assert.equal(valid.pages,'https://example.com/a\nhttps://example.com/b');
 for(const website of ['https://user:pass@example.com','https://example.com/?token=private','ftp://example.com','javascript:alert(1)','/relative','x'.repeat(501)])assert.equal(parse(query({package:'bundle',website})).website,'');
 for(const pages of ['https://other.test/a','http://example.com/a','https://example.com/?token=private','blob:https://example.com/id','https://user:pass@example.com/a',Array(6).fill('https://example.com/a').join('\n'),'x'.repeat(2601)]){const value=parse(query({website:'https://example.com/',pages}));assert.equal(value.website,'https://example.com/');assert.equal(value.pages,'');}
 assert.equal(parse(query({website:'https://example.com'})).pages,'https://example.com/');
});
test('clearing a pending handoff prevents its reuse by a later account',()=>{
 const intent=create('?'+new URLSearchParams({package:'bundle',website:'https://example.com'}));assert.equal(intent.hasSelection(),true);intent.clear();assert.equal(intent.hasSelection(),false);assert.equal(intent.take(),null);
});
