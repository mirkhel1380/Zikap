# Customer policy publication checks

November 8, 2026, version 2026-11-08.

Prepared customer-facing service terms, privacy notice, cancellation/refund policy and a policy hub. The existing navy/blue design and original four-petal logo are preserved. Public footers link the three policies; account registration/request/footer and project payment review surface the relevant links. Account links use a new tab and noopener so reading does not replace an in-memory form. Former drafts remain noindex archives and identify their published replacements.

## Validation

- `python scripts/check-public-site.py`: passed all 15 indexable marketing pages, sitemap, structured data, every root-page local link/anchor and nested-safe 404. Policy documents use noindex,follow and canonical URLs and are deliberately absent from the marketing sitemap.
- Four current policy documents passed version/date/operator identity, description/canonical, current-status and arrow-glyph checks. Eight account HTML policy links passed target/rel checks. Original logo SHA-256 unchanged.
- Account JavaScript syntax check passed; payment behavior is unchanged apart from the explanatory policy link.
- Isolated desktop: policy hub, terms, privacy and refund navigation worked; version/Highlink LLC identity and preserved full-before-work refund text were visible.
- Isolated mobile: terms body client/scroll widths 360/360 px in a 375 px iframe; package table scrolls within 268 px with 570 px content.
- Isolated account: request links and non-submitting explanatory text were visible. No real account/request/payment/refund or email was created for QA.

See POLICY_OPERATIONS.md for owner handling, provider/source review, the distinction between publication and versioned acceptance evidence, and deferred external contact verification. This release does not modify Stripe Dashboard configuration or activate email.

## Draft-only review

This proposal is prepared on a separate review branch from the latest main. Four consolidated pages have visible NOT EFFECTIVE banners, no active date and noindex,follow metadata. No main update, merge, production publication or contractual adoption is authorized by creating this draft PR. Domain/email verification and final adoption remain outstanding. Proposed footer/account links are reviewable code changes, not proof they are live. Historical publication attempts were rejected by automatic approval review; this draft is not an alternate publication mechanism.

The current main contains later pricing-overflow, delivery-preparation and readiness-report changes. Those changes must remain intact. No backend payment handler, authentication rule or database schema is changed by the proposal.
