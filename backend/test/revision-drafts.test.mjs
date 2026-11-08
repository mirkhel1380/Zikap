import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const context={window:{}};vm.runInNewContext(await readFile(new URL('../account-static/account/revision-drafts.js',import.meta.url),'utf8'),context);
const create=context.window.ZikapRevisionDrafts.create;
test('drafts remain separate by project and retain the exact unsent text',()=>{
 const drafts=create();drafts.save('first','  Clarify the first page.\nSecond question. ');drafts.save('second','Other project');assert.equal(drafts.get('first'),'  Clarify the first page.\nSecond question. ');drafts.clear('second');assert.equal(drafts.get('second'),'');assert.equal(drafts.has(),true);drafts.save('first','   ');assert.equal(drafts.has(),false);
});
test('saved acknowledgements clear matching text and preserve a newer edit',()=>{
 const drafts=create();drafts.save('first','Original question');drafts.save('first','New question');drafts.acknowledge('first','Original question');assert.equal(drafts.get('first'),'New question');drafts.acknowledge('first',undefined);assert.equal(drafts.has(),true);drafts.acknowledge('first',' New question ');assert.equal(drafts.has(),false);
});
test('account cleanup discards every project draft',()=>{
 const drafts=create();drafts.save('one','One');drafts.save('two','Two');drafts.clearAll();assert.equal(drafts.has(),false);assert.equal(drafts.get('one'),'');assert.equal(drafts.get('two'),'');assert.equal(create().has(),false);
});
