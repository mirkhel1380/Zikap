# Starter package comparison and catalog fallback

The pricing page now compares the four existing starter scopes side by side: technical source review, curated keyword ideas, keyword-to-page mapping, proposed on-page edits, deliverables, website/language limits, clarification rounds and exclusions. Names and one-time USD prices use the existing public catalog. Prices, service IDs and fulfillment limits were not changed. Compare packages opens the table, and View package opens the matching existing card. Table caption, column/row headers, a labeled focusable scroll region and horizontal overflow support smaller screens.

The shared catalog client validates all four unique service IDs before updating any price/title/summary. Missing, duplicated, blank or out-of-range data fails as unavailable. Catalog failure now clears summary loading placeholders and provides a readable status instead of leaving Loading text indefinitely. Ten catalog-enabled public pages reference client v2. The keyword FAQ now uses the service title rather than inserting a price into the package name, and duplicated Yes wording was removed.

Validation on November 8, 2026:

- Three regression tests passed: repeated card/comparison price updates from one read; full validation before updates for invalid catalogs; network failure and pages without catalog targets.
- Public checker passed all 15 indexable pages, sitemap coverage, metadata/structured data, local assets/anchors, sharing-image dimensions and nested-safe 404 links.
- Actual public assets were checked with an isolated catalog. All four prices loaded consistently; the keyword View package link opened its matching card. Unavailable and duplicated-ID fixtures rendered all eight prices as unavailable and all four summaries as fallback text.
- At 390px iframe width, the page body client/scroll widths both measured 375px. The table width was 920px within a 299px scroll region; a native horizontal scroll moved 341px without widening the page. Keyboard arrow scrolling was not independently verified in this browser.

No project, payment, refund, message or AI request was created for these checks. Research reference for presentation: https://aioseo.com/pricing/ ; Zikap table content follows its own existing scopes.
