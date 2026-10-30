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

The home-page project brief downloads locally; the separate workspace form submits project requests to the API. No payment is taken. Scoped service descriptions are not claims of automated features or guaranteed outcomes.

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

## Customer workspace

`workspace.html` contains the free HTML report and older private-receipt tracking. New package requests go to the customer account at `https://zikap.m-mirkhel20.workers.dev/account/`. Account projects, reports and revisions are managed there. `owner.html` remains the separate owner delivery desk with server-side bearer authentication.

The companion API source, D1 schema and integration tests are in `backend/`. The API address is configured as `https://zikap.m-mirkhel20.workers.dev`. The deployed `/health` check now returns `ready:true`; the runtime secret, database binding, and both tables are available. The public workspace enables project submission and tracking. Production test requests have been stored and retrieved successfully with their private receipts. The owner has confirmed saving a test report through the delivery desk. Customer-side retrieval of that delivered production report and the production revision flow remain unverified; see `backend/README.md`. Stripe checkout is implemented but requires merchant secrets and a merchant-operated test before activation; live URL audits are not implemented; the instant checker uses HTML supplied by the customer.

## Free tools

`tools.html` includes the free HTML checker, live search snippet editor with title/meta tag text export, and a keyword-list cleaner with CSV export. The keyword organizer uses customer input and simple English intent rules only; it does not query a keyword database or generate search-volume/difficulty figures. Specialist-package pricing covers human review and tailored deliverables. The shared header background matches the footer (#e9efdf).

## Content planning

The free `content-planner.html` schedules 4/8/12 user-provided topics across 30 days, provides editable briefs and manual workflow statuses, and exports CSV/text. No account, AI generation, live research, auto-publishing, analytics connection, or backend is required. Plans remain in memory until the customer explicitly saves a snapshot in this browser or downloads an editable JSON backup. Restore and file import validate and reconstruct a whitelisted plan shape; imports never execute markup or code. CSV and text remain available. `content-strategy.html` explains research, evidence, review, AI-search basics, manual publishing and current service scope.

The legacy workspace supports saved receipt import. Account request retries use a stable client request ID. The backend prevents duplicate creation when a client retries the same request ID/key, and owner pagination handles tied timestamps. These server features have been tested locally; the production API has passed readiness and the public form is enabled. Production request creation and private receipt lookup were verified on 2026-10-30. The full production delivery/revision lifecycle remains incomplete.

## Earlier private receipts

Earlier requests can still be tracked with the original saved receipt, or attached once to a customer account by proving possession of that private key. No order is attached by email alone. New account requests do not require customers to manage receipt keys. The legacy guest API remains compatible with earlier clients.

## Owner delivery workflow

The delivery desk summarizes loaded requests and supports local search/status filtering; the counts are not advertised as all-time totals. Each supported package has an explicit scope and a session-only review checklist. A drafting button inserts a package-specific report outline only into an empty report, with no invented findings. Delivery from this interface requires a nonempty report without `[ADD ...]` placeholders. The owner can preview the customer-visible update as escaped plain text and download an unsaved report draft. Imports enforce size/character limits and report read failures. Revision requests retain their visible current status and require the owner to choose a next state rather than silently changing it on save. Locking clears drafts and authentication from memory, and late list responses cannot reopen a locked desk. Server-side authentication remains required for all order reads and writes. These UI changes are tested with isolated fictional records; they do not complete the outstanding production report/revision lifecycle test.

## Customer account dashboard

The Worker serves the account app from its `ACCOUNT_ASSETS` binding alongside the API. The marketing website stays on GitHub Pages. A first-party Secure/HttpOnly session cookie avoids third-party-cookie dependencies. Customers can register, sign in/out, request/list/read projects, download reports, ask for one scoped revision, link an earlier private receipt, change a password and manage a private recovery code. Free tools remain available without an account. Passwords and session keys are not stored in browser storage. Email verification and recovery emails are not connected; recovery uses a one-time private code that customers must save.

The remote additive account schema and `/health` flag `customerAccounts:true` were verified on 2026-10-30. Nineteen server/deployment tests pass. Local browser QA with the real Worker handler and temporary SQLite data verified account project creation, owner report delivery, report download, revision, persistence across reload and mobile layout. Production signup/login with a real customer identity has not been performed by the agent. No real customer password was collected. See `backend/ACCOUNT_SECURITY.md` for session and authorization details, hashing cost and current limitations. Stripe checkout code is implemented but remains inactive without merchant configuration. Automated SEO fulfillment remains unimplemented.

## Stripe checkout

Accepted account projects can use one-time Stripe-hosted card checkout after the merchant configures STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET. Until then, no checkout is enabled. Server-controlled amounts, ownership checks, persisted idempotency, webhook signature verification, payment-status reconciliation, test/live labels and monotonic refund updates are implemented. Payment and specialist fulfillment remain separate. Financially linked orders are retained. The owner desk shows Stripe status and can reload saved requests. Thirty-two automated checks pass; browser UI verification used isolated fictional Stripe responses. No merchant test/live charge has been performed. Follow backend/STRIPE_SETUP.md; never paste secret values in chat or commit them.

## Customer project navigation

The customer dashboard filters loaded projects by website, package, topic or order ID and by current status or report availability. Counts remain explicitly limited to loaded records. Each card and detail view explains the next step using the current project state; no historical milestones or delivery dates are invented. Customers can refresh or close a selected project and download a plain-text request summary, clearly distinguished from a payment receipt. The detail request sequence prevents an older response from replacing a more recently selected or closed project. Browser checks use isolated fictional projects; no new production orders or payments were created.

## Workspace interface and search CSV explorer

The account now uses a responsive sidebar layout with distinct overview, projects, report library, search performance, new request, SEO tools, receipt linking and account security views. Overview cards, recent projects, the current update feed and the report availability donut are derived from loaded real account records. Empty accounts show a start-project state. Global refresh and project-level refresh are separate controls. Package intake includes a live preparation checklist; it is not a site audit. The original authentication and project API are preserved.

`backend/account-static/account/search-data.mjs` validates single-period English Search Console Queries/Pages CSV files locally; `search-performance.mjs` provides import, row summaries, filtering, sorting and formula-safe CSV export. No Google account or live analytics is connected. Imported data is in memory only and clears on reload/sign-out. Thirty-eight automated checks pass, including six CSV parsing/calculation/export checks. Browser QA verifies workspace routes, reports, request preparation, imported metrics and mobile navigation with fictional records. See `PLATFORM_RESEARCH.md` for source research, implemented patterns and integration gaps.

## Saved project action plans

Each customer project includes a manual SEO action plan. Customers can add/edit a task title, same-website page URL, notes, priority and status; mark work done/reopen it; archive/restore tasks; search/filter the list; and download a plain-text plan. The Worker stores up to 100 tasks per order, including archived tasks. Tasks are protected by the existing first-party account session and order ownership. Creation retries reuse a request ID, and version checks prevent stale edits from overwriting newer changes. These actions do not perform website edits, verify fixes, change the specialist's order status or trigger payments. No AI findings are generated.

Migration `0004_project_actions.sql` is additive and is applied by the existing deployment helper before the Worker changes. `/account-api/status` reports `actionPlans:true` when the schema is available. Forty-five automated checks pass. Local browser QA with the real Worker and isolated SQLite verified create, edit, done, archive/restore, persistence across reload, a second browser view, download and a 375px content viewport. No production customer, task, order, charge or refund was created during testing.

## Project conversations

Account customers can open messages within a project and exchange plain-text questions/replies with the owner. The delivery desk has a per-project Project messages panel that loads on demand. The shared `project-thread.js` / `project-thread.css` UI is copied into the Worker account assets; both copies must remain identical. Conversations refresh manually, paginate earlier messages, preserve stable message references on retries, and export only loaded messages as text. Messages are append-only through these interfaces, limited to 4,000 characters each and 200 records per project. Sender roles are assigned by the server. Messages do not change fulfillment status or consume the formal revision. No email, push notifications or attachments are connected.

Migration `0005_project_messages.sql` is additive and is applied before deployment. The account readiness endpoint reports `projectMessages`. Fifty-one automated checks pass. Local real-Worker/SQLite browser QA verified a fictional customer question, owner reply, customer retrieval, export and a 375px mobile content viewport. The owner conversation widget was tested through a local QA-only server-auth adapter, not a real merchant/admin login. No real customer message, email, order or payment was sent during testing.
