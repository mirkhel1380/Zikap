import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../../catalog-client.js',import.meta.url),'utf8');
const services=['audit','keywords','onpage','bundle'].map((id,i)=>({id,title:'Renamed '+id,description:'Saved '+id+' summary',price:[29,19,39,79][i]}));
async function runCatalog(payload,{failure=false,empty=false}={}){
 const elements=empty?[]:[...services.flatMap(s=>['price','price','title','description'].map(kind=>({kind,id:s.id,textContent:kind==='title'?'Original '+s.id:'Loading…',dataset:{}}))),{kind:'status',textContent:'Loading current package prices…',dataset:{}}],events=[];let calls=0;
 const context={window:{ZIKAP_API_BASE:'https://fixture.example/'},AbortSignal:{timeout:()=>undefined},Set,CustomEvent:class{constructor(type,init){this.type=type;this.detail=init.detail;}},document:{
  querySelectorAll(selector){if(selector.includes(','))return elements.filter(e=>e.kind!=='status');const kind=selector.includes('data-catalog-status')?'status':selector.includes('data-package-price')?'price':selector.includes('data-package-title')?'title':'description',id=selector.match(/="([a-z]+)"/)?.[1];return elements.filter(e=>e.kind===kind&&(!id||e.id===id));},
  dispatchEvent(event){events.push(event);}},
  fetch:async(url,options)=>{calls++;assert.equal(url,'https://fixture.example/catalog');assert.equal(options.credentials,'omit');assert.equal(options.cache,'no-store');if(failure)throw Error('Isolated unavailable');return{ok:true,json:async()=>payload};}
 };
 vm.runInNewContext(source,context);await new Promise(resolve=>setImmediate(resolve));return{elements,events,calls};
}

test('public catalog updates repeated comparison/card prices and saved titles from one read',async()=>{
 const result=await runCatalog({services});assert.equal(result.calls,1);assert.equal(result.events.length,1);assert.equal(result.events[0].detail.length,4);
 for(const s of services){const matches=result.elements.filter(e=>e.id===s.id);assert.deepEqual(matches.filter(e=>e.kind==='price').map(e=>e.textContent),['$'+s.price,'$'+s.price]);assert.equal(matches.find(e=>e.kind==='title').textContent,s.title);assert.equal(matches.find(e=>e.kind==='description').textContent,s.description);}
 assert.match(result.elements.find(e=>e.kind==='status').textContent,/Current USD prices loaded/);
});
test('duplicate, missing, blank and out-of-range catalog data never leave partially loaded package prices',async()=>{
 for(const invalid of [[services[0],services[0],services[2],services[3]],services.slice(0,3),services.map((s,i)=>i===3?{...s,title:' '}:s),services.map((s,i)=>i===2?{...s,description:''}:s),services.map((s,i)=>i===1?{...s,price:10000}:s)]){
  const result=await runCatalog({services:invalid});assert.equal(result.events.length,1);assert.equal(result.events[0].detail,null);assert.equal(result.elements.filter(e=>e.kind==='price').every(e=>e.textContent==='Price unavailable'&&e.dataset.priceState==='unavailable'),true);assert.equal(result.elements.filter(e=>e.kind==='description').every(e=>e.textContent.startsWith('Summary unavailable.')),true);assert.match(result.elements.find(e=>e.kind==='status').textContent,/could not load/);
 }
});
test('catalog network failure clears loading summaries and pages without catalog targets make no request',async()=>{
 const failed=await runCatalog(null,{failure:true});assert.equal(failed.events[0].detail,null);assert.equal(failed.elements.some(e=>e.kind==='description'&&e.textContent.includes('Loading')),false);
 const untouched=await runCatalog({services},{empty:true});assert.equal(untouched.calls,0);assert.equal(untouched.events.length,0);
});
