import test from 'node:test';
import assert from 'node:assert/strict';
import {deployWithRuntimeSecret} from '../deploy.mjs';
test('build secret goes only through stdin to the runtime secret operation',async()=>{
 const secret='fixture-secret-with-40-plus-characters-"\\\nend',calls=[],logs=[];
 await deployWithRuntimeSecret({env:{ADMIN_TOKEN:secret,CLOUDFLARE_API_TOKEN:'fixture-build-api-token'},run:async(args,input,env)=>calls.push({args,input,env}),log:s=>logs.push(s)});
 assert.equal(calls.length,2);assert.deepEqual(calls[0].args,['deploy','--config','./wrangler.jsonc']);assert.equal(calls[0].input,undefined);assert.deepEqual(calls[1].args,['secret','bulk','--config','./wrangler.jsonc']);assert.deepEqual(JSON.parse(calls[1].input),{ADMIN_TOKEN:secret});
 for(const c of calls){assert.equal('ADMIN_TOKEN' in c.env,false);assert.equal(c.args.join(' ').includes(secret),false);assert.equal(c.env.CLOUDFLARE_API_TOKEN,'fixture-build-api-token');}
 assert.equal(logs.join('\n').includes(secret),false);assert.equal(logs.join('\n').includes('fixture-build-api-token'),false);
});
test('invalid secret stops before deployment',async()=>{
 for(const value of [undefined,'','too-short']){let called=false;await assert.rejects(deployWithRuntimeSecret({env:{ADMIN_TOKEN:value},run:async()=>{called=true;},log:()=>{}}),/at least 32/);assert.equal(called,false);}
});
test('failed deployment does not upload a secret or claim success',async()=>{
 const calls=[],logs=[];await assert.rejects(deployWithRuntimeSecret({env:{ADMIN_TOKEN:'test-only-key-at-least-thirty-two-characters'},run:async(args)=>{calls.push(args);throw new Error('fixture failure');},log:s=>logs.push(s)}),/fixture failure/);assert.equal(calls.length,1);assert.equal(logs.some(s=>s.includes('completed')),false);
});
test('failed runtime secret upload is reported as a failed deployment flow',async()=>{
 let count=0;const logs=[];await assert.rejects(deployWithRuntimeSecret({env:{ADMIN_TOKEN:'test-only-key-at-least-thirty-two-characters'},run:async()=>{if(++count===2)throw new Error('upload failed');},log:s=>logs.push(s)}),/upload failed/);assert.equal(count,2);assert.equal(logs.some(s=>s.includes('completed')),false);
});
