import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const context={window:{},URL};vm.runInNewContext(await readFile(new URL('../account-static/account/request-recovery.js',import.meta.url),'utf8'),context);const {attempt,sameBrief}=context.window.ZikapRequestRecovery;
const body={packageId:'audit',website:' https://example.com ',pages:' https://example.com/a\r\n\r\nhttps://example.com/b ',topic:' SEO ',language:' English ',market:' Afghanistan ',goals:' Improve structure. ',consent:true};const saved={packageId:'audit',website:'https://example.com/',pages:['https://example.com/a','https://example.com/b'],topic:'SEO',language:'English',market:'Afghanistan',goals:'Improve structure.'};
test('uncertain submissions keep their reference across retries and edited briefs',()=>{
 let n=0;const id=()=>String(++n);const first=attempt(null,'original',id);assert.equal(attempt(first,'original',id),first);assert.equal(n,1);first.uncertain=true;assert.equal(attempt(first,'edited',id),first);assert.equal(n,1);assert.equal(attempt(null,'separate after explicit reset',id).id,'2');
 const known=attempt(null,'known rejection',id);assert.notEqual(attempt(known,'changed',id).id,known.id);
});
test('confirmed saved briefs match server trimming and website normalization without comparing prices or report status',()=>{
 assert.equal(sameBrief(body,saved),true);assert.equal(sameBrief(body,{...saved,price:79,status:'accepted',report:'A later report'}),true);
 for(const patch of [{goals:'Edited goals'},{topic:'Different topic'},{market:'Different market'},{language:'Other language'},{packageId:'onpage'},{website:'https://other.test'},{pages:'https://example.com/b\nhttps://example.com/a'},{consent:false}])assert.equal(sameBrief({...body,...patch},saved),false);
});
test('malformed or missing saved details never justify clearing the customer draft',()=>{
 for(const order of [null,{}, {...saved,pages:'["https://example.com/a"]'}, {...saved,goals:undefined}])assert.equal(sameBrief(body,order),false);
 assert.equal(sameBrief({...body,website:'invalid'},saved),false);assert.equal(sameBrief({...body,pages:null},saved),false);
});
