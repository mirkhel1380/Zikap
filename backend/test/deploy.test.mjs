import test from 'node:test';
import assert from 'node:assert/strict';
import {deployWithRuntimeSecret} from '../deploy.mjs';
test('build secret goes only through stdin to the runtime secret operation',async()=>{
 const secret='fixture-secret-with-40-plus-characters-"\\\nend',calls=[],logs=[];
 await deployWithRuntimeSecret({env:{ADMIN_TOKEN:secret,CLOUDFLARE_API_TOKEN:'fixture-build-api-token'},run:async(args,input,env)=>calls.push({args,input,env}),log:s=>logs.push(s)});
 assert.deepEqual(calls[9].args,['d1','execute','zikap-orders','--remote','--file','./migrations/0011_private_work.sql','--config','./wrangler.jsonc']);
 assert.equal(calls.length,14);assert.deepEqual(calls[0].args,['d1','execute','zikap-orders','--remote','--file','./migrations/0002_customer_accounts.sql','--config','./wrangler.jsonc']);assert.equal(calls[0].input,undefined);assert.deepEqual(calls[1].args,['d1','execute','zikap-orders','--remote','--file','./migrations/0003_stripe_payments.sql','--config','./wrangler.jsonc']);assert.deepEqual(calls[2].args,['d1','execute','zikap-orders','--remote','--file','./migrations/0004_project_actions.sql','--config','./wrangler.jsonc']);assert.deepEqual(calls[3].args,['d1','execute','zikap-orders','--remote','--file','./migrations/0005_project_messages.sql','--config','./wrangler.jsonc']);assert.deepEqual(calls[4].args,['d1','execute','zikap-orders','--remote','--file','./migrations/0006_message_reads.sql','--config','./wrangler.jsonc']);assert.deepEqual(calls[6].args,['d1','execute','zikap-orders','--remote','--file','./migrations/0008_order_history.sql','--config','./wrangler.jsonc']);assert.deepEqual(calls[7].args,['d1','execute','zikap-orders','--remote','--file','./migrations/0009_email_notifications.sql','--config','./wrangler.jsonc']);assert.deepEqual(calls[8].args,['d1','execute','zikap-orders','--remote','--file','./migrations/0010_ai_reviews.sql','--config','./wrangler.jsonc']);assert.deepEqual(calls[10].args,['deploy','--config','./wrangler.jsonc']);assert.deepEqual(calls[11].args,['secret','bulk','--config','./wrangler.jsonc']);assert.deepEqual(JSON.parse(calls[11].input),{ADMIN_TOKEN:secret});assert.deepEqual(calls[5].args,['d1','execute','zikap-orders','--remote','--file','./migrations/0007_admin_accounts.sql','--config','./wrangler.jsonc']);assert.deepEqual(calls[12].args,['deploy','--config','./admin.wrangler.jsonc']);assert.deepEqual(calls[13].args,['secret','bulk','--config','./admin.wrangler.jsonc']);assert.deepEqual(JSON.parse(calls[13].input),{ADMIN_TOKEN:secret});
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
 let count=0;const logs=[];await assert.rejects(deployWithRuntimeSecret({env:{ADMIN_TOKEN:'test-only-key-at-least-thirty-two-characters'},run:async()=>{if(++count===14)throw new Error('upload failed');},log:s=>logs.push(s)}),/upload failed/);assert.equal(count,14);assert.equal(logs.some(s=>s.includes('completed')),false);
});
test('optional Stripe secrets go only to runtime registration over stdin',async()=>{
 const env={ADMIN_TOKEN:'fixture-owner-secret-longer-than-thirty-two-characters',STRIPE_SECRET_KEY:'sk_test_fixture_not_a_real_stripe_key',STRIPE_WEBHOOK_SECRET:'whsec_fixture_not_a_real_signing_secret'},calls=[],logs=[];
 await deployWithRuntimeSecret({env,run:async(args,input,childEnv)=>calls.push({args,input,childEnv}),log:s=>logs.push(s)});
 assert.equal(calls.length,14);assert.deepEqual(JSON.parse(calls[11].input),env);assert.deepEqual(JSON.parse(calls[13].input),{ADMIN_TOKEN:env.ADMIN_TOKEN});
 for(const call of calls)for(const [name,value]of Object.entries(env)){assert.equal(name in call.childEnv,false);assert.equal(call.args.join(' ').includes(value),false);assert.equal(logs.join('\n').includes(value),false);}
});
test('failure of any additive schema prevents Worker deployment',async()=>{
 for(const stop of [1,2,3,4,5,6,7,8,9,10]){const calls=[];await assert.rejects(deployWithRuntimeSecret({env:{ADMIN_TOKEN:'fixture-owner-secret-longer-than-thirty-two-characters'},run:async(args)=>{calls.push(args);if(calls.length===stop)throw new Error('schema fixture failure');},log:()=>{}}),/schema fixture failure/);assert.equal(calls.length,stop);assert.equal(calls.some(args=>args[0]==='deploy'||args[0]==='secret'),false);}
});

