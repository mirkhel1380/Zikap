# Zikap

A responsive English (LTR) SEO services website and browser-local HTML checker. No build system or external dependencies.

## Publish on GitHub Pages

Open repository **Settings → Pages → Build and deployment**. Select **Deploy from a branch**, branch **main**, folder **/ (root)**, then **Save**. GitHub will display the published URL after deployment. Expected path: `https://mirkhel1380.github.io/Zikap/` (not verified until Pages is enabled).

## Local preview

Run `python3 -m http.server 8000` in this directory and open http://localhost:8000.

## Features and limits

- English service pages, responsive layout, FAQ and service selection.
- HTML upload/paste and 10 transparent heuristic checks. Reports download as text.
- HTML is parsed in an inert template, never inserted into the live page. No remote website fetching or third-party proxy.
- Scores are internal check completion percentages, not Google scores or ranking predictions. No speed, backlink, indexing or keyword rank data.
- Project form downloads a brief locally. It does **not** submit an inquiry. Connect a real backend and verified contact channel before accepting customer orders.
- No payment, login, analytics, fabricated testimonials, or fake customer statistics.

## Future live audits

GitHub Pages serves static files. URL-based audits need a separately hosted API with input validation, SSRF protection, rate limiting and timeouts. Never put API secrets in these public files. Backlinks and rank tracking require a suitable data provider.

## Files

- `index.html`: layout and styles
- `app.js`: local analysis and downloads
- `.nojekyll`: static Pages deployment
