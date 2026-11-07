# Public site QA — 7 November 2026

Added page-specific Open Graph/Twitter metadata to all 15 indexable pages, a shared 1200 × 630 PNG card with the unchanged original logo, WebPage/WebSite and visible-path BreadcrumbList structured data, and a sitemap discovery link. No ratings, review counts, legal identity or pricing claims were added to structured data.

Added a branded noindex,follow 404 with project-root asset/navigation paths, no automatic redirect, and useful home/services/check/account/FAQ destinations. It does not echo the missing URL or its query. Support requires a signed-in account; public recovery contact remains a separate pending item.

Run `python scripts/check-public-site.py` from the repository. The stdlib checker validates sitemap coverage, canonicals, metadata, JSON-LD, local file/fragment links, unique IDs/H1, PNG dimensions and nested-safe 404 references. Result: PASS, 15 indexable pages. Reviewed mobile recovery layout at a 390 px iframe (375 px content area, no horizontal overflow), expanded mobile navigation, and desktop recovery layout in the managed browser preview.

No PageSpeed/Core Web Vitals measurements, Google indexing confirmation, rich-result eligibility, or social-platform cache refresh are claimed. A robots.txt in /Zikap/ would not control the GitHub Pages host root, so root robots configuration remains deferred until appropriate hosting/domain ownership. Existing owner/policy drafts remain noindex and outside the sitemap. Backend behavior and pricing are unchanged.
