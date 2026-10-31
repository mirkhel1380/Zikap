# Zikap

English SEO services website with an original SVG identity, free public website checks and browser-local SEO tools. The marketing site is static HTML/CSS/JavaScript; the separate Cloudflare Worker handles URL checks and account services.

## Pages

- index.html: home and downloadable project brief
- website-check.html: free limited public URL check and evidence-based service suggestions
- services.html: service overview
- technical-seo.html, keyword-research.html, on-page-seo.html: detailed service guides
- tools.html: working local HTML checker
- how-it-works.html: project process
- faq.html: questions and limitations

Shared styling: styles.css. Original vector logo: assets/zikap-logo.svg; icon: assets/logo-mark.svg. Sitemap uses the current GitHub Pages origin; update canonical URLs and sitemap when a custom domain is connected.

## Publishing

GitHub Pages deploys main / (root). All internal paths are relative and support the /Zikap/ project path. No external fonts, runtime packages, or third-party proxies.

## Functionality

Paste/upload HTML (up to 2 MB), run 10 heuristic checks, and download a text report. HTML stays in an inert template and is not inserted into the live page. Scores are not Google scores. This local tool does not fetch URLs. The separate public URL checker now fetches a limited sample of source HTML; neither tool checks Google indexing status, keyword volume, speed measurements or backlinks.

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

## Unread project messages

Customer project cards, the sidebar and the overview summarize unread incoming messages in loaded projects. The owner delivery desk has a matching incoming-customer-message summary, per-order notices and an unread filter. Both views update on refresh; they are not real-time push or email notifications. Counts do not claim to cover unloaded orders.

Inside a conversation, `Mark loaded messages read` explicitly acknowledges only incoming messages currently loaded. Each message has its own persisted read record for the current role, so a concurrent new arrival or an older unloaded message cannot be accidentally cleared. The UI sends bounded batches of up to 50 IDs, and the backend validates the project, role and IDs. Merely fetching a conversation does not mark it read. Read state survives reload and stays separate for customer and owner. Message bodies and timestamps remain immutable.

Migration `0006_message_reads.sql` is additive; missing tracking schema leaves existing message access working and returns unknown counts instead of false zeros. `/account-api/status` reports `messageReadTracking`. Fifty-five automated tests pass. Local real-Worker/SQLite browser QA verified customer counts 2 to 0, independent owner counts 1 to 0, a fresh reply becoming unread after reload, both unread filters and a 390px mobile viewport. The actual owner desk used a synthetic server-side QA auth adapter, never a production owner key. No production message or read status was modified during testing.


## Searchable report library and print reader

The customer report library searches loaded reports by website, topic, package name or project ID, filters by package, and sorts by project update time or website. Counts explicitly refer to loaded projects. Load older projects is available in the report view and uses the existing authenticated pagination. Report metadata labels the order's update time as Project updated, not a report delivery timestamp.

Read report opens an accessible native dialog with the saved plain-text report and project metadata. Text is rendered using textContent, including any markup-like report content; no report HTML is executed. Download text preserves the original report. Print / Save PDF invokes the browser print dialog; PDF saving depends on browser support. Print styling includes only the report document, with no workspace, messages, recovery codes or account email. Closing the reader, Escape and account clearing remove the report DOM and download handler. No new API, migration, external PDF service, tracking or browser storage is introduced.

All 55 existing automated tests pass. Static syntax, IDs/labels and deployment bundle checks passed. Browser QA was attempted twice but the browser connection timed out; responsive appearance, focus behavior and actual print/PDF output remain unverified. The temporary fixture preview was removed and never published.


Report-reader follow-up (2026-10-31): browser QA with fictional API fixtures verified search and combined package filters, empty results, sorting, older-project pagination, literal markup safety, native modal focus, Escape cleanup and the original text download. The library body fit a 375px content viewport and the reader had no horizontal overflow. The toolbar now stays visible while scrolling long reports; the print button gives explicit browser-menu fallback guidance and reports errors. Browser print was invoked, but this test browser did not expose a print/PDF dialog; actual PDF output remains unverified. No production customer data was created or changed.


## Independent administration application

`backend/admin-worker.mjs` and `backend/admin-static/` implement a separately deployed `zikap-admin` Worker. It has an owner username/password login, one-time setup authenticated by the existing owner key, private recovery-file flow, password/session management and the existing order/report/message desk. Customer credentials do not authorize admin access. The same D1 order records are accessed through a private binding to the original service; migration 0007 adds isolated admin credentials and sessions. No domain is purchased, no production admin credentials are auto-created and no Stripe secrets are copied to the second Worker. See `backend/ADMIN_SETUP.md` (or `ADMIN_SETUP.md` from backend) for setup, deployment, security boundaries and validation.


## Professional owner workspace (2026-10-31)

The separate admin app now has nine views: Overview, Orders, Customers, Reports, Messages, Payments, Services, System settings and Account & security. Overview uses authenticated database-wide counts for orders, active work, registered customers, reports, package demand and unread customer messages. Its live USD payment totals exclude test records and subtract recorded refunds; these totals are not Stripe balances, payouts or accounting statements. Empty accounts produce real zeros and unavailable summaries remain unknown.

