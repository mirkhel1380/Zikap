import test from 'node:test';
import assert from 'node:assert/strict';
import {deployWithRuntimeSecret} from '../deploy.mjs';
test('build secret goes only through stdin to the runtime secret operation',async()=>{
 const secret='fixture-secret-with-40-plus-characters-"\\\nend',calls=[],logs=[];
 await deployWithRuntimeSecret({env:{ADMIN_TOKEN:secret,CLOUDFLARE_API_TOKEN:'fixture-build-api-token'},run:async(args,input,env)=>calls.push({args,input,env}),log:s=>logs.push(s)});
 assert.equal(calls.length,11);assert.deepEqual(calls[0].args,['d1','execute','zikap-orders','--remote','--file','./migrations/0002_customer_accounts.sql','--config','./wrangler.jsonc']);assert.equal(calls[0].input,undefined);assert.deepEqual(calls[1].args,['d1','execute','zikap-orders','--remote','--file','./migrations/0003_stripe_payments.sql','--config','./wrangler.jsonc']);assert.deepEqual(calls[2].args,['d1','execute','zikap-orders','--remote','--file','./migrations/0004_project_actions.sql','--config','./wrangler.jsonc']);assert.deepEqual(calls[3].args,['d1','execute','zikap-orders','--remote','--file','./migrations/0005_project_messages.sql','--config','./wrangler.jsonc']);assert.deepEqual(calls[4].args,['d1','execute','zikap-orders','--remote','--file','./migrations/0006_message_reads.sql','--config','./wrangler.jsonc']);assert.deepEqual(calls[6].args,['d1','execute','zikap-orders','--remote','--file','./migrations/0008_order_history.sql','--config','./wrangler.jsonc']);assert.deepEqual(calls[7].args,['deploy','--config','./wrangler.jsonc']);assert.deepEqual(calls[8].args,['secret','bulk','--config','./wrangler.jsonc']);assert.deepEqual(JSON.parse(calls[8].input),{ADMIN_TOKEN:secret});assert.deepEqual(calls[5].args,['d1','execute','zikap-orders','--remote','--file','./migrations/0007_admin_accounts.sql','--config','./wrangler.jsonc']);assert.deepEqual(calls[9].args,['deploy','--config','./admin.wrangler.jsonc']);assert.deepEqual(calls[10].args,['secret','bulk','--config','./admin.wrangler.jsonc']);assert.deepEqual(JSON.parse(calls[10].input),{ADMIN_TOKEN:secret});
 for(const c of calls){assert.equal('ADMIN_TOKEN' in c.env,false);assert.equal(c.args.join(' ').includes(secret),false);assert.equal(c.env.CLOUDFLARE_API_TOKEN,'fixture-build-api-token');}
 assert.equal(logs.join('\n').includes(secret),false);assert.equal(logs.join('\n').includes('fixture-build-api-token'),false);
});
test('invalid secret stops before deployment',async()=>{
 for(const value of [undefined,'','too-short']){let called=false;await assert.rejects(deployWithRuntimeSecret({env:{ADMIN_TOKEN:value},run:async()=>{called=true;},log:()=>{}}),/at least 32/);assert.equal(called,false);}
});
test('failed schema preparation does not deploy or upload a secret',async()=>{
 const calls=[],logs=[];await assert.rejects(deployWithRuntimeSecret({env:{ADMIN_TOKEN:'test-only-key-at-least-thirty-two-characters'},run:async(args)=>{calls.push(args);throw new Error('fixture failure');},log:s=>logs.push(s)}),/fixture failure/);assert.equal(calls.length,1);assert.equal(logs.some(s=>s.includes('completed')),false);
});
test('failed runtime secret upload is reported as a failed deployment flow',async()=>{
 let count=0;const logs=[];await assert.rejects(deployWithRuntimeSecret({env:{ADMIN_TOKEN:'test-only-key-at-least-thirty-two-characters'},run:async()=>{if(++count===11)throw new Error('upload failed');},log:s=>logs.push(s)}),/upload failed/);assert.equal(count,11);assert.equal(logs.some(s=>s.includes('completed')),false);
});
test('optional Stripe secrets go only to runtime registration over stdin',async()=>{
 const env={ADMIN_TOKEN:'fixture-owner-secret-longer-than-thirty-two-characters',STRIPE_SECRET_KEY:'sk_test_fixture_not_a_real_stripe_key',STRIPE_WEBHOOK_SECRET:'whsec_fixture_not_a_real_signing_secret'},calls=[],logs=[];
 await deployWithRuntimeSecret({env,run:async(args,input,childEnv)=>calls.push({args,input,childEnv}),log:s=>logs.push(s)});
 assert.equal(calls.length,11);assert.deepEqual(JSON.parse(calls[8].input),env);assert.deepEqual(JSON.parse(calls[10].input),{ADMIN_TOKEN:env.ADMIN_TOKEN});
 for(const call of calls)for(const [name,value]of Object.entries(env)){assert.equal(name in call.childEnv,false);assert.equal(call.args.join(' ').includes(value),false);assert.equal(logs.join('\n').includes(value),false);}
});
test('failure of any additive schema prevents Worker deployment',async()=>{
 for(const stop of [1,2,3,4,5,6,7]){const calls=[];await assert.rejects(deployWithRuntimeSecret({env:{ADMIN_TOKEN:'fixture-owner-secret-longer-than-thirty-two-characters'},run:async(args)=>{calls.push(args);if(calls.length===stop)throw new Error('schema fixture failure');},log:()=>{}}),/schema fixture failure/);assert.equal(calls.length,stop);assert.equal(calls.some(args=>args[0]==='deploy'||args[0]==='secret'),false);}
});

test('separate admin deploy cannot inherit a primary-worker CI name, match tag or output artifact',async()=>{
 const overrides={WRANGLER_CI_OVERRIDE_NAME:'zikap',WRANGLER_CI_MATCH_TAG:'fixture-primary-tag',WRANGLER_CI_GENERATE_PREVIEW_ALIAS:'true',WRANGLER_OUTPUT_FILE_PATH:'/fixture/primary.json',WRANGLER_OUTPUT_FILE_DIRECTORY:'/fixture/output'},calls=[];
 await deployWithRuntimeSecret({env:{ADMIN_TOKEN:'fixture-owner-secret-longer-than-thirty-two-characters',...overrides},run:async(args,input,env)=>calls.push({args,env}),log:()=>{}});
 for(const [key,value]of Object.entries(overrides)){assert.equal(calls[7].env[key],value);assert.equal(key in calls[9].env,false);assert.equal(key in calls[10].env,false);}
});
