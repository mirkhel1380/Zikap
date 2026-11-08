# Contextual customer support shortcuts

November 8, 2026.

Privacy requests in My account and the Your data note now open the support creation form with Privacy or account data selected and the subject focused. Payments offers separate Payment question and Refund review links with the matching topic selected. These are local navigation actions: they do not send messages, change records, issue refunds or delete accounts.

The shared support component exposes customer-only startRequest(topic). It validates the fixed topic, refuses to change a form while submission is pending, and preserves an existing subject/body/topic draft. An existing draft gets an explicit preservation message rather than silent replacement. Empty forms get the selected topic and a Nothing has been sent message. The customer still writes the subject/message and chooses Send support request. Owner support does not offer this customer-only action; its shared source remains identical, and both script references are versioned.

Validation:

- Customer account/support script syntax checks passed. Customer/owner shared support files match byte-for-byte.
- Actual customer assets with isolated fetch fixtures: the My account privacy shortcut opened Privacy, focused the composer and made zero write calls. Returning with a General question draft preserved subject/body/topic and displayed the preservation message.
- Separate payment and refund shortcuts selected their respective topics without write calls. The refund link was checked in the current visible Payments state after navigation.
- Mobile iframe 375 px: Privacy selected correctly and body client/scroll widths both 360 px, with no horizontal overflow.
- Existing backend support/authentication/payment behavior was unchanged; no backend tests were rerun for this bounded frontend navigation change. The previous release's 177-test result is not a new test run for this change.

Production verification is limited to opening a clean form and observing its topic; no real message, order, refund, payment, deletion request or credential operation is needed. Domain/email setup remains deferred.
