// Stripe-hosted, one-time checkout with Dashboard-managed payment methods. No card details or keys go to the browser.
import {prices,titles,orderSnapshot} from './catalog.mjs';
const version='2026-10-28.endive';
export const stripeConfigured=env=>typeof env.STRIPE_SECRET_KEY==='string'&&/^(sk|rk)_(test|live)_/.test(env.STRIPE_SECRET_KEY)&&typeof env.STRIPE_WEBHOOK_SECRET==='string'&&env.STRIPE_WEBHOOK_SECRET.startsWith('whsec_');
const testMode=env=>!env.STRIPE_SECRET_KEY?.includes('_live_');
const hex=bytes=>[...new Uint8Array(bytes)].map(v=>v.toString(16).padStart(2,'0')).join('');
const equal=(a,b)=>{if(a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0;};
// Non-sensitive readiness only: never expose key values, fragments, lengths or database errors.
export async function paymentReadiness(env){
 const status=(value,pattern)=>typeof value!=='string'||value.length===0?'missing':pattern.test(value)?'configured':'invalid_format';
 const checks={secretKey:status(env.STRIPE_SECRET_KEY,/^(sk|rk)_(test|live)_/),webhookSecret:status(env.STRIPE_WEBHOOK_SECRET,/^whsec_/),databaseBinding:!!env.DB,paymentRecordsTable:null,webhookEventsTable:null};
 if(env.DB){
  try{await env.DB.prepare('SELECT order_id,session_id FROM order_payments LIMIT 1').first();checks.paymentRecordsTable=true;}catch{checks.paymentRecordsTable=false;}
  try{await env.DB.prepare('SELECT id FROM stripe_events LIMIT 1').first();checks.webhookEventsTable=true;}catch{checks.webhookEventsTable=false;}
 }
 return{ready:stripeConfigured(env)&&checks.databaseBinding&&checks.paymentRecordsTable===true&&checks.webhookEventsTable===true,checks};
}
export async function paymentsReady(env){if(!stripeConfigured(env)||!env.DB)return false;return(await paymentReadiness(env)).ready;}
function summary(row,available){return{available,status:row?row.refunded_cents>=row.amount_cents?'refunded':row.refunded_cents>0?'partially_refunded':row.state==='paid'?'paid':row.state==='expired'?'unpaid':'pending':'unpaid',testMode:row?!!row.test_mode:null,amountCents:row?.amount_cents||0,currency:'usd',paidAt:row?.paid_at||'',refundedCents:row?.refunded_cents||0};}
export async function paymentSummaries(env,ids){
 const values=new Map();if(!ids.length)return values;
 try{const {results}=await env.DB.prepare('SELECT * FROM order_payments WHERE order_id IN ('+ids.map(()=>'?').join(',')+')').bind(...ids).all();const rows=new Map(results.map(row=>[row.order_id,row]));for(const id of ids)values.set(id,summary(rows.get(id),stripeConfigured(env)));}
 catch{for(const id of ids)values.set(id,summary(null,false));}return values;
}
// Classify provider failures using fixed categories and exact known parameter names only.
// Never relay Stripe's raw message, headers, request IDs, secret fragments or response body.
function stripeFailure(status,data){
 const code=typeof data?.error?.code==='string'?data.error.code:'';
 if(status===401||['api_key_expired','secret_key_required'].includes(code))return 'Stripe rejected the server API key. The owner must verify the Stripe secret key in Cloudflare. No payment has been confirmed. [STRIPE_AUTHENTICATION]';
 if(status===403)return 'Stripe denied this API request. The owner must check the server key permissions in Stripe. No payment has been confirmed. [STRIPE_PERMISSIONS]';
 if(status===429)return 'Stripe is limiting requests. Wait before trying checkout again. No payment has been confirmed. [STRIPE_RATE_LIMIT]';
 if(status===409||data?.error?.type==='idempotency_error')return 'Stripe could not reuse the existing checkout request. The owner must review the earlier attempt before another payment. No payment has been confirmed. [STRIPE_IDEMPOTENCY]';
 if(['account_invalid','platform_account_required'].includes(code))return 'Stripe rejected the account configuration. The owner must review the selected account and its setup in Stripe. No payment has been confirmed. [STRIPE_ACCOUNT]';
 if(status===400||status===402){
  const known=new Set(['mode','currency','success_url','cancel_url','payment_method_types','payment_method_types[0]','adaptive_pricing','adaptive_pricing[enabled]','line_items','line_items[0][price_data][currency]','line_items[0][price_data][unit_amount]','line_items[0][price_data][product_data][name]','line_items[0][quantity]','client_reference_id','metadata','payment_intent_data','payment_intent_data[metadata][orderId]']);
  const param=typeof data?.error?.param==='string'&&known.has(data.error.param)?' Setting: '+data.error.param+'.':'';
  return 'Stripe rejected the checkout configuration.'+param+' The owner should review the failed request in Stripe Workbench logs. No payment has been confirmed. [STRIPE_REQUEST]';
 }
 return 'Stripe checkout is temporarily unavailable. The owner should review the failed request in Stripe Workbench logs before another payment. No payment has been confirmed. [STRIPE_PROVIDER]';
}
async function stripe(env,path,method,params,idempotency,ApiError){
 const headers={Authorization:'Bearer '+env.STRIPE_SECRET_KEY,'Stripe-Version':version};if(params)headers['Content-Type']='application/x-www-form-urlencoded';if(idempotency)headers['Idempotency-Key']=idempotency;
 const transport=typeof env.STRIPE_HTTP==='function'?env.STRIPE_HTTP:fetch;
 let response;try{response=await transport('https://api.stripe.com/v1'+path,{method,headers,body:params||undefined,signal:AbortSignal.timeout(15000)});}catch{throw new ApiError('Stripe could not be reached. No payment has been confirmed. Please try again.',503);}
 let data;try{data=await response.json();}catch{throw new ApiError('Stripe did not return a valid response. Please try again.',503);}
 if(!response.ok){
  const error=new ApiError(stripeFailure(response.status,data),503);
  // An explicit validation rejection proves this legacy request created no session.
  // Keep only a boolean internally; raw provider text must never leave this function.
  error.legacyPaymentMethodRejected=response.status===400&&path==='/checkout/sessions'&&method==='POST'&&data?.error?.type==='invalid_request_error'&&data.error.param==='payment_method_types'&&typeof data.error.message==='string'&&data.error.message.startsWith('The `payment_method_types` parameter is no longer supported when creating a Checkout Session.');
  throw error;
 }return data;
}
function validSession(session,row,ApiError){
 if(typeof session.id!=='string'||!/^cs_[A-Za-z0-9_]{1,240}$/.test(session.id))throw new ApiError('Stripe returned an invalid checkout reference.',400);
 if(session.object!=='checkout.session'||session.mode!=='payment'||session.client_reference_id!==row.order_id||session.metadata?.orderId!==row.order_id||session.metadata?.generation!==row.generation||session.livemode!==!row.test_mode||session.currency!=='usd'||session.amount_total!==row.amount_cents)throw new ApiError('Stripe payment details did not match this project. No payment status was changed.',400);
 if(row.session_id&&session.id!==row.session_id)throw new ApiError('Stripe session did not match this project.',400);
}
async function markPaid(env,row,session,event,ApiError){
 validSession(session,row,ApiError);if(session.payment_status!=='paid'||session.status!=='complete')return false;
 const now=new Date().toISOString(),intent=typeof session.payment_intent==='string'?session.payment_intent:session.payment_intent?.id||'';
 const statements=[env.DB.prepare("UPDATE order_payments SET state='paid',session_id=?,payment_intent=?,paid_at=CASE WHEN paid_at='' THEN ? ELSE paid_at END,lock_until=0 WHERE order_id=? AND generation=?").bind(session.id,intent,now,row.order_id,row.generation)];
 if(event)statements.push(env.DB.prepare('INSERT INTO stripe_events (id,order_id,processed_at) VALUES (?,?,?) ON CONFLICT(id) DO NOTHING').bind(event,row.order_id,Math.floor(Date.now()/1000)));
 await env.DB.batch(statements);return true;
}
async function rowFor(env,id){return env.DB.prepare('SELECT * FROM order_payments WHERE order_id=?').bind(id).first();}
function parameters(order,generation,origin){
 const p=new URLSearchParams({mode:'payment',client_reference_id:order.id,success_url:origin+'/account/?payment=return&order='+order.id+'#projects',cancel_url:origin+'/account/?payment=cancel&order='+order.id+'#projects','metadata[orderId]':order.id,'metadata[generation]':generation,'payment_intent_data[metadata][orderId]':order.id,'line_items[0][quantity]':'1','line_items[0][price_data][currency]':'usd','line_items[0][price_data][unit_amount]':String(order.price_usd*100),'line_items[0][price_data][product_data][name]':'Zikap / '+(order.package_title||titles[order.package_id]),'adaptive_pricing[enabled]':'false'});return p.toString();
}
export const checkoutAllowed=order=>Object.hasOwn(prices,order.package_id)&&['requested','accepted'].includes(order.status);
export async function checkout(env,order,origin,ApiError){
 if(!await paymentsReady(env))throw new ApiError('Online payment is not configured yet. No payment was collected.',503);
 if(!checkoutAllowed(order))throw new ApiError('Checkout is available for an open fixed-package project. Review its latest status before paying.',409);
 const original=await orderSnapshot(env,order);
 let savedPrice=null;try{savedPrice=await env.DB.prepare('SELECT price_usd FROM order_package_snapshots WHERE order_id=?').bind(order.id).first();}catch{}
 if(!Object.hasOwn(prices,order.package_id)||!Number.isInteger(order.price_usd)||order.price_usd<1||order.price_usd>9999||order.price_usd!==(savedPrice?.price_usd??prices[order.package_id]))throw new ApiError('The package price needs owner review before payment.',409);
 order=original;
 const now=Math.floor(Date.now()/1000),generation=crypto.randomUUID();
 const inserted=await env.DB.prepare("INSERT INTO order_payments (order_id,generation,state,amount_cents,currency,test_mode,request_params,started_at,lock_until) VALUES (?,?,'creating',?,'usd',?,?,?,?) ON CONFLICT(order_id) DO NOTHING").bind(order.id,generation,order.price_usd*100,testMode(env)?1:0,parameters(order,generation,origin),now,now+30).run();
 let row=await rowFor(env,order.id),owned=!!inserted.meta.changes;
 if(row.test_mode!==(testMode(env)?1:0))throw new ApiError('Payment mode changed for this project. Please contact Zikap before paying.',409);
 if(row.state==='paid')return{payment:summary(row,true)};
 if(row.state==='pending'){
  if(row.expires_at>now)return{url:row.checkout_url,payment:summary(row,true)};
  const old=await stripe(env,'/checkout/sessions/'+encodeURIComponent(row.session_id),'GET',null,null,ApiError);validSession(old,row,ApiError);
  if(await markPaid(env,row,old,null,ApiError))return{payment:summary(await rowFor(env,order.id),true)};
  if(old.status!=='expired')throw new ApiError('Your earlier checkout still needs confirmation. Please check it before paying again.',409);
  const changed=await env.DB.prepare("UPDATE order_payments SET generation=?,state='creating',request_params=?,session_id=NULL,checkout_url='',expires_at=0,started_at=?,lock_until=? WHERE order_id=? AND generation=? AND state='pending'").bind(generation,parameters(order,generation,origin),now,now+30,order.id,row.generation).run();
  if(!changed.meta.changes)throw new ApiError('Payment is being updated. Refresh your project before trying again.',409);row=await rowFor(env,order.id);owned=true;
 }
 if(row.state==='expired'){
  const changed=await env.DB.prepare("UPDATE order_payments SET generation=?,state='creating',request_params=?,session_id=NULL,checkout_url='',expires_at=0,started_at=?,lock_until=? WHERE order_id=? AND generation=? AND state='expired'").bind(generation,parameters(order,generation,origin),now,now+30,order.id,row.generation).run();
  if(!changed.meta.changes)throw new ApiError('Payment is being updated. Please refresh.',409);row=await rowFor(env,order.id);owned=true;
 }
 if(!owned){
  if(now-row.started_at>=23*3600)throw new ApiError('Your earlier checkout needs owner verification before another payment can be opened.',409);
  const lease=await env.DB.prepare("UPDATE order_payments SET lock_until=? WHERE order_id=? AND generation=? AND state='creating' AND lock_until<=?").bind(now+30,order.id,row.generation,now).run();if(!lease.meta.changes)throw new ApiError('Your checkout is being prepared. Please try again shortly.',409);row={...row,lock_until:now+30};
 }
 try{
  let session;
  try{session=await stripe(env,'/checkout/sessions','POST',row.request_params,'zikap-checkout:'+order.id+':'+row.generation,ApiError);}
  catch(error){
   const nextParams=new URLSearchParams(row.request_params),legacyKeys=[...nextParams.keys()].filter(key=>/^payment_method_types(?:\[|$)/.test(key));
   if(!error.legacyPaymentMethodRejected||legacyKeys.length!==1||legacyKeys[0]!=='payment_method_types[0]'||nextParams.get('payment_method_types[0]')!=='card'||row.session_id||row.payment_intent||row.paid_at)throw error;
   const replacement=crypto.randomUUID(),retryNow=Math.floor(Date.now()/1000);nextParams.delete('payment_method_types[0]');nextParams.set('metadata[generation]',replacement);
   // Never change parameters under an existing idempotency key. Rotate only after
   // the exact unsupported-parameter 400, while still owning this creation lease.
   const changed=await env.DB.prepare("UPDATE order_payments SET generation=?,request_params=?,started_at=?,lock_until=? WHERE order_id=? AND generation=? AND state='creating' AND session_id IS NULL AND payment_intent='' AND paid_at='' AND lock_until=? AND lock_until>?").bind(replacement,nextParams.toString(),retryNow,retryNow+30,order.id,row.generation,row.lock_until,retryNow).run();
   if(!changed.meta.changes)throw new ApiError('Checkout changed while updating its payment settings. Refresh the project before trying again.',409);
   row={...row,generation:replacement,request_params:nextParams.toString(),started_at:retryNow,lock_until:retryNow+30};
   // At most one migration per call. A lost response retains this new key for retries.
   session=await stripe(env,'/checkout/sessions','POST',row.request_params,'zikap-checkout:'+order.id+':'+row.generation,ApiError);
  }
  validSession(session,row,ApiError);
  if(session.payment_status==='paid'){await markPaid(env,row,session,null,ApiError);return{payment:summary(await rowFor(env,order.id),true)};}
  let url;try{url=new URL(session.url);}catch{throw new ApiError('Stripe checkout did not return a valid payment page.',503);}
  if(url.protocol!=='https:'||url.hostname!=='checkout.stripe.com'||url.username||url.password||session.status!=='open'||!Number.isInteger(session.expires_at))throw new ApiError('Stripe checkout did not return a valid payment page.',503);
  await env.DB.prepare("UPDATE order_payments SET state='pending',session_id=?,checkout_url=?,expires_at=?,lock_until=0 WHERE order_id=? AND generation=? AND state='creating'").bind(session.id,url.href,session.expires_at,order.id,row.generation).run();
  const saved=await rowFor(env,order.id);return saved.state==='paid'?{payment:summary(saved,true)}:{url:url.href,payment:summary(saved,true)};
 }catch(e){await env.DB.prepare("UPDATE order_payments SET lock_until=0 WHERE order_id=? AND generation=? AND state='creating' AND lock_until=?").bind(order.id,row.generation,row.lock_until).run();throw e;}
}
export async function reconcilePayment(env,id,ApiError){
 const row=await rowFor(env,id);if(!row||row.state!=='pending'||!await paymentsReady(env))return;
 const session=await stripe(env,'/checkout/sessions/'+encodeURIComponent(row.session_id),'GET',null,null,ApiError);await markPaid(env,row,session,null,ApiError);
}
export async function protectOwnerChange(env,id,next,ApiError){
 let row;try{row=await rowFor(env,id);}catch{const table=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='order_payments'").first();if(!table)return;throw new ApiError('Payment records could not be checked. Please try again.',503);}
 if(!row)return;
 if(next==='delete')throw new ApiError('Payment-linked projects cannot be deleted here. Keep the project record and manage the payment in Stripe.',409);
 if(['creating','pending'].includes(row.state)&&['in_progress','delivered'].includes(next))throw new ApiError('Confirm the Stripe payment before starting or delivering this project.',409);
 if(!['declined','requested'].includes(next))return;
 // Saving an update to a directly purchased project must not cancel its checkout.
 if(next==='requested'){const order=await env.DB.prepare('SELECT status FROM orders WHERE id=?').bind(id).first();if(order?.status==='requested')return;}
 if(row.state==='paid'&&row.refunded_cents<row.amount_cents)throw new ApiError('This project has a payment. Handle any refund in Stripe before declining it.',409);
 if(row.state==='creating')throw new ApiError('A checkout is being prepared. Wait for it to finish before changing acceptance.',409);
 if(row.state==='pending'){
  if(!stripeConfigured(env))throw new ApiError('Reconnect Stripe before cancelling this checkout.',409);
  const session=await stripe(env,'/checkout/sessions/'+encodeURIComponent(row.session_id),'GET',null,null,ApiError);validSession(session,row,ApiError);
  if(await markPaid(env,row,session,null,ApiError))throw new ApiError('A payment was confirmed. Handle any refund in Stripe before declining this project.',409);
  if(session.status==='open')await stripe(env,'/checkout/sessions/'+encodeURIComponent(row.session_id)+'/expire','POST','',null,ApiError);
  else if(session.status!=='expired')throw new ApiError('The checkout cannot be cancelled yet. Check it in Stripe.',409);
  await env.DB.prepare("UPDATE order_payments SET state='expired' WHERE order_id=? AND generation=? AND state='pending'").bind(id,row.generation).run();
 }
}
export async function stripeWebhook(req,env,ApiError){
 if(!await paymentsReady(env))throw new ApiError('Stripe is not configured.',503);
 const header=req.headers.get('stripe-signature')||'',parts=header.split(',').map(v=>v.trim()),timestamps=parts.filter(v=>v.startsWith('t=')).map(v=>v.slice(2)),signatures=parts.filter(v=>v.startsWith('v1=')).map(v=>v.slice(3));
 if(header.length>4096||timestamps.length!==1||!/^\d+$/.test(timestamps[0])||Math.abs(Date.now()/1000-Number(timestamps[0]))>300)throw new ApiError('Invalid Stripe signature.',400);
 const reader=req.body?.getReader();if(!reader)throw new ApiError('Missing webhook payload.',400);let length=0,bytes=[];
 while(true){const{done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>262144){await reader.cancel();throw new ApiError('Webhook payload too large.',413);}bytes.push(value);}
 const raw=new Uint8Array(length);let offset=0;for(const value of bytes){raw.set(value,offset);offset+=value.length;}
 let body;try{body=new TextDecoder('utf-8',{fatal:true}).decode(raw);}catch{throw new ApiError('Invalid webhook payload.',400);}
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.STRIPE_WEBHOOK_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const expected=hex(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(timestamps[0]+'.'+body)));
 if(!signatures.some(value=>/^[a-f0-9]{64}$/.test(value)&&equal(value,expected)))throw new ApiError('Invalid Stripe signature.',400);
 let event;try{event=JSON.parse(body);}catch{throw new ApiError('Invalid webhook JSON.',400);}
 if(typeof event.id!=='string'||!/^evt_[A-Za-z0-9_]{1,250}$/.test(event.id))throw new ApiError('Invalid Stripe event.',400);
 if(await env.DB.prepare('SELECT id FROM stripe_events WHERE id=?').bind(event.id).first())return{received:true,replayed:true};
 const object=event.data?.object;
 if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)){
  const row=typeof object?.metadata?.orderId==='string'?await rowFor(env,object.metadata.orderId):null;
  if(!row||object.metadata?.generation!==row.generation)return{received:true,ignored:true};
  await markPaid(env,row,object,event.id,ApiError);return{received:true};
 }
 if(event.type==='charge.refunded'){
  const intent=typeof object?.payment_intent==='string'?object.payment_intent:object?.payment_intent?.id;
  const row=intent?await env.DB.prepare('SELECT * FROM order_payments WHERE payment_intent=?').bind(intent).first():null;
  if(!row)return{received:true,ignored:true};
  if(object.livemode!==!row.test_mode||object.currency!=='usd'||object.amount!==row.amount_cents||!Number.isInteger(object.amount_refunded)||object.amount_refunded<0||object.amount_refunded>row.amount_cents)throw new ApiError('Refund details did not match the project.',400);
  await env.DB.batch([env.DB.prepare('UPDATE order_payments SET refunded_cents=MAX(refunded_cents,?) WHERE order_id=?').bind(object.amount_refunded,row.order_id),env.DB.prepare('INSERT INTO stripe_events (id,order_id,processed_at) VALUES (?,?,?) ON CONFLICT(id) DO NOTHING').bind(event.id,row.order_id,Math.floor(Date.now()/1000))]);return{received:true};
 }
 return{received:true,ignored:true};
}
