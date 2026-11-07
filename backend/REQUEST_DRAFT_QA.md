# Customer request form and session cleanup

The request form now describes its in-page draft state, offers confirmed Clear form, and warns before sign-out with unsubmitted request/support details. Moving between workspace views retains the existing form DOM. No draft is written to localStorage, sessionStorage, cookies or D1. Clear form resets only local inputs and the pending retry reference; it does not withdraw any project already received by the server.

A beforeunload handler asks the browser to warn while a request draft or submission is pending. Native page-leave prompts depend on the browser and are not durable draft recovery. Their platform-specific rendering was not tested. Signing out or expiring the account always clears request fields, consent, receipt fields/file input and related messages. Asynchronous receipt reads use account epoch and selection-version guards to avoid repopulating cleared fields; that file-read interruption guard was source-checked rather than exercised with a delayed native file read.

Submission locks form inputs, Clear form and Submit until its result is handled. Failed submissions keep inputs and the existing request reference for an unchanged retry. A successful request resets form details, preserving the selected package as the new empty baseline so it does not create a false draft warning. Late submission results/finalizers cannot repaint a cleared session. No backend/payment contract, price, migration or email behavior changed.

Validation on November 7, 2026:

- Account JS syntax passed; ten existing account and customer-journey backend regression tests passed.
- Isolated actual customer assets retained website/goals through Overview and back. Cancelling native sign-out confirmation sent zero logout calls. Confirming Clear form cleared inputs without a request call.
- Confirmed sign-out cleared request website/goals and the synthetic receipt key/order ID; one mock logout and zero mock request calls were recorded.
- An isolated 503 response retained values and unlocked fields. An unchanged retry reused the same request reference and succeeded; returning to New request showed empty fields and no false draft for the retained keyword package.
- A delayed mock submission locked form controls. Simulated session expiry cleared the form; completing the old response left authentication visible, fields empty and the project message empty.
- A 390px iframe showed the dirty notice and enabled Clear form with client/scroll widths both 375px. The screenshot contains only isolated sample text.

No production account, request, receipt link, message, payment or AI generation was created for these checks. The isolated fixtures are not deployed.
