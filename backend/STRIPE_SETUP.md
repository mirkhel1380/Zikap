# Stripe checkout activation

The integration is implemented but cannot collect payments until the merchant configures the two Stripe secrets. Start in Stripe test mode. No Stripe secret is stored in the repository or client code, and no test/live transaction has been performed against the merchant's account by the agent.

1. In Stripe, obtain the test secret API key. In Cloudflare **Builds variables and secrets** for this Worker, add it as an encrypted secret named `STRIPE_SECRET_KEY`. Never send its value in chat. The existing build root stays `backend` and deploy command stays `npm run deploy`.
2. Create a Stripe snapshot event destination for `https://zikap.m-mirkhel20.workers.dev/stripe/webhook`, using API version `2026-10-28.endive`. Select `checkout.session.completed`, `checkout.session.async_payment_succeeded`, and `charge.refunded`. Use events from this merchant account, not a Connect/organization destination. Copy that destination's signing secret into a second encrypted build secret named `STRIPE_WEBHOOK_SECRET`.
3. Run a deployment. The deploy helper applies `0003_stripe_payments.sql` and transfers the supplied Stripe secrets, together with the existing owner secret, to runtime over stdin. It does not print values or place them in command arguments or child environment variables. Existing runtime secrets are not removed when omitted from the build environment. Runtime secrets can alternatively be configured directly by the merchant in Worker settings.
4. Check `/health` reports `payments:true`. This flag checks configuration and schema; it is not proof that the merchant's webhook registration, card-processing eligibility or an actual payment has been tested. Complete a merchant-operated test checkout before using live keys.

Test the complete journey with a disposable test project: create a customer account/project, accept it in the owner desk, confirm the scope/amount in the customer dashboard, continue to Stripe, and complete checkout using Stripe's documented test payment details. Confirm paid/test mode in both dashboards, refresh the page, resend a webhook and verify one financial record. Test a cancellation, an expired checkout, a provider-side refund, and a wrong signature. No real card or live charge is needed for this test. Live activation requires the corresponding live API key and live destination signing secret, followed by another deployment. Do not switch merchant accounts or mix test/live modes on an existing checkout; use separate test projects.

## Implemented behavior

- Only the signed-in owner of an accepted project can open checkout. Package amounts come from the server catalog and stored order, not browser parameters. Payments are one-time USD card payments through Stripe-hosted Checkout. The application never receives card details.
- Checkout attempts persist a generation, immutable request parameters, Stripe idempotency key and short creation lease. Concurrent clicks and lost responses reuse the same attempt. An expired session is retrieved from Stripe before replacement. A sufficiently old attempt with an unknown outcome is blocked for merchant review rather than recreated.
- The Stripe session must match the project, generation, mode, currency and exact amount. Only an authoritative paid/complete session, verified through a signed webhook or a server-side Stripe read, marks payment confirmed. A return URL or browser `paid` flag cannot do that.
- Raw webhook bodies are size limited. HMAC signatures and a five-minute timestamp tolerance are verified before parsing; event IDs are recorded for replay safety. Paid timestamps are preserved, and refunds never decrease when events arrive out of order. Test payments are labelled explicitly and do not set `paymentCollected:true`.
- Payment and project fulfillment are separate. A payment does not generate SEO work or automatically deliver a report. The owner performs the specialist work. An active checkout is expired before acceptance is withdrawn; confirmed payments must be handled in Stripe before a project is declined. Payment-linked projects cannot be deleted through the owner desk.
- Refund initiation, disputes, taxes, invoices, Stripe receipts and merchant account settings are managed in Stripe. This application does not automate refunds, settlements or transfers. Its payment status is not a replacement for Stripe's financial records.

## Verification

Automated tests use an isolated Stripe transport and real SQLite SQL, never the merchant's API credentials. They cover ownership, acceptance, amounts, signatures, test/live separation, retries, parallel clicks, old unknown attempts, session expiry, cancellation, reconciliation, refunds and protected record retention. Merchant test-mode and production transactions remain unverified until the merchant completes the steps above.

Primary implementation references:

- https://docs.stripe.com/api/checkout/sessions/create
- https://docs.stripe.com/checkout/fulfillment
- https://docs.stripe.com/events/manage-webhook-endpoints
- https://github.com/stripe/stripe-node/blob/master/src/Webhooks.ts
