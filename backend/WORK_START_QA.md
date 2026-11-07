# Customer-visible work-start updates

The approved refund draft distinguishes payment/acceptance from starting paid work. The existing owner editor now asks for a fresh customer-visible scope/start update when moving an order to In progress. Reusing the acceptance note or leaving it empty is rejected in the UI and the primary API. An already-in-progress project can retain its nonempty update while its report is edited.

The primary API preserves payment protection and optional edit-version conflict checks. It also rechecks the note/transition condition in the UPDATE, including legacy writes without a version. A conflicting concurrent change produces no start transition. Successful saves continue to use the server-generated update timestamp and existing customer-visible note/status fields.

This is a guard against accidentally starting without a new notice. It does not independently verify that physical work occurred, create an immutable first-start timestamp, enforce payment for every possible legacy order, calculate refunds, or move money. Existing bounded owner history and later edits retain their previous behavior. No existing order was rewritten at deployment.

Validation: 154 backend tests passed, including empty/reused start notes, valid dated acknowledgements, report edits while in progress, legacy writes and a concurrent note change. Existing pending-payment protections still pass. An isolated preview of the actual owner editor rejected reuse with zero fixture writes, then accepted a fresh scope/start notice with one fixture write. No production customer, order, payment, message or refund was created for demonstration.

## Delivery validation companion

The primary owner API now applies the same unfinished-outline check as the owner editor before accepting Delivered. Empty/whitespace-only reports and case-insensitive `[ADD ...]` placeholders fail before the order, report, note or history version is changed. Both the separate cookie-authenticated admin bridge and legacy owner bearer route use this check. Templates remain saveable as drafts under a non-delivered status. Text such as `[ADDITION]` is not treated as a template marker.

This check prevents accidental delivery of the built-in unfinished outline; it does not independently assess report quality, truthfulness or completeness. No report is generated, rewritten or delivered automatically. The release passed 156 backend tests, including state/history preservation after rejection, legacy-route protection and successful explicit delivery of non-template text. No production orders, reports, messages or payment actions were used for demonstration. Owner UI behavior is unchanged; this is a server-side consistency fix.
