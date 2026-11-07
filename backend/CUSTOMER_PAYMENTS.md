# Customer Payments workspace

The customer sidebar now includes Payments, showing one latest saved checkout/payment record per linked project. It displays the saved provider amount, recorded refund total, saved confirmation timestamp, checkout-start timestamp and an explicit live/test mode label. Pending/expired checkouts do not appear as confirmed payments. There are no mixed live/test money totals, invented invoice numbers, refund dates or bank-settlement promises.

GET /account-api/payments requires the existing customer session, filters through customer_order_links and returns only orderId, website, packageId, packageTitle, status, testMode, amountCents, currency, refundedCents, paidAt and startedAt. The service uses saved package titles with legacy fallback, and the payment amount rather than current catalog/order pricing. Checkout URLs, provider session/intent IDs, request parameters, generations, customer emails, receipt keys and private work are excluded. No Stripe call or financial mutation is performed; saved history remains readable when Stripe keys are disabled. Existing read throttling applies.

Pages contain up to 30 records, ordered by checkout started_at then order UUID descending, with a validated continuation cursor. Each refresh starts at the first page; Load older payment records appends/deduplicates later pages. Search and live/test filters cover loaded records only. This is the current stored record per project, not every historical Stripe attempt/refund or a tax invoice. Records may change between pages; manual refresh retrieves the latest first page.

Missing schema, unsupported currency, invalid stored money/mode/state data or query failures produce a generic 503 rather than an empty/no-payment result. An empty successful response has its own UI state. Refresh failure retains prior loaded records with an explicit message. Open project uses the existing authenticated project reader and its payment-status controls. Account clearing/entry resets the payments view, and response epoch guards prevent late requests from repopulating a cleared session. No new migration, email, recurring billing or payment/refund action was introduced.

Validation on November 7, 2026:

- All 159 backend tests passed. Two new integration tests cover authenticated customer isolation, exact output allowlist, stored amounts versus a changed project price, saved service title, test/live modes, partial/full refunds, pending/expired states, tie-safe 30/2 pagination, malformed cursor, unsupported methods, empty history, invalid refund data, missing schema, disabled Stripe keys and zero provider calls.
- Account/server/payment-view JS syntax passed. Actual customer assets were exercised with isolated sample records; no fixture is deployed.
- Load older records expanded three records to five. Live and test filtering returned three and two records respectively. Test records retained the no-real-charge label; pending records displayed Checkout amount / Not confirmed. Open project opened the matching existing reader.
- A refresh outage retained three previously loaded records with an error. Initial failure showed an unavailable/load state, while a successful empty response showed No saved payment records. A delayed response after simulated session expiry left authentication visible and zero payment cards. Fixture write-call count remained zero.
- A 390px iframe supported combined search/test filtering with body client/scroll widths both 375px. The screenshot uses clearly labeled sample records, not real customer transactions.

Live deployment verification does not demonstrate a new genuine purchase. No production customer/order/payment/refund/message/AI record is created to demonstrate this feature.
