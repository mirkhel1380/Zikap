# Stripe checkout activation

The integration is implemented but cannot collect payments until the merchant configures the two Stripe secrets. Start in Stripe test mode. No Stripe secret is stored in the repository or client code, and no test/live transaction has been performed against the merchant's account by the agent.

1. In Stripe, obtain the test secret API key. In Cloudflare **Builds variables and secrets** for this Worker, add it as an encrypted secret named `STRIPE_SECRET_KEY`. Never send its value in chat. The existing build root stays `backend` and deploy command stays `npm run deploy`.
2. Create a Stripe snapshot event destination for `https://zikap.m-mirkhel20.workers.dev/stripe/webhook`, using API version `2026-10-28.endive`. Select `checkout.session.completed`, `checkout.session.async_payment_succeeded`, and `charge.refunded`. Use events from this merchant account, not a Connect/organization destination. Copy that destination's signing secret into a second encrypted build secret named `STRIPE_WEBHOOK_SECRET`.
3. Run a deployment. The deploy helper applies `0003_stripe_payments.sql` and transfers the supplied Stripe secrets, together with the existing owner secret, to runtime over stdin. It does not print values or place them in command arguments or child environment variables. Existing runtime secrets are not removed when omitted from the build environment. Runtime secrets can alternatively be configured directly by the merchant in Worker settings.
4. Check `/health` reports `payments:true`. This flag checks configuration and schema; it is not proof that the merchant's webhook registration, card-processing eligibility or an actual payment has been tested. Complete a merchant-operated test checkout before using live keys.

Test the complete journey with a disposable test project: create a customer account/project, accept it in the owner desk, confirm the scope/amount in the customer dashboard, continue to Stripe, and complete checkout using Stripe's documented test payment details. Confirm paid/test mode in both dashboards, refresh the page, resend a webhook and verify one financial record. Test a cancellation, an expired checkout, a provider-side refund, and a wrong signature. No real card or live charge is needed for this test. Live activation requires the corresponding live API key and live destination signing secret, followed by another deployment. Do not switch merchant accounts or mix test/live modes on an existing checkout; use separate test projects.

## Implemented behavior

- Only the signed-in owner of an accepted project can open checkout. Package amounts come from the server catalog and stored order, not browser parameters. Payments are one-time USD payments through Stripe-hosted Checkout, using eligible payment methods enabled in the Stripe Dashboard. The application never receives card details.
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

## Readiness diagnostics

`/health` now returns `paymentChecks`: `secretKey` and `webhookSecret` are `missing`, `invalid_format` or `configured`; `databaseBinding` is a boolean; `paymentRecordsTable` and `webhookEventsTable` are booleans, or null when no database is bound. Key configuration checks recognize supported prefixes only, not Stripe validity, permissions, account eligibility or destination settings. No secret values, fragments, lengths, SQL errors or Stripe records are returned. These diagnostics make no Stripe requests and create no payment. Existing runtime secrets omitted from Builds remain preserved by deployment.

## Checkout rejection support codes

Stripe non-2xx replies now map to fixed support categories: STRIPE_AUTHENTICATION, STRIPE_PERMISSIONS, STRIPE_RATE_LIMIT, STRIPE_IDEMPOTENCY, STRIPE_ACCOUNT, STRIPE_REQUEST or STRIPE_PROVIDER. Configuration errors can include an exact allowlisted server-sent parameter name. The application never relays provider messages, arbitrary parameter strings, credential fragments, request IDs, log URLs, headers or raw response bodies. Readiness remains a local configuration/schema check and does not certify API-key validity. Rejected attempts retain the original immutable request and idempotency key; no automatic replacement session or key change is introduced.

## Dashboard-managed payment methods

New Checkout Session requests omit payment_method_types, as required by the current API. Stripe selects eligible enabled methods from the merchant's Dashboard. This does not enable methods, change the merchant account, activate live mode, add subscriptions or change USD prices. Delayed payments remain unpaid until a verified success event or server retrieval confirms payment.

A previously persisted creating attempt is still retried with its original immutable body and idempotency key first. Only an explicit HTTP 400 invalid_request_error for payment_method_types, with the exact discontinued-parameter reason, can migrate a legacy card-only body. A lease- and generation-guarded update removes that field, updates the generation metadata and persists a fresh idempotency key before one replacement request. Known sessions, paid records, unknown network outcomes, other errors and attempts older than the existing safety window are not automatically replaced. Retries after an interrupted migration reuse the new saved key. A stale request cannot clear a newer creation lease.

References: https://docs.stripe.com/payments/payment-methods/dynamic-payment-methods and https://docs.stripe.com/api/idempotent_requests .

## Merchant-operated verification and live configuration handoff (2026-11-01)

The owner completed the sandbox checkout journey and reported Payment confirmed in the Zikap account. The matching checkout.session.completed delivery returned HTTP 200. Resending that event returned HTTP 200 again, and the owner confirmed only one test payment record. The owner refunded the $29 test payment in Stripe and reported the matching Refunded in Stripe / TEST MODE status in Zikap. A separate $79 sandbox checkout was exited without payment; Zikap correctly continued to show an existing pending checkout rather than a paid record. These are owner-reported checks, not direct inspection of private Stripe records by the agent. Expiry and forged-signature behavior are covered by automated fixtures, not claimed as merchant-operated production checks.

The owner then reported creating a separate live Snapshot event destination with the same three event types and endpoint URL, and storing a dedicated live restricted API key plus the live destination signing secret in encrypted Cloudflare Builds variables. The key is intended for this integration and the selected permission is Checkout Sessions: Write. The deployment helper transfers both configured secrets to runtime together over stdin. No secret values were received in chat, source or logs.

After deployment, verify payments:true and paymentTestMode:false using the public account status endpoint. These flags confirm configuration/schema/mode only. A restricted key's actual permissions, the live destination settings, merchant eligibility and a completed real payment are not certified by readiness. The agent has not charged or refunded real money. Sandbox-linked projects keep their test records and cannot silently switch to live-mode checkouts. Use a separate legitimate project for any future live checkout.

Live configuration deployment verified on 2026-11-01: Cloudflare Builds completed successfully, and /account-api/status returned ready:true, payments:true and paymentTestMode:false. This confirms the live-mode configuration was loaded. Actual live-key API permissions, a completed live checkout and a matching live webhook delivery are not yet verified; no real charge or refund was executed by the agent. Public pricing copy now points to account-based acceptance and the available Stripe payment step instead of claiming online payment is disabled.
