# Customer-visible work-start updates

The approved refund draft distinguishes payment/acceptance from starting paid work. The existing owner editor now asks for a fresh customer-visible scope/start update when moving an order to In progress. Reusing the acceptance note or leaving it empty is rejected in the UI and the primary API. An already-in-progress project can retain its nonempty update while its report is edited.

The primary API preserves payment protection and optional edit-version conflict checks. It also rechecks the note/transition condition in the UPDATE, including legacy writes without a version. A conflicting concurrent change produces no start transition. Successful saves continue to use the server-generated update timestamp and existing customer-visible note/status fields.

This is a guard against accidentally starting without a new notice. It does not independently verify that physical work occurred, create an immutable first-start timestamp, enforce payment for every possible legacy order, calculate refunds, or move money. Existing bounded owner history and later edits retain their previous behavior. No existing order was rewritten at deployment.

Validation: 154 backend tests passed, including empty/reused start notes, valid dated acknowledgements, report edits while in progress, legacy writes and a concurrent note change. Existing pending-payment protections still pass. An isolated preview of the actual owner editor rejected reuse with zero fixture writes, then accepted a fresh scope/start notice with one fixture write. No production customer, order, payment, message or refund was created for demonstration.
