# Order journey verification

Verified on 2026-11-01 against the repository's customer and independent admin handlers.

## Isolated checks

The six existing order, account, admin, payment, message and action-plan suites passed: 70 tests, zero failures. A new integrated journey passed separately: one test, zero failures.

Run the integrated regression with Node.js 24 from `backend/`:

```sh
node --test test/customer-journey.test.mjs
```

It applies all migrations to a fresh memory-only SQLite database and exercises:

1. Customer registration, private session and an idempotent project request.
2. Owner login on the independent admin handler, service-binding forwarding and customer/admin session separation.
3. Scope acceptance with editing-version protection; checkout unavailable before acceptance or without acknowledgment.
4. A server-priced $29 USD one-time checkout; a forged amount is ignored, Dashboard-managed payment methods are preserved, and repeated clicks reuse one session.
5. Signed payment confirmation, webhook replay protection and server-side reconciliation. A test payment stays explicitly labelled and never inflates live revenue.
6. Customer and owner messages through the shared protected project conversation.
7. Exact report delivery to customer detail and report-list data, with saved owner history.
8. A customer action-plan item, its completion, one included revision and rejection of a second revision.
9. Logout revoking customer and owner access.

Stripe's HTTP transport is simulated in process. This regression makes no external payment-provider requests, creates no production accounts or orders and transfers no money. It supplements the independent feature tests; it does not certify Stripe credentials or deployed Cloudflare behavior.

## Deployment evidence and remaining limit

The previous deployment review confirmed both workspace releases and the public readiness flags, including payments enabled and live mode configured. The merchant previously reported successful Stripe sandbox checkout, webhook/replay and refund checks. These are distinct from this automated regression.

The current restricted live key's permissions, merchant account eligibility and an actual live payment/webhook have not been independently verified. A configuration-ready flag alone cannot verify them. Observe the first genuine customer purchase through Stripe's own records and the matching Zikap project; do not create an artificial live purchase to test payment processing.

Stripe directs integration testing to a sandbox with test keys and test payment values. Its agreement prohibits testing in live mode with real payment details:
https://docs.stripe.com/testing

Do not switch the active production integration back to test mode or mix test/live secrets to rerun this regression. Any further merchant-operated hosted Checkout test belongs in a separate sandbox deployment with its own database and signing secret.
