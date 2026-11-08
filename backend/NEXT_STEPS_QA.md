# Customer overview next steps

November 8, 2026.

Overview now derives a compact read-only next-step panel from the existing loaded, account-owned project list. It prioritizes real unread message counts, accepted projects whose available checkout is pending/unpaid, then nonblank delivered reports. One suggestion is shown per project, with at most six cards. The total, loaded-project scope and older-project availability are explicit. Report prompts do not claim unread/read tracking. Used clarifications are identified rather than offered again.

Pending checkout asks the customer to check the saved status before another attempt. Paid, partially refunded, refunded, unavailable and unaccepted projects receive no checkout prompt. Test records retain a no-real-charge note. Opening a card uses the existing fresh project GET and existing project controls; it does not create a checkout, collect payment, mark a message read or change a project by itself. Any existing conversation read controls remain in the project view.

The panel uses no new backend route, scheduled task, AI call, provider call, browser storage or new financial action. Refresh/loading/errors distinguish stale suggestions from current results and disable panel actions until the project list refreshes successfully. An initial load failure shows unavailable figures as dashes, not a misleading zero-project count. Existing successfully loaded figures remain a cached snapshot after refresh failure. Empty successful accounts keep the existing starting guide without an extra empty panel. Sign-out/expiry clears the panel; new sign-in starts with an empty in-memory project map. List catch/finally handlers now also reject superseded request versions.

Validation:

- Three new suggestion tests cover message priority/one per project, deterministic ordering, accepted/available payment gating, paid/refunded exclusions, pending safety copy, test mode, delivered/nonblank reports and used clarification wording. These plus the four request-preparation and four recovery-file tests passed (11 total). JavaScript syntax checks passed.
- Actual account assets with isolated fixtures: five projects produced three correctly ordered cards (messages, pending checkout, delivered report); refunded/waiting projects produced none. Checkout card opened the correct project detail without submitting checkout.
- A simulated refresh outage retained cards with an error and disabled buttons; restoring and refreshing re-enabled the three cards. An initial outage showed no empty-success claim and unknown summary counts as dashes.
- An empty account hid the panel and retained the starting guide. Eight qualifying loaded projects showed six cards plus the correct total and older-project notice.
- Mobile iframe 390 px: body client and scroll widths both 375 px. Session-expiry fixture cleared all panel children and hid the panel.

Browser fixtures do not represent production data. Production verification is read-only; no new accounts, messages, orders, checkouts, payments, refunds or website checks are required. Domain and email setup remain deferred.
