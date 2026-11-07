# Zikap remaining work

Reviewed November 7, 2026 against repository main. English UI, original logo, GitHub Pages public site and separate Cloudflare customer/admin applications remain the product structure.

## Completed and verified

- Customer and owner dashboards share the navy/blue workspace design. Real project lists have List/Board layouts, private report delivery, messages, action plans and version-protected owner editing/history.
- Public inner pages match the home-page design. The home header and mobile menu expose the customer AI website review workspace.
- Source-HTML checks sample up to three permitted public pages, show evidence/limitations and recommend optional manual services only when findings support them.
- One-time server-priced USD packages remain audit $29, keywords $19, on-page $39 and bundle $79. No recurring billing or $1 trial has been introduced.
- A complete isolated customer/admin/payment/message/report/revision regression passed. The latest full code verification on November 2 comprised 121 passing tests. A subsequent stuck-attempt handling fix passed its targeted AI tests.
- Stripe live configuration and the payment schema were observed ready in the November 2 deployment review. The merchant previously reported successful sandbox checkout, webhook replay and refund checks. No genuine live purchase has been independently observed; do not use an artificial live purchase for testing.
- Durable transactional email notifications and four templates are deployed. Sending was last observed off, pending the owner’s domain, verified sender, provider key and approved delivery check.
- Private saved website checks and limited AI explanations are deployed. AI was last observed off with its binding/schema ready, awaiting explicit confirmation of Workers Free. Limits are two attempts per customer per UTC day and twenty shared attempts. No production inference was performed during release.

- Owner-only project review checklists and internal notes now persist independently in D1, with stale-write protection, private draft downloads and unsaved-edit warnings. They are excluded from customer payloads, reports, messages and order edit history.

## Prepared for owner review

`policy-review.html` links draft service terms, a privacy notice and cancellation/refund proposals. They are visibly marked not yet effective, carry noindex/nofollow and are not in the sitemap or public navigation/footer. They do not change checkout acknowledgements or create a new refund entitlement.

Before these become customer policies, confirm:

1. The refund approach: the draft proposes a full refund before agreed work starts and review against work completed after it starts. This is not yet approved.
2. The actual service operator and a public support/privacy/refund contact. Do not assume a legal entity or invent an email address.
3. Retention periods for account/project/payment information and necessary exceptions. The current code has no general automatic deletion period.

## Activation dependencies deferred by the owner

- Custom domain and business email.
- Email sender/provider verification after the domain is ready; see backend/EMAIL_SETUP.md.
- The account’s Workers Free plan confirmation before enabling AI; see backend/AI_SETUP.md. The activation flag is an owner assertion, not automatic billing-plan verification.
- Observation of a genuine customer purchase and matching live webhook. Deployment readiness alone does not certify provider permissions, merchant eligibility or successful live processing.

## Later implementation priorities

- Editable service catalog with consistent public/intake/checkout prices and unchanged historical order prices.
- Public support/privacy request handling, appropriate account-data export/deletion operations and defined retention controls.
- Genuine print/PDF export pagination verification.
- Search Console connection, live keyword/rank data, CMS publishing and subscriptions only after their scope, permissions, costs and customer terms are explicitly defined.

No new production accounts, project messages, payments, refunds or emails should be generated merely to demonstrate these features without the owner’s specific authorization. Recovery codes and payment-linked record protections remain in place.
