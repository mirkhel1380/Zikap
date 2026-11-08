import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const context={window:{}};vm.runInNewContext(await readFile(new URL('../account-static/account/recovery-file.js',import.meta.url),'utf8'),context);const {parse,mount}=context.window.ZikapRecoveryFile;
const fixture='Zikap account recovery\nEmail: fixture@example.test\nRecovery code: '+'a'.repeat(64)+'\nSign in: https://example.test/account/\n\nKeep this file private.';
const element=()=>({value:'',type:'password',files:[],textContent:'',events:{},addEventListener(name,fn){this.events[name]=fn;}});
function setup(){const controls={file:element(),email:element(),code:element(),message:element()};let active=true;const controller=mount({...controls,alive:()=>active});return {...controls,controller,deactivate(){active=false;}};}
test('account recovery parser reads its own format, CRLF/BOM and uppercase codes without following links',()=>{
 for(const text of [fixture,'\uFEFF'+fixture.replaceAll('\n','\r\n'),fixture.replace('a'.repeat(64),'A'.repeat(64)),fixture.replace('https://example.test/account/','javascript:alert(1)')]){const data=parse(text);assert.equal(data.email,'fixture@example.test');assert.equal(data.code,'a'.repeat(64));assert.deepEqual(Object.keys(data),['email','code']);}
});
test('receipt, duplicate, incomplete and oversized recovery files fail without echoing credential contents',()=>{
 for(const text of ['Order ID: fixture\nPrivate receipt key: '+'b'.repeat(72),fixture+'\nEmail: another@example.test',fixture+'\nRecovery code: '+'b'.repeat(64),fixture.replace('a'.repeat(64),'wrong'),fixture.replace('fixture@example.test','not an email'),'x'.repeat(12001)]){assert.throws(()=>parse(text),error=>!error.message.includes('a'.repeat(64))&&!error.message.includes('b'.repeat(64)));}
});
test('reading fills only masked account fields and clears file selection; oversized files are never read',async()=>{
 const s=setup();s.file.files=[{size:fixture.length,text:async()=>fixture}];s.file.value='fixture.txt';await s.file.events.change();assert.equal(s.email.value,'fixture@example.test');assert.equal(s.code.value,'a'.repeat(64));assert.equal(s.code.type,'password');assert.equal(s.file.value,'');assert.match(s.message.textContent,/checked when you submit/);
 let read=false;s.file.files=[{size:12001,text:async()=>{read=true;return fixture;}}];await s.file.events.change();assert.equal(read,false);assert.equal(s.code.value,'');assert.match(s.message.textContent,/smaller than 12 KB/);
});
test('delayed file reads cannot repopulate a cleared form, hidden mode, or manually edited fields',async()=>{
 for(const action of ['clear','hidden','edit']){const s=setup();let complete;s.file.files=[{size:fixture.length,text:()=>new Promise(resolve=>complete=resolve)}];const pending=s.file.events.change();
  if(action==='clear')s.controller.clear();if(action==='hidden')s.deactivate();if(action==='edit'){s.email.value='manual@example.test';s.email.events.input();}
  complete(fixture);await pending;assert.equal(s.code.value,'');assert.equal(s.email.value,action==='edit'?'manual@example.test':'');assert.equal(s.file.value,'');}
});
