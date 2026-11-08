# Uncertain customer request recovery

Reviewed November 8, 2026.

An uncertain submission now retains its request reference even if the customer edits the brief before retrying. Check previous submission reads the existing authenticated own-order endpoint and creates no request or payment. A found, matching brief clears the submitted form; a different edited brief remains available for review. A 404 retains the uncertain reference because an earlier write may still be processing. Form editing/submission/clearing is locked while the lookup runs, and session cleanup invalidates delayed results.

## Verification

- `node --test backend/test/request-recovery.test.mjs backend/test/accounts.test.mjs`: 15 passed. Includes reference reuse/reset, canonical saved-brief comparison, malformed data, existing own-account isolation and changed-body collision preserving the original saved goals.
- JavaScript syntax checks passed.
- Isolated browser: simulated stored request plus lost response, edited retry gave two POST attempts, one unique reference and one saved request. A subsequent GET found the original brief and retained the edited form.
- Isolated browser: first attempt not saved, lookup returned 404 and retained the form/reference. Edited retry then saved successfully with two POST attempts and one unique reference.
- Isolated mobile: matching saved brief recovered with one POST and one lookup; submitted form cleared. Body client/scroll width both 360 px in a 375 px iframe.
- Isolated delayed lookup after session expiry did not restore the dashboard or the cleared form.

Fixtures are preview-only and labeled. No real account/order/payment write or AI inference was performed. The reference is in memory: page reload, account cleanup or explicitly clearing the form ends this recovery context. This does not promise durable drafts or duplicate prevention across independent sessions.
