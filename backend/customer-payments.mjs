import {titles} from './catalog.mjs';

// Account-owned saved payment records. Never call Stripe or return checkout credentials.
export async function customerPayments(req,env,user,ApiError){
 if(req.method!=='GET')throw new ApiError('Method not allowed.',405);
 const before=new URL(req.url).searchParams.get('before');let cursor=null;
 if(before!==null){
  const match=before.match(/^(0|[1-9][0-9]{0,11})\|([a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})$/);
  if(!match)throw new ApiError('Invalid payment history cursor.');
  cursor={startedAt:Number(match[1]),id:match[2]};
 }
 try{
  let sql=`SELECT p.order_id orderId,p.state,p.amount_cents amountCents,p.currency,p.test_mode testMode,
   p.refunded_cents refundedCents,p.paid_at paidAt,p.started_at startedAt,
   o.website,o.package_id packageId,s.title packageTitle
   FROM order_payments p JOIN customer_order_links l ON l.order_id=p.order_id
   JOIN orders o ON o.id=p.order_id LEFT JOIN order_package_snapshots s ON s.order_id=o.id
   WHERE l.user_id=?`;
  const args=[user.id];if(cursor){sql+=' AND (p.started_at<? OR (p.started_at=? AND p.order_id<?))';args.push(cursor.startedAt,cursor.startedAt,cursor.id);}
  sql+=' ORDER BY p.started_at DESC,p.order_id DESC LIMIT 31';
  const {results}=await env.DB.prepare(sql).bind(...args).all(),rows=results.slice(0,30);
  const payments=rows.map(row=>{
   if(!['creating','pending','expired','paid'].includes(row.state)||row.currency!=='usd'||![0,1].includes(row.testMode)||!Number.isSafeInteger(row.amountCents)||row.amountCents<=0||!Number.isSafeInteger(row.refundedCents)||row.refundedCents<0||row.refundedCents>row.amountCents||!Number.isSafeInteger(row.startedAt)||row.startedAt<0||row.startedAt>999999999999||(row.refundedCents>0&&row.state!=='paid'))throw new Error('Invalid saved payment record');
   const status=row.state==='paid'?(row.refundedCents===row.amountCents?'refunded':row.refundedCents>0?'partially_refunded':'paid'):row.state==='expired'?'expired':'pending';
   return {orderId:row.orderId,website:row.website,packageId:row.packageId,packageTitle:row.packageTitle||titles[row.packageId]||row.packageId,status,testMode:!!row.testMode,amountCents:row.amountCents,currency:'usd',refundedCents:row.refundedCents,paidAt:typeof row.paidAt==='string'?row.paidAt:'',startedAt:row.startedAt};
  });
  const last=rows.at(-1);return {payments,next:results.length>30?last.startedAt+'|'+last.orderId:null,asOf:new Date().toISOString()};
 }catch{throw new ApiError('Payment history is temporarily unavailable. Refresh before relying on the saved status.',503);}
}
