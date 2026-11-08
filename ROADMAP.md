# Zikap remaining work

Reviewed November 7, 2026 against repository main. English UI, original logo, GitHub Pages public site and separate Cloudflare customer/admin applications remain the product structure.

## Completed and verified

- Customer Account & security now shows real session creation/expiry dates and the current session, with password-confirmed sign-out of other sessions. Auth/origin/race isolation and delayed-response cleanup passed; all 164 tests passed on November 8. No device metadata was added. See backend/ACCOUNT_SESSIONS_QA.md.

- Customer and owner dashboards share the navy/blue workspace design. Real project lists have List/Board layouts, private report delivery, messages, action plans and version-protected owner editing/history.
- Public inner pages match the home-page design. The home header and mobile menu expose the customer AI website review workspace.
- Source-HTML checks sample up to three permitted public pages, show evidence/limitations and recommend optional manual services only when findings support them.
- Initial one-time USD prices are audit $29, keywords $19, on-page $39 and bundle $79; subsequent prices are controlled by the saved service catalog. No recurring billing or $1 trial has been introduced.
- A complete isolated customer/admin/payment/message/report/revision regression passed. The November 7 catalog release passed 127 tests, including price-change races, immutable order prices, owner-only publishing and the complete isolated order/payment journey.
- Stripe live configuration and the payment schema were observed ready in the November 2 deployment review. The merchant previously reported successful sandbox checkout, webhook replay and refund checks. No genuine live purchase has been independently observed; do not use an artificial live purchase for testing.
- Durable transactional email notifications and four templates are deployed. Sending was last observed off, pending the owner’s domain, verified sender, provider key and approved delivery check.
- Private saved website checks and limited AI explanations are deployed. The owner confirmed Workers Free on November 7 and authorized activation. The release registers the activation flag, with a false build override to disable; real inference and quality still require a signed-in owner-controlled check. Limits are two attempts per customer per UTC day and twenty shared attempts. No production inference was performed during release.

- Owner-only project review checklists and internal notes now persist independently in D1, with stale-write protection, private draft downloads and unsaved-edit warnings. They are excluded from customer payloads, reports, messages and order edit history.

- Service names, public summaries and one-time whole-USD prices are now editable in the owner Services view. Public pages and intake load the shared catalog; quote/version checks and atomic insertion protect against stale prices. New orders snapshot package details and price, and Stripe uses that saved amount. Existing orders retain their original amount.

- The account export release passed 131 tests, including user/session isolation, pagination, expiry, credential redaction and deployment checks. Customers can now prepare a private JSON download in Account & security after re-entering their password. Short-lived, hashed, session-bound authorizations allow paginated reads of profile, linked projects/reports/conversations/actions/payment summaries and active saved checks. Owner-only work and credentials are excluded. Account deletion and general retention remain unimplemented pending policy decisions.

- The customer report reader now formats plain-text headings without interpreting HTML. It supports A4/Letter printing through a report-only print copy, with wrapping, heading break protection and supported-browser page counters. PDF pagination was checked with isolated browser-rendered fixtures in a paged-media engine; the OS/browser Save as PDF dialog is still user-controlled. See backend/REPORT_PRINT_QA.md.

- Signed-in customers can now open account-scoped support requests without an order, with six topics and customer-visible conversations. The owner has a separate Support inbox, real unread counts and version-protected conversation statuses. Requests do not execute refunds/deletion. Support messages are included in account-data downloads. The support release passed 142 tests; see backend/SUPPORT.md.

## Prepared for owner review

`policy-review.html` links draft service terms, a privacy notice and the owner-approved cancellation/refund approach. They are visibly marked not yet effective, carry noindex/nofollow and are not in the sitemap or public navigation/footer. The policy set is not yet effective and does not change checkout acknowledgements or existing project terms.

Before these become customer policies, confirm:

1. Refund approach approved by the owner: full refund before work starts; refund of unperformed work after starting; correction first, followed by partial/full refund review for unresolved delivery issues. A dated customer-visible scope/start update and In progress status document the work stage. No automatic refund calculation or financial action was added.
2. Highlink LLC is confirmed by the owner as the operator of Zikap. The owner confirmed registration in Texas, United States. A business contact address and public support/privacy/refund contact remain to be provided; no address, governing law or email is assumed.
3. Retention principles are owner-approved: necessity-based account/project retention, manual review of privacy/deletion requests and separate assessment of necessary payment/accounting/dispute records. No fixed blanket period or general automated deletion is introduced. Operational capability and actual contact readiness still need review before the full policy set becomes effective.

## Activation dependencies deferred by the owner

