import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {validateOrder} from '../worker.mjs';
const context={window:{},URL};vm.runInNewContext(await readFile(new URL('../account-static/account/request-validation.js',import.meta.url),'utf8'),context);const {check,validCatalog}=context.window.ZikapRequestValidation;
const base={packageId:'audit',website:'https://example.com',pages:'https://example.com/a',topic:'SEO',language:'English',market:'Afghanistan',goals:'Improve the technical structure.',consent:true,name:'Fixture Customer',email:'fixture@example.test'};
function sameAsServer(data,valid){assert.equal(Object.keys(check(data).errors).length===0,valid);if(valid)assert.doesNotThrow(()=>validateOrder(data));else assert.throws(()=>validateOrder(data));}
test('request preparation matches server scope for all four packages and optional keyword pages',()=>{
 for(const id of ['audit','keywords','onpage','bundle'])sameAsServer({...base,packageId:id},true);
 sameAsServer({...base,packageId:'keywords',pages:''},true);sameAsServer({...base,packageId:'audit',topic:''},true);
 sameAsServer({...base,pages:'  https://example.com/a\r\n\r\n https://example.com/b  '},true);
 for(const id of ['audit','onpage','bundle'])sameAsServer({...base,packageId:id,pages:''},false);
 for(const id of ['keywords','bundle'])sameAsServer({...base,packageId:id,topic:'   '},false);
});
test('page validation catches over-limit lists, malformed URLs and exact-origin differences before sending',()=>{
 for(const [id,max] of [['audit',5],['keywords',5],['onpage',3],['bundle',5]]){
  const pages=Array.from({length:max},(_,i)=>'https://example.com/'+i).join('\n');sameAsServer({...base,packageId:id,pages},true);sameAsServer({...base,packageId:id,pages:pages+'\nhttps://example.com/extra'},false);
 }
 for(const page of ['/relative','not a URL','https://other.example/a','http://example.com/a','https://www.example.com/a','https://example.com:444/a','https://user:pass@example.com/a','javascript:alert(1)'])sameAsServer({...base,pages:page},false);
 assert.match(check({...base,pages:'https://example.com/a\n/relative'}).errors.pages,/Line 2/);
});
test('blank required text and credential-bearing websites cannot appear prepared',()=>{
 for(const website of ['ftp://example.com','https://user:pass@example.com','invalid',''])sameAsServer({...base,website},false);
 for(const key of ['language','market','goals'])sameAsServer({...base,[key]:'   '},false);
 assert.equal(check({...base,consent:false}).errors.consent.length>0,true);
});
test('account catalog validation rejects partial, duplicate, malformed and unsafe quotes',()=>{
 const services=['audit','keywords','onpage','bundle'].map(id=>({id,title:id,description:'Saved summary',price:29,version:1}));assert.equal(validCatalog(services),true);assert.equal(validCatalog(services.map(s=>({...s,version:0}))),true);
 for(const bad of [null,[],services.slice(0,3),[...services.slice(0,3),services[0]],services.map((s,i)=>i===0?null:s)])assert.equal(validCatalog(bad),false);
 for(const override of [{id:'unknown'},{price:0},{price:10000},{price:29.5},{title:' '},{description:''},{version:-1},{version:NaN},{version:undefined}])assert.equal(validCatalog(services.map((s,i)=>i===0?{...s,...override}:s)),false);
});
