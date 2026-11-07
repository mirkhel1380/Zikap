# Zikap remaining work

Reviewed November 7, 2026 against repository main. English UI, original logo, GitHub Pages public site and separate Cloudflare customer/admin applications remain the product structure.

## Completed and verified

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

`policy-review.html` links draft service terms, a privacy notice and cancellation/refund proposals. They are visibly marked not yet effective, carry noindex/nofollow and are not in the sitemap or public navigation/footer. They do not change checkout acknowledgements or create a new refund entitlement.

Before these become customer policies, confirm:

1. The refund approach: the draft proposes a full refund before agreed work starts and review against work completed after it starts. This is not yet approved.
2. The actual service operator and a public support/privacy/refund contact. Do not assume a legal entity or invent an email address.
3. Retention periods for account/project/payment information and necessary exceptions. The current code has no general automatic deletion period.

## Activation dependencies deferred by the owner

- Custom domain and business email.
- Email sender/provider verification after the domain is ready; see backend/EMAIL_SETUP.md.
- Keep the AI activation flag disabled before any move to Workers Paid. The owner confirmed Free; this remains an owner assertion, not automatic billing-plan verification. See backend/AI_SETUP.md.
- Observation of a genuine customer purchase and matching live webhook. Deployment readiness alone does not certify provider permissions, merchant eligibility or successful live processing.

## Later implementation priorities

- Public contact for visitors unable to sign in, account-deletion operations and defined retention controls.
- Search Console connection, live keyword/rank data, CMS publishing and subscriptions only after their scope, permissions, costs and customer terms are explicitly defined.

No new production accounts, project messages, payments, refunds or emails should be generated merely to demonstrate these features without the owner’s specific authorization. Recovery codes and payment-linked record protections remain in place.
