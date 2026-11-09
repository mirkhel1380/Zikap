# Customer policy publication checks

November 9, 2026, version 2026-11-09.

Prepared customer-facing service terms, privacy notice, cancellation/refund policy and a policy hub. The existing navy/blue design and original four-petal logo are preserved. Public footers link the three policies; account registration/request/footer and project payment review surface the relevant links. Account links use a new tab and noopener so reading does not replace an in-memory form. Former drafts remain noindex archives and identify their published replacements.

## Validation

- `python scripts/check-public-site.py`: passed all 15 indexable marketing pages, sitemap, structured data, every root-page local link/anchor and nested-safe 404. Policy documents use noindex,follow and canonical URLs and are deliberately absent from the marketing sitemap.
- Four current policy documents passed version/date/operator identity, description/canonical, current-status and arrow-glyph checks. Eight account HTML policy links passed target/rel checks. Original logo SHA-256 unchanged.
- Account JavaScript syntax check passed; payment behavior is unchanged apart from the explanatory policy link.
- Isolated desktop: policy hub, terms, privacy and refund navigation worked; version/Highlink LLC identity and preserved full-before-work refund text were visible.
- Isolated mobile: terms body client/scroll widths 360/360 px in a 375 px iframe; package table scrolls within 268 px with 570 px content.
- Isolated account: request links and non-submitting explanatory text were visible. No real account/request/payment/refund or email was created for QA.

See POLICY_OPERATIONS.md for owner handling, provider/source review, the distinction between publication and versioned acceptance evidence, and deferred external contact verification. This release does not modify Stripe Dashboard configuration or activate email.

## Final publication authorization — November 9, 2026

The owner explicitly requested continuing the remaining work and then affirmed “سیس خی پیش ببر” in direct reply to the request to authorize publishing the prepared policies and footer/account links on the main site. The prepared set is finalized as version 2026-11-09, effective November 9, 2026 (Asia/Kabul). Finalization removes the non-effective banners from the four current pages; earlier draft URLs remain archives. Existing project agreements remain preserved.

Main and PR #1 were re-read before finalization: main da2cd70f2233c17c0fff64221ba29ad29829130d, review head d2daedcc7f972fb5bb96acb5001b1d80a67660e7, mergeable true. The PR is updated before any merge; merge must use its exact final head. Latest pricing-overflow, delivery-kit and readiness changes remain intact. Domain/mailbox setup, verification and Stripe Dashboard settings are not part of this publication.