The Orders table searches/filters loaded records and exports those records as formula-safe CSV. Opening an order fetches the current saved record through the authenticated owner API and mounts one editor/thread on demand. Unsaved edits are retained across view navigation, require confirmation before replacement/refresh, and warn before unloading. Form controls lock while saving; summary tables refresh after successful saves. The original delivery, payment retention and conversation rules remain enforced by the existing service.

Customers lists actual registered accounts with server search and stable 50-row pagination, including accounts with no projects. Customer profiles load only linked projects, also paginated. It is a directory; customer password resetting, account deletion and impersonation are not exposed. Reports searches saved content from loaded orders, reads plain text in a dialog and downloads the original text. Messages lists loaded projects and opens the selected conversation within its order; the sidebar unread count covers the database. These distinctions are labeled in the UI.

Payments uses a separate paginated directory of stored records with explicit live/test modes, amount and refund fields. It exposes no checkout parameters, session IDs, payment intents, receipt hashes or payment credentials. Services displays the current catalog from server-controlled prices and established scope; package-price editing and website CMS editing are not enabled. System settings checks actual admin/order/customer/payment readiness. No Stripe activation, email service, domain change, payment, refund or automated SEO work was added.

New read-only admin data routes remain behind the existing same-origin admin session and rate checks. No new migrations or credentials are needed. 67 automated tests pass, including database-wide counts, live/test accounting separation, customer search/cursor behavior, credential redaction, the authenticated owner detail read and all existing workflows. Local browser QA used real Worker handlers with isolated SQLite and fictional users/projects to verify customer search/profile links, order save, report reading, inbox navigation/read acknowledgements, payment empty/filter states, catalog, connection readiness, CSV download and a 375px body width without page overflow. Direct-route reloads were also checked. No production admin/customer data was created or edited by QA.


## Saved project states and stale-save protection (2026-10-31)

Migration `0008_order_history.sql` creates per-order numeric versions and a rolling history of 20 previous saved states. An idempotent SQLite trigger captures previous status, report, owner note, revision fields and timestamps whenever those fields change, including customer revision requests. Timestamp-only or identical saves do not increment the version. Existing rows are not modified/backfilled. History and version records cascade only when the parent order is legitimately deleted; existing payment retention checks remain enforced.

Owner-authenticated history list/snapshot reads are available through the existing private admin bridge. The list returns metadata only; full report text loads on demand. No receipt hashes or credentials are copied into history. The admin order detail includes `editVersion`; the editor submits it as `expectedVersion`. A database conditional update prevents an older editor from overwriting a newer owner save/customer revision. The write response acknowledges only its own committed text/version, rather than a subsequent GET that could adopt someone else's save. Invalid/stale versions fail without changing the saved order. Missing history schema fails explicitly versioned writes closed; unversioned legacy calls remain compatible and do not receive the new concurrency guarantee.

Saved report history appears within a selected order. An older report can be read, downloaded or loaded into the local report draft. This preserves current status, owner note and formal revision state. Review and explicit saving are required to publish restored report text. Conflict messages preserve the unsaved draft and offer reopening the latest saved order; download the draft before replacing it.

73 automated tests pass, including report snapshots, literal-text preservation, tied timestamps, stale versions, customer revision invalidation, unchanged saves, rolling retention, migration replay, cascades, missing-schema compatibility and write-acknowledgement isolation. Browser QA was attempted but the connection timed out; this update's visual/mobile interaction verification remains incomplete. No production test orders, customer messages, owner credentials or report changes were created by the agent. See `ROADMAP.md` at the repository root for remaining priorities and intentionally deferred integrations.

## Public website check

The home page, services page and `website-check.html` accept a public website address and consent. `POST /website-audit` checks public DNS and robots rules, then analyzes the submitted HTML page and up to two same-origin linked pages with native Cloudflare HTMLRewriter. Results identify actual pages, findings, evidence, context and coverage limits; summaries download as plain text. No numerical SEO score is invented.

Optional recommendations cite matching finding IDs and use the existing server catalog. No supported findings means no paid-package suggestion. The account link prefills the selected package, website and sampled pages; it creates no order and charges nothing. Existing manual package prices remain unchanged. No JavaScript rendering, full-site crawl, automatic fixing, ranking data or automated specialist fulfillment is included.

85 automated tests pass, including 12 scanner tests with native HTML parsing, safe destinations, robots rules, response limits, verification pages, recommendation matching and quotas. Desktop and 375px mobile browser checks passed using isolated fictional page responses, including findings, clean results and package handoff URLs. Production deployment verification is separate from those fixture checks. See `backend/WEBSITE_CHECK.md` for limits and deployment requirements.

Production verification on 2026-10-31: GitHub Pages and Cloudflare Builds completed successfully. The deployed public form fetched the actual Zikap site and analyzed three pages. It returned two context-dependent duplicate-title observations and no paid recommendation. No test order, customer account, message or payment was created. A browser download-event check timed out, so the actual exported file remains unverified; the control and generated text path were inspected.
