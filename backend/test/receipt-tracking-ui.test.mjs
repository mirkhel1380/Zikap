import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../../workspace.js',import.meta.url),'utf8');
const idA='11111111-1111-4111-8111-111111111111',idB='22222222-2222-4222-8222-222222222222',keyA='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'.repeat(2),keyB='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'.repeat(2);
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function setup(){
 class El{
  constructor(tag='div'){this.tag=tag;this.children=[];this.handlers={};this.value='';this.files=[];this.isConnected=false;}
  connected(value){this.isConnected=value;for(const n of this.children)n.connected(value);}
  append(...nodes){this.children.push(...nodes);for(const n of nodes)n.connected(this.isConnected);}
  replaceChildren(...nodes){for(const n of this.children)n.connected(false);this.children=[];this.append(...nodes);}
  addEventListener(type,fn){(this.handlers[type]??=[]).push(fn);}
  setAttribute(){}
  async fire(type,event={}){for(const fn of this.handlers[type]||[])await fn({target:this,preventDefault(){},...event});}
 }
 const els=Object.fromEntries(['track-id','track-key','track-result','track-message','track-form','track-button','receipt-import'].map(id=>[id,new El()]));for(const el of Object.values(els))el.isConnected=true;
 const calls=[],events={};const context={window:{ZIKAP_API_BASE:'https://fixture.test'},document:{getElementById:id=>els[id],createElement:tag=>new El(tag)},addEventListener:(type,fn)=>events[type]=fn,AbortSignal:{timeout:()=>null},URL:{},Blob,setTimeout:()=>0,fetch:async(url,opts={})=>{if(url.endsWith('/health'))return{ok:true,json:async()=>({ready:true})};return new Promise(resolve=>calls.push({url,opts,finish:(data,ok=true)=>resolve({ok,json:async()=>data})}));}};
 vm.runInNewContext(source,context);await tick();
 const change=async(id,key)=>{els['track-id'].value=id;await els['track-id'].fire('input');els['track-key'].value=key;await els['track-key'].fire('input');};
 const submit=()=>els['track-form'].fire('submit');const finish=async(call,data,ok=true)=>{call.finish(data,ok);await tick();};
 const text=n=>[n.textContent||'',...n.children.map(text)].join(' ');
 return{els,calls,events,change,submit,finish,text:()=>text(els['track-result'])};
}
const order=website=>({status:'delivered',website,packageId:'audit',price:29,updatedAt:'2026-11-09T00:00:00Z',report:'Synthetic report',revisionUsed:false});
test('only the current receipt request can render a report or error',async()=>{
 const a=await setup();await a.change(idA,keyA);await a.submit();await a.change(idB,keyB);await a.submit();await a.finish(a.calls[1],order('https://second.test'));await a.finish(a.calls[0],{error:'Old request failed'},false);assert.ok(a.text().includes('https://second.test'));assert.match(a.els['track-message'].textContent,/Project found/);
});
test('editing receipt details clears private results immediately and pagehide clears credentials',async()=>{
 const a=await setup();await a.change(idA,keyA);await a.submit();await a.finish(a.calls[0],order('https://first.test'));assert.ok(a.text().includes('Synthetic report'));a.els['track-key'].value=keyB;await a.els['track-key'].fire('input');assert.equal(a.els['track-result'].children.length,0);await a.change(idA,keyA);await a.submit();a.events.pagehide();await a.finish(a.calls[1],order('https://late.test'));assert.equal(a.els['track-id'].value,'');assert.equal(a.els['track-key'].value,'');assert.equal(a.els['track-result'].children.length,0);
});
test('a delayed receipt file cannot overwrite manual receipt edits',async()=>{
 const a=await setup(),file=a.els['receipt-import'];let done;file.files=[{size:300,text:()=>new Promise(resolve=>done=resolve)}];const pending=file.fire('change');await a.change(idB,keyB);done('Order ID: '+idA+'\nPrivate receipt key: '+keyA);await pending;assert.equal(a.els['track-id'].value,idB);assert.equal(a.els['track-key'].value,keyB);assert.equal(a.calls.length,0);
});
test('a newer receipt file wins without retrieving a project automatically',async()=>{
 const a=await setup(),file=a.els['receipt-import'];let done;file.files=[{size:300,text:()=>new Promise(resolve=>done=resolve)}];const first=file.fire('change');file.files=[{size:300,text:async()=> 'Order ID: '+idB+'\nPrivate receipt key: '+keyB}];await file.fire('change');done('Order ID: '+idA+'\nPrivate receipt key: '+keyA);await first;assert.equal(a.els['track-id'].value,idB);assert.equal(a.els['track-key'].value,keyB);assert.equal(a.calls.length,0);
});
test('late revision completion cannot reload a different receipt or submit twice',async()=>{
 const a=await setup();await a.change(idA,keyA);await a.submit();await a.finish(a.calls[0],order('https://first.test'));const form=a.els['track-result'].children[0].children.find(n=>n.tag==='form'),note=form.children.find(n=>n.tag==='textarea');note.value='Please clarify';const revision=form.fire('submit');await form.fire('submit');assert.equal(a.calls.length,2);assert.equal(note.disabled,true);await a.change(idB,keyB);await a.submit();await a.finish(a.calls[2],order('https://second.test'));await a.finish(a.calls[1],{ok:true});await revision;assert.equal(a.calls.length,3);assert.ok(a.text().includes('https://second.test'));assert.ok(!a.text().includes('https://first.test'));
});