- Custom domain and business email.
- Email sender/provider verification after the domain is ready; see backend/EMAIL_SETUP.md.
- Keep the AI activation flag disabled before any move to Workers Paid. The owner confirmed Free; this remains an owner assertion, not automatic billing-plan verification. See backend/AI_SETUP.md.
- Observation of a genuine customer purchase and matching live webhook. Deployment readiness alone does not certify provider permissions, merchant eligibility or successful live processing.

## Later implementation priorities

- Public contact for visitors unable to sign in, account-deletion operations and defined retention controls.
- Search Console connection, live keyword/rank data, CMS publishing and subscriptions only after their scope, permissions, costs and customer terms are explicitly defined.

No new production accounts, project messages, payments, refunds or emails should be generated merely to demonstrate these features without the owner’s specific authorization. Recovery codes and payment-linked record protections remain in place.

## Owner AI operations completed

System settings includes real UTC aggregate usage, remaining application attempts and a persistent version-protected pause/resume control. Pausing blocks new reservations without deleting prior results; resuming still requires primary-service free-plan/binding/schema readiness. A deployment preserves the saved pause. UI checked at desktop and mobile sizes with labeled isolated fixtures; 148 backend tests passed. Actual model generation/quality still needs a signed-in customer check. No production demonstration records were created.

## Customer AI guidance completed

Customer availability now distinguishes personal/shared quota exhaustion, owner pause and unavailable status, with a manual availability refresh and explicit reasons for disabled generation. Sharing consent resets when switching saved checks. Cached suggestions remain readable/downloadable while new generation is paused. Verified with isolated customer UI fixtures; no new live inference was performed.

## Source findings downloads completed

Customers can download a selected saved check as plain text, including source evidence, sampled/unchecked pages, scope, limitations and expiry. This uses no AI quota and remains available with AI paused. Three formatter tests and a real isolated browser download passed; mobile layout was checked. No server-side reports, orders or live customer records were created by this release.

## Confirmed policy operator

The owner confirmed Highlink LLC as the company operating Zikap and authorized naming it in the policies. The three draft policies and their review overview now state this relationship. Branding, header and footer remain unchanged. These pages stay noindex/nofollow and not yet effective: registered business details, public contact, retention decisions and refund approval are still outstanding.

The owner subsequently confirmed Highlink LLC is registered in Texas, United States. The policy operator statements now include that registration location. This does not assert a physical operating address, adopt Texas governing law or make the policy drafts effective.

## Refund principles approved

The owner approved the researched staged refund proposal on November 7, 2026. The refund draft and service terms now describe full refunds before paid work begins, refunding the unperformed portion after starting with an explained calculation, and correcting scope-related delivery issues before reviewing a partial/full refund if unresolved. Mandatory rights are preserved. Existing customer-visible project updates/status support a manual dated work-start process; no immutable start timestamp, new enforcement mechanism, payment action or automated refund was introduced. Public contact, remaining business information and retention decisions are still pending, so all four review pages remain noindex/nofollow drafts outside public navigation/sitemap.

## Planned policy mailboxes

At the owner’s request, the drafts now name support@zikap.site for support/refunds and privacy@zikap.site for privacy requests. Both are explicitly pending creation and verification, with no mailto links or public navigation/footer placement. No domain purchase, mailbox creation, mail forwarding, sender verification, email-provider activation or delivery test is claimed. The existing signed-in Help & support route remains available. The full policy set remains not yet effective until working contacts and the other outstanding details are completed.

At the owner’s subsequent explicit request, visible mailbox-activation warnings were removed from the draft policy pages. They now show the email addresses without activation labels. This is a presentation change only: mailbox creation, domain ownership, email delivery and sender configuration have not been verified or activated.

## Public address preference

The owner chose to omit a public street address. The draft policy pages retain Highlink LLC, Texas, United States and the selected support/privacy addresses, and no longer list supplying a street address as a policy-preparation task. No physical operating location or governing law is inferred from the Texas registration. This preference does not certify jurisdiction-wide legal compliance. Retention/data-request decisions and actual mailbox readiness remain outstanding internally.

## Retention principles approved

The owner approved necessity-based account/project retention, the existing seven-day customer-access expiry for saved checks, manual privacy/deletion request review and separate assessment of necessary financial records. The privacy draft now describes those principles, verified-request handling, explanations for retained records and the limits of current operations. No account-deletion control, automatic purge, new legal deadline or production data deletion was added. The full policy set remains in draft for operational review, with domain/mailbox readiness still unverified internally.

## Work-start notice guard completed

