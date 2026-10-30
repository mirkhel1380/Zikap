// Cloudflare Builds keeps its environment separate from Worker runtime bindings.
// Transfer the existing build secret through stdin; never write or log its value.
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {readFileSync} from 'node:fs';
const directory=dirname(fileURLToPath(import.meta.url));
function runWrangler(args,input,env){
 return new Promise((resolveRun,reject)=>{
  const child=spawn('wrangler',args,{cwd:directory,env:{...env,CI:'true'},shell:false,stdio:[input===undefined?'ignore':'pipe','ignore','ignore']});
  child.once('error',()=>reject(new Error('Could not start Wrangler. Check that build dependencies are installed.')));
  child.once('close',code=>code===0?resolveRun():reject(new Error(args[0]==='secret'?'Runtime secret upload failed. Check the build token has permission to edit this Worker.':args[0]==='d1'?'Customer account schema preparation failed. Check the migration and the build token D1 permissions. The Worker was not changed.':'Worker deployment failed. Check the Wrangler configuration and build token permissions.')));
  if(input!==undefined){child.stdin.on('error',()=>{});child.stdin.end(input);}
 });
}
export async function deployWithRuntimeSecret({env=process.env,run=runWrangler,log=console.log}={}){
 const secret=env.ADMIN_TOKEN;
 if(typeof secret!=='string'||secret.length<32)throw new Error('ADMIN_TOKEN must be a Cloudflare build secret containing at least 32 characters. No deployment was started.');
 const secrets={ADMIN_TOKEN:secret};
 for(const name of ['STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET'])if(env[name]){
  if(typeof env[name]!=='string'||(name==='STRIPE_SECRET_KEY'?!/^(sk|rk)_(test|live)_/.test(env[name]):!env[name].startsWith('whsec_')))throw new Error(name+' is not in the expected format. No deployment was started.');
  secrets[name]=env[name];
 }
 const config=JSON.parse(readFileSync(resolve(directory,'wrangler.jsonc'),'utf8'));
 if(config.name!=='zikap'||config.main!=='worker.mjs'||config.assets?.binding!=='ACCOUNT_ASSETS'||config.assets?.directory!=='./account-static'||config.assets?.run_worker_first!==true)throw new Error('Expected the zikap API Worker with main worker.mjs and its account assets binding. No deployment was started.');
 const childEnv={...env};for(const name of ['ADMIN_TOKEN','STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET'])delete childEnv[name];
 log('Applying the additive customer-account schema to the existing orders database.');
 await run(['d1','execute','zikap-orders','--remote','--file','./migrations/0002_customer_accounts.sql','--config','./wrangler.jsonc'],undefined,childEnv);
 log('Applying the additive Stripe payment-record schema.');
 await run(['d1','execute','zikap-orders','--remote','--file','./migrations/0003_stripe_payments.sql','--config','./wrangler.jsonc'],undefined,childEnv);
 log('Applying the additive project action-plan schema.');
 await run(['d1','execute','zikap-orders','--remote','--file','./migrations/0004_project_actions.sql','--config','./wrangler.jsonc'],undefined,childEnv);
 log('Deploying the zikap API Worker with its explicit backend configuration.');
 await run(['deploy','--config','./wrangler.jsonc'],undefined,childEnv);
 log('Registering the existing build secret as an encrypted Worker runtime secret.');
 await run(['secret','bulk','--config','./wrangler.jsonc'],JSON.stringify(secrets),childEnv);
 log('Worker deployment and runtime secret registration completed.');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 deployWithRuntimeSecret().catch(error=>{console.error(error.message);process.exitCode=1;});
}
