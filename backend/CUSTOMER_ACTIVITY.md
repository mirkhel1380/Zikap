# Recent customer project activity

Customers can open Recent project activity below the latest project update, then explicitly load or refresh saved states. The authenticated GET /account-api/orders/:id/activity checks the signed-in customer's existing order link before reading any history. It returns only version, status, savedAt and current; previous reports, notes, revision text, credentials and payment information are excluded.

One SQL statement reads the current state and up to 20 retained previous states, newest first. History is not backfilled. Repeated statuses can represent report/note edits. Dates describe saved states, not verified work, first-start times, payment events or a complete audit trail. No new migration, background polling, email or AI call is introduced.

Missing history support returns 503 while the normal project detail remains usable. The UI shows a retryable error and retains previously loaded states. Disconnected project views and cleared sessions ignore late activity responses.

Validation (November 7, 2026): 157 backend tests passed, with the activity test additionally rerun after adding initial-state coverage. It verifies initial/current state, retention bounds, descending versions, the exact metadata allowlist, customer isolation, sign-in requirement, read-only methods and missing-history fallback. Actual customer assets were checked in an isolated desktop fixture and a 390px iframe (375px content, no horizontal overflow). The load/refresh controls rendered the sample states. No production customers, orders or payments were created for this check.