The owner editor and order API now require a fresh customer-visible scope/start note when moving an order to In progress. Server timestamps and the existing status/update fields continue to date and display the saved notice. Empty/reused transition notes fail without updating the order, and a conditional database write protects against a concurrent note change. This does not add an immutable first-start ledger or automatic refund processing. The release passed 154 backend tests and isolated real-editor browser checks; no production orders were modified for demonstration. See backend/WORK_START_QA.md.

## Delivery placeholder protection completed

The server now rejects Delivered updates containing a blank report or the built-in `[ADD ...]` template markers, matching the existing owner-editor rule. Rejected updates preserve the prior status/report/note/history version; non-delivered drafts can still contain templates. Both owner API routes are covered. The release passed 156 backend tests and made no demonstration changes to production orders. This does not certify report quality or automatically deliver work.

## Customer project activity — November 7, 2026

Added customer-owned, read-only recent saved states with status/date/version metadata only; current state plus up to 20 retained historical states. Explicit load/refresh, session/view guards and graceful history-unavailable handling. This is not a full work ledger or proof of work start. See backend/CUSTOMER_ACTIVITY.md. Domain/email setup remains deferred at the owner's request.

## Customer report sections — November 7, 2026

Long specialist reports now offer a heading-based section selector and explicit Go to section control, with keyboard focus and sticky-toolbar clearance. Short unstructured reports retain their plain reading view. Report text downloads remain unchanged. Three existing layout tests and isolated desktop/mobile UI checks passed; see backend/REPORT_PRINT_QA.md. Domain/email work remains deferred.

## Customer starting guide — November 7, 2026

The empty customer Overview now guides visitors through limited website review, free planning tools and optional paid specialist requests. Existing receipts and account support have direct links. It appears only after a successful empty project load and is hidden for existing projects or a failed initial load. The request form's obsolete crawler statement was corrected. Syntax and isolated desktop/mobile navigation/state checks passed; see backend/CUSTOMER_START_GUIDE.md. Domain/email setup stays deferred.

## Saved service-name search — November 7, 2026

Customer project and report searches now include each order's saved packageTitle as displayed, plus the package ID and existing legacy label. This fixes renamed catalog services appearing in cards but not matching their displayed name. The report search label now explicitly mentions packages; account.js is referenced as v4. Search remains local to loaded linked projects, with existing status/package filters, pagination notices and report-body exclusions preserved. No new API, ranking data, background requests or production records were introduced.

Validation: account.js syntax passed. Actual customer assets were exercised with three isolated projects and two reports with renamed services. Mixed-case saved-title project search returned one correct card; legacy-title search still returned one; a conflicting status filter returned zero in Board view. Saved-title report search returned one correct report, a conflicting package filter returned zero, and text present only in the report body returned zero. Clearing filters restored the report set. The same saved-title search passed in a 390px iframe with body client/scroll widths both 375px. No backend behavior changed, so the backend test suite was not rerun for this bounded client fix.

## Request form protection and session cleanup — November 7, 2026

Added visible in-page request draft state, confirmed Clear form and unsent-request sign-out warnings. Submissions lock input controls, retain failed request details/retry identity, and ignore responses from a cleared account session. Sign-out/expiry clears request and receipt forms; asynchronous receipt-file reads are scoped to the active account/selection. There is no persistent browser draft storage or automatic project submission. Syntax, ten account/journey tests and isolated desktop/mobile flow checks passed. See backend/REQUEST_DRAFT_QA.md for exact checks and native page-leave/file-read verification limits. Domain/email remains deferred.

## Customer Payments workspace — November 7, 2026

Customers now have a dedicated Payments view for their own saved per-project payment/refund records, with explicit test/live labels, saved amounts, read-only status, pagination, local search and mode filtering. Unavailable data is distinguished from no records; previous results survive refresh failures and cleared sessions reject late responses. No provider financial action, recurring billing or tax invoice is introduced. All 159 backend tests and isolated desktop/mobile checks passed; see backend/CUSTOMER_PAYMENTS.md. Domain/email, final policy publication/operational review and observation of a genuine customer purchase remain outstanding.

## Public package comparison and catalog fallback — November 8, 2026

Pricing now offers an accessible side-by-side comparison of the existing four starter scopes, with current catalog names/prices and links to the matching cards. Shared catalog validation rejects incomplete/duplicate IDs before updating any price; failed summaries no longer remain Loading. The keyword FAQ uses the service name instead of a price, and repeated wording was corrected. Ten public catalog script references were versioned. Three catalog regression tests and the 15-page public checker passed; isolated desktop/mobile checks covered loaded prices, incomplete/unavailable data, card navigation and horizontal table scrolling. See PACKAGE_COMPARISON_QA.md. Prices, scopes, original logo and payment behavior remain unchanged.

## Request preparation validation — November 8, 2026

