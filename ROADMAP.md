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

`policy-review.html` links draft service terms, a privacy notice and the owner-approved cancellation/refund approach. They are visibly marked not yet effective, carry noindex/nofollow and are not in the sitemap or public navigation/footer. The policy set is not yet effective and does not change checkout acknowledgements or existing project terms.

Before these become customer policies, confirm:

1. Refund approach approved by the owner: full refund before work starts; refund of unperformed work after starting; correction first, followed by partial/full refund review for unresolved delivery issues. A dated customer-visible scope/start update and In progress status document the work stage. No automatic refund calculation or financial action was added.
2. Highlink LLC is confirmed by the owner as the operator of Zikap. The owner confirmed registration in Texas, United States. A business contact address and public support/privacy/refund contact remain to be provided; no address, governing law or email is assumed.
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
