# Public package-to-account handoff

November 8, 2026.

A signed-out visitor's linked package was previously selected before the initial session check, then overwritten by clearAccount/resetRequestForm when the session check returned 401. The original linked website/page inputs were also reset. Registration additionally sent the customer to Overview after closing the recovery-code panel rather than back to the selected request form.

The sanitized initial link selection is now held only in page memory until the first successful sign-in/registration/recovery. The initial signed-out check preserves this pending selection without filling a signed-out hidden project form. On entering the account, the one-time selection is applied and package/website/pages parameters are removed from the current URL. Unrelated query fields and the workspace hash are retained. Subsequent account cleanup clears the pending selection; sign-out/expiry still clears form values and consent. A selected package alone is the new form baseline rather than an unsaved personal draft.

The handoff accepts only four known package IDs and bounded, complete HTTP/HTTPS website/page URLs with matching origins. Embedded credentials, query-bearing URLs, foreign/non-HTTP pages and oversized lists are rejected. Fragments are removed. Invalid page lists are not silently truncated. The parser does not fetch linked URLs or certify DNS reachability, public routability or site ownership. Price and consent parameters are not used; current catalog quote checks and explicit project consent remain authoritative. This does not send a request, create checkout or charge a customer.

The recovery-code acknowledgement now resumes the current valid workspace destination (including New request or My account) rather than always forcing Overview. It still clears the displayed private recovery code.

Validation:

- Three new handoff tests and four existing request-validation tests passed (7 total). Cases cover all package IDs, one-use/clear behavior, ignored price/consent, URL normalization, embedded credentials, query/foreign/blob URLs, oversized lists and later-account reuse prevention.
- Actual account assets with explicitly labeled isolated auth fixtures: an initial 401 followed by example sign-in retained On-page, a valid website/page URL and unchecked project consent. The link parameters were removed after entry; zero order writes occurred.
- Simulated session end and a second example sign-in returned an empty default form without reapplying the first selection.
- Example registration with Bundle followed by recovery-code acknowledgement returned to New request with Bundle still selected and the recovery box cleared.
- A rejected example sign-in preserved the selection notice; a second example sign-in still selected Keywords, with zero order writes.
- Mobile iframe 375 px selected Keywords after example sign-in; body client/scroll widths both 360 px, without horizontal overflow.
- JavaScript syntax checks passed. No backend route changed, so backend tests were not rerun for this frontend change. No real credentials/accounts were entered/created and no production registration, recovery, order or payment was submitted for QA.

Production verification can use an already signed-in session and a public package link, stopping at the unchecked, unsubmitted request form. Domain/email/policy adoption remain deferred as instructed. This release verifies the selection/access handoff, not a new full live financial purchase.
