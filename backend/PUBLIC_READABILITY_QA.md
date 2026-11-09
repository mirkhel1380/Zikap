# Public page readability — November 9, 2026

## Changes

A shared, versioned readability stylesheet pairs text with the current light and navy surfaces. The Technical action register sample cover now uses dark headings and labels on its light gradient. Sample-cover labels have modestly larger text. Muted descriptions, breadcrumbs, price labels, report annotations, policy text and helper captions use stronger contrast. Navy package descriptions and calendar/report-preview captions retain light text.

The stylesheet is linked after the existing theme on public pages and their retained policy archives. Customer/admin application styles, service content, pricing, payment behavior and the logo are unchanged.

## Browser checks

Actual HTML, CSS and component markup were served in an isolated preview. The catalog read was replaced with the saved four-package catalog fixture; no real orders, accounts, payments, messages or AI calls were created.

Rendered text was examined across 20 public pages at desktop width and in a 375px iframe (360px content width with a scrollbar): index, about, services, technical-seo, keyword-research, on-page-seo, reports, pricing, how-it-works, faq, workspace, tools, content-strategy, content-planner, website-check, terms, privacy, refunds, policies and 404.

The check uses computed foreground colors, nearest opaque backgrounds and opaque CSS gradient stops, with a 4.5:1 target for ordinary text and 3:1 for large text. It excludes hidden, decorative and disabled text. The initial scan flagged 189 unique element/color combinations across those pages. After correction the desktop and mobile scans returned zero candidates below the selected targets. The original sample-card heading had about 1.06:1 contrast against its light gradient; it now uses navy text.

## Limits

This is a targeted readability check, not a complete accessibility certification. It covers the rendered public-page text, not every hover/focus state, generated result, authenticated dashboard, image or animation frame. Transparent layering and pseudo-element backgrounds require visual judgment; computed results were reviewed alongside the reported sample cover. Retained archives use the shared fix but were not counted among the 20 audited current public pages.
