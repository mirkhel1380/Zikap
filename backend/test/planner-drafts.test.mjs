import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../../content-planner.js',import.meta.url),'utf8');
function setup(){
 class El{
  constructor(tag='div'){this.tag=tag;this.value='';this.children=[];this.dataset={};this.handlers={};this.files=[];this.hidden=false;}
  addEventListener(type,fn){(this.handlers[type]??=[]).push(fn);}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=nodes;}
  async fire(type,event={}){for(const fn of this.handlers[type]||[])await fn({target:this,preventDefault(){},...event});}
  click(){}
 }
 const ids=[...source.matchAll(/\$\('([^']+)'\)/g)].map(x=>x[1]),elements=Object.fromEntries(ids.map(id=>[id,new El()])),storage=new Map(),events={},answers=[];let prompts=0;
 const context={document:{getElementById:id=>elements[id],createElement:tag=>new El(tag)},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},confirm:()=>{prompts++;return answers.shift()??false;},addEventListener:(type,fn)=>events[type]=fn,URL:{createObjectURL:()=> 'blob:preview',revokeObjectURL(){}},Blob,setTimeout:()=>0};
 vm.runInNewContext(source,context);
 const title=()=>elements['plan-rows'].children[0].children.find(n=>n.tag==='input');
 const edit=async text=>{title().value=text;await title().fire('input');};
 const unload=()=>{let prevented=false;events.beforeunload({preventDefault(){prevented=true;}});return prevented;};
 const sample=()=>elements['plan-sample'].fire('click'),save=()=>elements['plan-save-device'].fire('click'),backup=()=>storage.get('zikap-content-plan-v1');
 return {elements,storage,answers,title,edit,unload,sample,save,backup,prompts:()=>prompts};
}
test('sample replacement cancellation preserves edited plan and setup fields',async()=>{
 const a=setup();await a.sample();await a.edit('My actual edited title');a.elements['plan-business'].value='My business';a.answers.push(false);await a.sample();assert.equal(a.title().value,'My actual edited title');assert.equal(a.elements['plan-business'].value,'My business');assert.equal(a.prompts(),1);assert.equal(a.unload(),true);
});
test('saved-plan restore asks before discarding edits and a confirmed restore matches the device copy',async()=>{
 const a=setup();await a.sample();await a.save();const original=a.title().value;assert.equal(a.unload(),false);await a.edit('New title');a.answers.push(false);await a.elements['plan-restore'].fire('click');assert.equal(a.title().value,'New title');assert.equal(a.unload(),true);a.answers.push(true);await a.elements['plan-restore'].fire('click');assert.equal(a.title().value,original);assert.equal(a.unload(),false);
});
test('delayed file reads cannot replace a more recent plan edit',async()=>{
 const a=setup();await a.sample();await a.save();const json=a.backup(),file=a.elements['plan-import'];let finish;file.files=[{size:json.length,text:()=>new Promise(resolve=>finish=resolve)}];const pending=file.fire('change');await a.edit('A newer edit stays');finish(json);await pending;assert.equal(a.title().value,'A newer edit stays');assert.match(a.elements['plan-restore-status'].textContent,/not applied because/);assert.equal(a.prompts(),0);
});
test('a newer file selection supersedes an older pending read',async()=>{
 const a=setup();await a.sample();await a.save();const json=a.backup(),second=JSON.parse(json);second.plan.business='Second backup';const file=a.elements['plan-import'];let finish;file.files=[{size:json.length,text:()=>new Promise(resolve=>finish=resolve)}];const first=file.fire('change');file.files=[{size:json.length,text:async()=>JSON.stringify(second)}];await file.fire('change');finish(json);await first;assert.equal(a.elements['plan-business'].value,'Second backup');assert.equal(a.unload(),true);
});
test('invalid imports preserve the current plan and do not ask to replace it',async()=>{
 const a=setup();await a.sample();await a.edit('Keep this title');const file=a.elements['plan-import'];file.files=[{size:2,text:async()=> '{}'}];await file.fire('change');assert.equal(a.title().value,'Keep this title');assert.equal(a.prompts(),0);assert.match(a.elements['plan-restore-status'].textContent,/not a valid/);
});
test('building another plan cancels an older read and clears its file selector',async()=>{
 const a=setup();await a.sample();await a.save();const json=a.backup(),file=a.elements['plan-import'];let finish;file.value='selected backup';file.files=[{size:json.length,text:()=>new Promise(resolve=>finish=resolve)}];const first=file.fire('change');a.elements['plan-business'].value='New build';await a.elements['planner-form'].fire('submit');assert.equal(file.value,'');finish(json);await first;assert.equal(a.elements['plan-business'].value,'New build');assert.equal(a.unload(),true);
});