The customer request checklist now validates actual page limits, complete URLs, exact website origin and required trimmed text, with associated inline errors and a supplied-page counter. Invalid/incomplete catalog data cannot produce an accepted client quote; older reload responses are ignored. Four new parity/catalog tests and ten account tests passed, along with syntax and isolated desktop/mobile checks. Server validation, prices, package scope and submission behavior remain unchanged. See backend/REQUEST_VALIDATION_QA.md.

## Account recovery file reader — November 8, 2026

The recovery form can locally open the existing account recovery text file and fill the email plus masked code, without uploading it or submitting recovery automatically. Parser limits, format checks and delayed-read/manual-edit guards protect the flow; auth forms now also lock during a request and ignore results after account cleanup. Four reader tests and ten account tests passed; isolated native file-chooser and mobile checks passed. No real credentials, sessions or accounts were changed for verification. See backend/RECOVERY_FILE_QA.md. Email/domain setup stays deferred.

## Customer overview next steps — November 8, 2026

Overview now highlights real unread project messages, accepted pending/unpaid checkout review and delivered reports, with one prioritized suggestion per loaded project and a six-card limit. Paid/refunded projects receive no repayment prompt. Loading/error states disable stale panel actions; initial unavailable summary figures are unknown rather than zero. Empty accounts retain the starting guide, and session cleanup clears suggestions. Three new suggestion tests plus eight adjacent frontend regressions passed (11 total), with isolated navigation, outage/recovery, empty/paginated, mobile and session-cleanup checks. No new provider/AI call or financial operation was introduced. See backend/NEXT_STEPS_QA.md.

## Customer My account area — November 8, 2026

At the owner's request, the top-right customer name/initial display is replaced by a visible My account link. Actual name/email and existing personal functions now live in an organized Personal details / Security / Your data area, with Sign out inside the page. Keyboard tab controls, mobile layout, old security links and profile cleanup were checked using actual assets with isolated fixtures; syntax/duplicate-ID checks passed. No backend or authentication rules changed. See backend/MY_ACCOUNT_QA.md.

## Expanded My account options — November 8, 2026

My account now offers ten functional shortcuts and a real saved-name editor with the recorded account creation date. Authenticated profile reads expose only name/email/date; same-origin, rate-limited name updates reject stale/invalid edits and preserve older project snapshots. Existing personal-data exports already include the current profile. All 177 tests passed, with isolated save/conflict/refresh, shortcut, draft, expiry and mobile checks. Real profile verification remains read-only. See backend/ACCOUNT_OPTIONS_QA.md.

## Contextual support shortcuts — November 8, 2026

My account/Your data privacy links and Payments payment/refund help now open the existing support composer with the corresponding topic. Existing drafts are preserved, pending submissions are protected and navigation sends no message or financial action. Shared customer/owner sources remain identical and versioned. Syntax and isolated desktop/mobile topic, draft-preservation and zero-write checks passed; see backend/SUPPORT_SHORTCUTS_QA.md.

## Prepared export lifecycle — November 8, 2026

Your data now shows actual prepared-file size, a Clear prepared file control and a ten-minute local link lifetime with click-time expiry checks. Session/page cleanup and run-scoped timeout guards prevent stale links or cancelled work from restoring a file. Four new controller tests and an isolated native JSON download/clear/mobile check passed. Saved device files and backend records are unchanged. Ready-file screenshots use labeled synthetic fixtures; production verification remains read-only. See backend/EXPORT_LIFECYCLE_QA.md.

## Section-specific workspace refresh — November 8, 2026

Header Refresh now reads the active profile, session dates, payment records, support list or project list, with a matching accessible label and contextual header text. It is hidden where explicit form/local/AI/export controls apply. In-flight/epoch guards and current-view rendering prevent late project responses from overwriting another view's header. Syntax and isolated endpoint-counter, draft-preservation, hidden-control, late-response and mobile checks passed with zero writes. See backend/CONTEXT_REFRESH_QA.md.

## Service, privacy and refund text review — November 8, 2026

At the owner's request to start remaining-work item 2, the three policy texts and overview were aligned with current packages, My account, profile/session/recovery controls, prepared-export lifetimes and support/payment routes. Approved refund/retention principles remain intact. Conditional privacy-request reconsideration and clearer Stripe refund handling were checked against primary official sources. A contents menu, scope/customer-route tables and print styling were added. Public 15-page checks, four draft-document checks and desktop/mobile review passed. The policy set remains noindex review drafts, without a new effective date or public adoption: verified contact handling and final operational/applicability review remain outstanding. See backend/POLICY_CONTENT_REVIEW_2026-11-08.md.
