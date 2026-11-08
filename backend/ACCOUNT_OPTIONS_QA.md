# Expanded My account options and saved display name

November 8, 2026.

My account now provides ten working shortcuts: edit personal details, password change, recovery-code replacement, signed-in sessions, payments/refunds, service requests, private data download, support conversations, privacy requests and linking an earlier receipt. Security shortcuts reveal and focus the relevant existing control. Privacy requests link to existing support and explicitly ask the customer to choose Privacy; they do not delete accounts or issue refunds.

A new authenticated GET /account-api/profile returns only name, email and createdAt. PATCH on the same route changes only the display name, with same-origin protection, a ten-attempt hourly profile rate bucket, a 2 KB JSON limit and single-line 1–100 character validation. Unknown fields, including email changes, are rejected. The conditional update uses the signed-in user ID and the expected saved name to reject stale edits. No migration or new personal fields are added. Existing project/customer snapshots, email, credentials and payment records remain unchanged. The existing private JSON export already reads the current saved name and registration date.

The profile editor shows the real account creation date, preserves a draft after errors, and requires refreshing/reviewing after a conflict. Refresh keeps a changed draft while loading the current saved baseline. Successful save updates the displayed name, initials and greeting. Epoch checks prevent late reads/writes from repainting a cleared account. Unsaved profile names are included in the existing sign-out warning; page-leave protection requests the browser's native warning, whose display remains browser-controlled. The top-right My account link continues to show no customer name.

Validation:

- All 177 tests passed. Two new account tests cover redacted profile DTO/date, authentication, origin and method checks, account isolation, saved name updates, stale edits, invalid/control-character names, rejected email changes and unchanged previous project records.
- JavaScript syntax checks passed for the backend and customer scripts.
- Actual account assets with isolated fetch fixtures: a new name saved and updated the display; another-page edit returned a conflict; Refresh saved details preserved the draft and loaded the new baseline; saving again succeeded. Ten shortcuts were present, and Change password opened Security and focused its form.
- Cancelling sign-out with an unsaved name kept the draft and dashboard visible.
- A delayed profile read completed after simulated session expiry without repopulating the profile or name editor.
- Mobile iframe 375 px: body client/scroll widths both 360 px, with stacked controls and no horizontal overflow.

Real production profile verification is read-only. No real customer name, credential, account, session, order, message or payment was changed merely for QA. Domain/email setup stays deferred. Email editing, extra address/phone collection, automatic deletion, subscriptions and new payment operations are outside this release.
