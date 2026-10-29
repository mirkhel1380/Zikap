# Zikap

English SEO services website with an original SVG identity and a browser-local HTML checker. Static HTML/CSS/JavaScript; no build dependencies.

## Pages

- index.html: home and downloadable project brief
- services.html: service overview
- technical-seo.html, keyword-research.html, on-page-seo.html: detailed service guides
- tools.html: working local HTML checker
- how-it-works.html: project process
- faq.html: questions and limitations

Shared styling: styles.css. Original vector logo: assets/zikap-logo.svg; icon: assets/logo-mark.svg. Sitemap uses the current GitHub Pages origin; update canonical URLs and sitemap when a custom domain is connected.

## Publishing

GitHub Pages deploys main / (root). All internal paths are relative and support the /Zikap/ project path. No external fonts, runtime packages, or third-party proxies.

## Functionality

Paste/upload HTML (up to 2 MB), run 10 heuristic checks, and download a text report. HTML stays in an inert template and is not inserted into the live page. Scores are not Google scores. No live URL fetch, crawl, indexing check, keyword-volume API, speed measurements, or backlink database is connected.

The project brief downloads locally; no inquiry is submitted and no payment is taken. Scoped service descriptions are not claims of automated features or guaranteed outcomes.

## Editorial research

Content is independently written. Further reading is linked on relevant pages:
- Google Search Central SEO Starter Guide
- Moz on-page SEO and keyword research guides
- Ahrefs keyword research guide and Site Audit overview
- Semrush on-page SEO overview

No affiliation or endorsement is implied. The example report and scenarios are labeled illustrative.

## Header and animated hero

Shared two-level header and service mega menu on all pages. site.js handles Escape/outside click, current page links, and hero controls. CSS 3D dashboard uses transform-based floating panels and animated SVG/chart elements. Motion is illustrative, can be paused, respects prefers-reduced-motion, and pauses when offscreen. Pointer tilt runs only for a fine pointer. No external animation dependencies.

## Sample library and About page

reports.html includes three explicitly fictional previews and downloadable plain-text examples in samples/. No live audit or customer results are represented. about.html explains the service approach without inventing a team, client history, or credentials. Shared navigation and footer link to both pages. Sitemap updated to 10 pages.