test('separate admin deploy cannot inherit a primary-worker CI name, match tag or output artifact',async()=>{
 const overrides={WRANGLER_CI_OVERRIDE_NAME:'zikap',WRANGLER_CI_MATCH_TAG:'fixture-primary-tag',WRANGLER_CI_GENERATE_PREVIEW_ALIAS:'true',WRANGLER_OUTPUT_FILE_PATH:'/fixture/primary.json',WRANGLER_OUTPUT_FILE_DIRECTORY:'/fixture/output'},calls=[];
 await deployWithRuntimeSecret({env:{ADMIN_TOKEN:'fixture-owner-secret-longer-than-thirty-two-characters',...overrides},run:async(args,input,env)=>calls.push({args,env}),log:()=>{}});
 for(const [key,value]of Object.entries(overrides)){assert.equal(calls[10].env[key],value);assert.equal(key in calls[12].env,false);assert.equal(key in calls[13].env,false);}
});

test('email credentials stay out of child environments and go only to the primary runtime over stdin',async()=>{
 const env={ADMIN_TOKEN:'fixture-owner-secret-longer-than-thirty-two-characters',RESEND_API_KEY:'re_fixture_not_a_real_key',EMAIL_SETTINGS:JSON.stringify({enabled:true,from:'updates@example.test',startAt:'2026-01-01T00:00:00Z'})},calls=[],logs=[];
 await deployWithRuntimeSecret({env,run:async(args,input,childEnv)=>calls.push({args,input,childEnv}),log:value=>logs.push(value)});
 assert.deepEqual(JSON.parse(calls[11].input),env);assert.deepEqual(JSON.parse(calls[13].input),{ADMIN_TOKEN:env.ADMIN_TOKEN});
 for(const c of calls)for(const [name,value]of Object.entries(env)){assert.equal(name in c.childEnv,false);assert.equal(c.args.join(' ').includes(value),false);assert.equal(logs.join('\n').includes(value),false);}
});
test('malformed email settings stop before schema or runtime changes',async()=>{
 for(const optional of [{RESEND_API_KEY:'invalid-key'},{EMAIL_SETTINGS:'null'},{EMAIL_SETTINGS:'{"enabled":"true"}'},{EMAIL_SETTINGS:JSON.stringify({enabled:true,from:'sender@example.test\r\nBcc: other@example.test',startAt:'2026-01-01T00:00:00Z'})}]){
  let calls=0;await assert.rejects(deployWithRuntimeSecret({env:{ADMIN_TOKEN:'fixture-owner-secret-longer-than-thirty-two-characters',...optional},run:async()=>{calls++;},log:()=>{}}),/EMAIL_SETTINGS|RESEND_API_KEY/);assert.equal(calls,0);
 }
});

test('free-plan AI activation is explicit, remains server-only and never registers in the admin Worker',async()=>{
 const calls=[];await deployWithRuntimeSecret({env:{ADMIN_TOKEN:'fixture-owner-secret-longer-than-thirty-two-characters',AI_FREE_PLAN_CONFIRMED:'true'},run:async(args,input,env)=>calls.push({args,input,env}),log:()=>{}});
 assert.equal(JSON.parse(calls[11].input).AI_FREE_PLAN_CONFIRMED,'true');assert.equal('AI_FREE_PLAN_CONFIRMED' in JSON.parse(calls[13].input),false);for(const call of calls)assert.equal('AI_FREE_PLAN_CONFIRMED' in call.env,false);
 let callsMade=0;await assert.rejects(deployWithRuntimeSecret({env:{ADMIN_TOKEN:'fixture-owner-secret-longer-than-thirty-two-characters',AI_FREE_PLAN_CONFIRMED:'yes'},run:async()=>callsMade++,log:()=>{}}),/AI_FREE_PLAN_CONFIRMED/);assert.equal(callsMade,0);
});
