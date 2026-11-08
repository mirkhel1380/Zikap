import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../account-static/account/data-export.js',import.meta.url),'utf8');
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.textContent='';this.value='';this.events={};}
 append(...nodes){this.children.push(...nodes);}setAttribute(key,value){this[key]=value;}removeAttribute(key){delete this[key];}
 addEventListener(name,fn){this.events[name]=fn;}emit(name,event={preventDefault(){}}){return this.events[name]?.(event);}
}
function setup(override){
 const host=new Element('section'),documentEvents={},windowEvents={},created=[],revoked=[],calls=[],timers=new Map(),timerCallbacks=[];let now=1000,serial=0;
 const context={window:{},document:{createElement:tag=>new Element(tag),getElementById:()=>null,addEventListener:(event,fn)=>documentEvents[event]=fn},addEventListener:(event,fn)=>windowEvents[event]=fn,Blob,TextEncoder,Date:class extends Date{static now(){return now;}},URL:{createObjectURL(blob){const url='blob:fixture/'+created.length;created.push({url,blob});return url;},revokeObjectURL:url=>revoked.push(url)},setTimeout(fn,ms){const id=++serial;timers.set(id,{fn,ms});timerCallbacks.push(fn);return id;},clearTimeout:id=>timers.delete(id)};
 vm.runInNewContext(source,context);
 const api=async(path,body,grant)=>{calls.push({path,body,grant});if(override)return override(path,body,grant);if(path==='start')return {grant:'fixture-authorization',format:'fixture-v1',generatedAt:'2026-11-08T10:00:00.000Z',account:{name:'Fixture Customer',email:'fixture@example.test'}};if(path==='part')return {project:body.section==='projects'?{id:'fixture-project',report:'Fixture report text'}:null,next:null};return {finished:true};};
 const control=context.window.ZikapDataExport.mount(host,{api});const flat=()=>{const visit=n=>[n,...n.children.flatMap(visit)];return visit(host);};const find=text=>flat().find(n=>n.textContent===text),form=flat().find(n=>n.tag==='form'),password=flat().find(n=>n.tag==='input'),status=flat().find(n=>n.role==='status');
 return {control,created,revoked,calls,timers,timerCallbacks,find,form,password,status,advance(ms){now+=ms;},event(name){(documentEvents[name]||windowEvents[name])?.();},async prepare(){password.value='Local-fixture-only-password';await form.emit('submit');}};
}
test('prepared account export keeps complete JSON and offers explicit local clearing without a server mutation',async()=>{
 const s=setup();await s.prepare();const link=s.find('Save private JSON file'),clear=s.find('Clear prepared file');assert.equal(link.hidden,false);assert.equal(clear.hidden,false);assert.equal(s.password.value,'');assert.match(s.status.textContent,/File size:/);const archive=JSON.parse(await s.created[0].blob.text());assert.equal(archive.account.name,'Fixture Customer');assert.equal(archive.projects[0].report,'Fixture report text');assert.equal(archive.completedAt!==null,true);
 const calls=s.calls.length;clear.emit('click');assert.equal(link.hidden,true);assert.equal(clear.hidden,true);assert.equal(s.revoked[0],s.created[0].url);assert.equal(s.timers.size,0);assert.equal(s.calls.length,calls);assert.match(s.status.textContent,/Files already saved on your device are unchanged/);
});
test('expired clicks are blocked even before a throttled timer fires and an old timeout cannot clear a newer file',async()=>{
 const s=setup();await s.prepare();const oldTimer=s.timerCallbacks[0];assert.equal([...s.timers.values()][0].ms,600000);s.advance(600001);let prevented=false;s.find('Save private JSON file').emit('click',{preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.equal(s.find('Save private JSON file').hidden,true);assert.match(s.status.textContent,/expired/);
 await s.prepare();const link=s.find('Save private JSON file'),newURL=link.href;oldTimer();assert.equal(link.hidden,false);assert.equal(link.href,newURL);assert.equal(s.revoked.includes(newURL),false);s.timerCallbacks[1]();assert.equal(link.hidden,true);
});
test('page leave and account-session cleanup remove prepared links and password values',async()=>{
 for(const event of ['pagehide','zikap-session-cleared']){const s=setup();await s.prepare();s.password.value='Unused fixture value';s.event(event);assert.equal(s.find('Save private JSON file').hidden,true);assert.equal(s.find('Clear prepared file').hidden,true);assert.equal(s.password.value,'');assert.equal(s.status.textContent,'');assert.equal(s.revoked.length,1);}
});
test('a cancelled in-flight export cannot restore a file and still releases its session-bound grant',async()=>{
 let finishPart,started;const reachedPart=new Promise(resolve=>started=resolve);const s=setup(async(path,body)=>{if(path==='start')return {grant:'fixture-authorization',format:'fixture-v1',generatedAt:'2026-11-08T10:00:00.000Z',account:{name:'Fixture'}};if(path==='part'){started();return await new Promise(resolve=>finishPart=resolve);}return {finished:true};});
 const pending=s.prepare();await reachedPart;s.find('Cancel download preparation').emit('click');finishPart({project:{id:'late-private-record'},next:null});await pending;assert.equal(s.created.length,0);assert.equal(s.find('Save private JSON file').hidden,true);assert.equal(s.password.value,'');assert.equal(s.calls.at(-1).path,'finish');assert.match(s.status.textContent,/cancelled/);
});
