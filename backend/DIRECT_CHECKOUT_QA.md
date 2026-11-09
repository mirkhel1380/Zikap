# Fixed-package direct Checkout — November 9, 2026

## Result

The four fixed starter packages can enter Stripe Checkout in `requested` or `accepted` state. Manual acceptance no longer gates payment. A saved brief, known catalog scope, one-time price and explicit customer acknowledgement precede automatic checkout. Price, title or description mismatches on a recovered order require review in the saved project rather than automatic acknowledgement.

Order creation remains idempotent. A failed/closed checkout is retried from the same saved project. Navigating away or ending the account session prevents a delayed response from redirecting the customer. A read-only previous-submission check never opens Checkout automatically.

Payment and fulfillment remain separate. Paying does not start work or create a report. Requested paid projects can receive owner updates; paid orders cannot be declined before the applicable refund is handled. Custom work requires a separately agreed scope and price through support. Existing saved amounts and agreed arrangements remain preserved.

## Validation

- Complete Node test suite: 214 passed, including provider leases, idempotency, payment reconciliation, signed webhooks, refunds, account ownership and end-to-end project fulfillment.
- New backend cases: all four packages enter checkout without an acceptance PATCH, retain requested fulfillment status, and reuse their pending session; owner updates preserve direct payments while paid decline remains blocked.
- New UI cases: exact saved quote starts checkout; missing explicit acknowledgement blocks submission; quote mismatch requires review; lost save response keeps the same request reference; navigation suppresses a delayed automatic checkout.
- Browser, actual account assets with isolated synthetic fetch fixtures: submitting the brief automatically made one checkout request without acceptance. A simulated Stripe outage left one saved project and an enabled retry button. Delayed checkout was completed after moving to My account; the customer remained in My account and no Stripe navigation occurred.
- Public and account copy explains upfront fixed-package payment, specialist review/timing afterward, dated work commencement and the existing refund policy. Service terms version 2026-11-09.2 records this flow; stored prices and already agreed arrangements are preserved.

## Limits

No real customer account/order, live Stripe Checkout session, real payment, refund, AI call or external customer message was created for QA. Provider behavior was exercised through mocked Stripe transport; no claim of a new live purchase is made.
