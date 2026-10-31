# Zikap project requests and delivery

This companion Cloudflare Worker keeps the public website on GitHub Pages. It is deployed as Worker `zikap` at `https://zikap.m-mirkhel20.workers.dev`, and `../api-config.js` points to it. The deployed `/health` now returns `ready:true` with `adminSecretStatus:"configured"`; the database binding and both tables also pass. The public form enables requests and tracking. Production test request creation and private receipt lookup were verified on 2026-10-30. The owner reported successfully saving a test report. Customer-side retrieval of that delivered production report and the production revision flow remain unverified. The public workspace disables submission until a configured API passes its readiness check. Do not announce online orders as active until the complete production smoke test below passes.

## What works without a server

The existing browser-local checker runs ten heuristic checks on customer-provided HTML, displays real findings, and downloads a report. It does not fetch a live website or fulfill the specialist packages. No search volume, difficulty, rankings, automatic keyword research, or paid audit is fabricated.

## What this server implements

- D1-backed project requests with server-controlled package prices and page limits.
- A random private receipt key (only its SHA-256 hash is stored) for customer tracking.
- Owner-authenticated request list, status updates, text report delivery, and deletion.
- Report reading/download in the customer workspace, plus one revision request after delivery.
- Fixed-origin CORS, body limits, SQL parameter binding, no-store responses and per-IP/hour rate limits.
- Stripe-hosted payments are implemented but require merchant configuration (see STRIPE_SETUP.md). No email delivery or external SEO database. Limited public URL checks are documented in WEBSITE_CHECK.md. No request is automatically accepted. A person must complete the promised research/recommendations and use `owner.html` to deliver the report.

## Connect a Cloudflare account

Run these steps from `backend/` after signing into the business's Cloudflare account. There is no custom domain requirement.

1. Install Node.js and run `npm install` (creates a local lockfile).
2. Run `npx wrangler login` for account authentication. Never send account credentials or tokens in chat or commit them.
3. Run `npx wrangler d1 create zikap-orders`. Copy its database ID into `wrangler.jsonc`, replacing `REPLACE_WITH_D1_DATABASE_ID`.
4. Run `npx wrangler d1 migrations apply zikap-orders --remote`.
5. Generate a cryptographically random owner secret of at least 32 characters in a password manager. Run `npx wrangler secret put ADMIN_TOKEN`, enter it at the hidden prompt, and keep it in the password manager. Never put it in `api-config.js`, browser storage, GitHub Actions files, or the repository.
6. Run `npx wrangler deploy`. Record the returned HTTPS workers.dev URL.
7. Check `<worker-url>/health` reports `ready:true`. Set `window.ZIKAP_API_BASE` in `../api-config.js` to that URL. Commit and deploy that public address only.
8. Run the production smoke test below before opening requests to customers. Check current Cloudflare pricing/usage limits in the account; this repo does not purchase a plan or promise unlimited/free operation.

`ALLOWED_ORIGIN` is the GitHub Pages origin, `https://mirkhel1380.github.io` (not its /Zikap path). Change it when the website origin changes. CORS is not authentication; the admin and receipt bearer keys provide access control.

## Local verification

`npm test` uses Node.js 24's SQLite module to exercise real SQL, persistence, server-side validation, receipt access, owner authentication, delivery, one revision, deletion, origin rejection, body limits and rate limits. This does not substitute for testing deployed Cloudflare bindings.

For the Cloudflare runtime: `npx wrangler d1 migrations apply zikap-orders --local`, set a test-only `ADMIN_TOKEN` in an ignored `.dev.vars`, then `npm run dev`. For browser testing set a local allowed origin in a local-only Wrangler configuration. Keep all test keys out of tracked files. Configure a valid test API address in a local-only copy of `api-config.js`.

## Production smoke test

- Submit a clearly marked test request from workspace.html, saving the receipt. Verify package price is controlled by the server.
- Check the request persists after reloading. Verify wrong receipt keys fail.
- Open owner.html, authenticate with the owner secret, and set acceptance/timing in the customer-visible note. Publish a test report and mark delivered.
- Retrieve and download the same report using only the customer receipt. Submit one revision; verify another cannot be submitted.
- Delete the test request in the owner desk. Lock the owner desk after use.
- If any step fails, restore the empty API address so the website stops accepting requests.

## Operating the service

Monitor the delivery desk regularly; no automated notifications are sent. Requests contain names, emails, websites and project goals: only collect what is needed, keep owner access restricted, and delete records when no longer required. Receipt keys are issued after submission and never stored by the app in browser storage. Lost keys have no automated recovery in this version. Customers must save their receipt. A separate specialist workflow, acceptance/timeline agreement and a legitimate payment method are needed before taking paid work; this code does not perform research on the owner's behalf.

Production traces are disabled in the sample Wrangler configuration; never add logging of request bodies, keys or reports. D1 rows are authoritative; screenshots or local browser state are not order confirmation.

## Request recovery and reliability

The workspace creates a random request ID and receipt key before submission. Retrying the unchanged form in the same page reuses them; the server inserts at most one row and rejects mismatched contents or keys. The receipt key is held in page memory and only its hash is stored in D1. A failed network response offers a recovery receipt without claiming the request succeeded. Customers can open saved text receipts to populate the tracking form. Owner pagination uses creation time plus order ID, so tied timestamps do not skip records.

Integration checks include retry deduplication and tied-timestamp pagination. A local browser QA run used the real Worker handler with a temporary SQLite adapter to verify intake, owner delivery, customer report viewing, one revision, receipt download and receipt import. This does not verify deployed Cloudflare bindings or make the production API active. The temporary QA server, in-memory test orders and test credential are not included in the repository.

## Cloudflare Builds: runtime owner secret

Build environment variables are not Worker runtime bindings. With root directory `backend`, set the Cloudflare Builds deploy command to `npm run deploy`. Keep the existing encrypted `ADMIN_TOKEN` build secret. The deployment script checks its minimum length before starting, deploys the API using `./wrangler.jsonc`, then passes the single secret as JSON over stdin to `wrangler secret bulk`. The owner key is not put in command arguments, the child environment, Git-tracked files, or application output; Wrangler output is suppressed for these deployment steps. The build token still needs permission to deploy this Worker and edit its secrets. A failed secret upload fails the deployment script rather than claiming readiness.

The value is reused exactly; it does not need to be regenerated. Once the deployment completes, check `/health` for `adminSecretStatus: "configured"` and `ready: true`. Local manual deployments that already configured runtime secrets can use `npm run deploy:worker`. Automated deployment tests use fixture secrets only and never contact Cloudflare.

## Current verification status (2026-10-30)

- Production health, request creation and receipt-authenticated lookup passed using clearly marked system-test orders with example.com and no payment.
- The owner reported successful production authentication and saving a test delivery. The agent has not verified retrieval of that delivered report with the original receipt.
- Delivered-report viewing, download and the revision flow have passed local end-to-end QA; their complete production path remains outstanding.
- Receipt usability now provides focused confirmation, masked keys, direct tracking and repeated download controls. No persistent browser storage or automatic email recovery was added.
- Automatic email, full-site crawling, SEO-data integrations and automated fulfillment remain unimplemented. A limited source-HTML URL checker is now available; see WEBSITE_CHECK.md. Stripe checkout is implemented but inactive until merchant secrets are configured and tested. Human service fulfillment is still required.

## Customer accounts

The Worker also serves `/account/` from the `ACCOUNT_ASSETS` binding. The account UI and `/account-api/` share an origin so a Secure, HttpOnly, SameSite=Lax `__Host-` cookie works without third-party cookies. GitHub Pages remains the marketing/free-tools host. `run_worker_first: true` preserves API routing alongside the assets; this remains a Worker with server code.

The additive `0002_customer_accounts.sql` migration creates users, hashed sessions and explicit order-ownership links. It does not replace or alter existing orders. `npm run deploy` applies this idempotent SQL file to the remote D1 database before deploying, then preserves the existing runtime-secret registration flow. The build token needs D1 edit access in addition to its existing Worker permissions. If schema preparation fails, deployment stops before changing the Worker. For an existing local/manual deployment, run `npx wrangler d1 execute zikap-orders --remote --file ./migrations/0002_customer_accounts.sql --config ./wrangler.jsonc` followed by `npm run deploy:worker`.

Health retains the existing order readiness checks and separately reports `customerAccounts`. `/account-api/status` reports account schema readiness. Only switch marketing links after the deployed Worker reports accounts ready and the account page loads. No new secret or email provider is required.

Customer flows: register; sign in/out; list/create/read owned projects; read/download delivered reports; request one scoped revision; attach an earlier order by its original receipt; change a password; rotate a recovery code; recover access using the latest private code. Email addresses are not verified and never act as proof of ownership of an earlier order. No verification or recovery emails are sent. Recovery codes are issued once in the response and only their hashes are stored. Keep the new recovery file after registration, password change or code rotation.

The Node/SQLite integration tests cover separate users, authorization, cross-site rejection, hashed credentials, first-party cookie attributes, retry deduplication, receipt attachment, owner delivery, one revision, password/code rotation, session revocation/expiry and login throttling. Local browser QA used the real Worker handler with temporary SQLite data and a synthetic fixture session to verify project creation, report delivery/download, revision, page reload and mobile layout. A local-only cookie-name adaptation was used for the HTTP preview; production cookies remain Secure and HttpOnly. No QA adapter, credential or synthetic session is shipped. Production customer registration/login still needs a user-operated smoke test after deployment.

See `ACCOUNT_SECURITY.md` for the authentication boundary and current limitations.

## Stripe payment records

`0003_stripe_payments.sql` is additive. The deployment helper applies it after the account migration. Optional encrypted build secrets STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are transferred only over stdin to runtime; they are removed from child environments and never logged. Runtime secrets omitted from a build are preserved. `/health` reports `payments:true` only when configuration and tables are present; that does not certify a real merchant transaction. The merchant must register the webhook destination and complete test mode before live activation. See STRIPE_SETUP.md for the exact destination, events, API version and activation steps.

There are 32 passing server/deployment checks, including Stripe fixtures. UI checks use fictional data. No real Stripe credentials, payment, refund or transfer were used by the agent. Refund initiation, disputes and merchant finances are handled in Stripe, not this application.

## Project action plans

`actions.mjs` provides manual customer implementation plans through the existing account API. Migration `0004_project_actions.sql` creates `project_actions` and its per-order index without changing existing records. The deploy helper applies schemas 0002, 0003 and 0004 before deploying, and does not continue if any schema operation fails. The account readiness endpoint includes `actionPlans`; missing task schema disables action routes only.

- `GET /account-api/orders/:orderId/actions` lists at most 100 tasks, including archived tasks.
- `POST /account-api/orders/:orderId/actions` accepts a UUID v4 `requestId`, `title` (1–200 characters), optional `pageUrl` (up to 500 characters, HTTP(S), same hostname, no URL login details), `notes` (up to 2,000 characters), `priority` (`high`, `medium`, `low`) and `status` (`planned`, `doing`, `done`, `archived`). Stable request IDs prevent duplicate creation on retries. A project may hold at most 100 records, including archived tasks.
- `PATCH /account-api/orders/:orderId/actions/:actionId` accepts the same editable fields and the latest integer `version`. Conflicting versions return 409. A task cannot be moved between orders.

All routes require the customer's first-party session and ownership of the parent order. Writes require the same origin and JSON, with rate/size limits. Plain text is rendered with DOM textContent. No permanent task-delete route exists; archive is reversible. Export is a text snapshot with no credentials. Task progress is customer-managed and independent of specialist delivery, payment status and actual changes to a website. Forty-five automated tests pass; local real-Worker browser tests use fictional data and a temporary QA-only auth adapter that is not published.

## Project messages

`messages.mjs` stores append-only plain-text conversations in `project_messages`, added by migration `0005_project_messages.sql`. Deployment applies schemas 0002–0005 before changing the Worker; a migration failure stops deployment. Existing account readiness stays independent; `/account-api/status` adds `projectMessages`.

Customer routes: `GET` and `POST /account-api/orders/:orderId/messages`. These require the first-party account session and ownership of the parent order. Owner routes: `GET` and `POST /admin/orders/:orderId/messages`, protected by the existing owner bearer authentication and allowed-origin policy. Customers must link an earlier receipt to an account before messaging; owners cannot send to an unlinked project. Role values in the request body have no authority.

Posting requires a UUID v4 `requestId` and `body` of 1–4,000 characters. Retries with unchanged text reuse the original record; a reused reference with different text, role or project is rejected. Each project has an atomic cap of 200 messages across both roles. Customer sends are limited to 20/hour per rate key, owner sends to 60/hour, with existing read/admin limits retained. Size, JSON and origin checks apply. No edit/delete routes are provided.

Reads return the newest 50 messages in chronological order. `before` uses the oldest returned timestamp and ID as a stable cursor; earlier pages respect both values to avoid gaps when timestamps tie. No credentials are returned. DOM textContent renders bodies as text. Requests never fetch message links or send email. Conversation writes do not alter order status, delivery timestamps, payment state or the included revision. The owner lock/session generation and detached component checks prevent late UI responses from reopening a cleared conversation. Exports include only currently loaded messages. Fifty-one tests pass, including ownership, server-assigned roles, retries, pagination, validation, quota, rate limits and graceful schema readiness.

## Message read tracking

Migration `0006_message_reads.sql` adds one role-specific record per acknowledged message in `project_message_reads`, with cascading cleanup through its message foreign key. The deploy helper applies 0002–0006 before deployment. `messageReadTracking` reports readiness separately from general account/message readiness.

- Account and owner order lists include `unreadMessages`, batch-counted only across the IDs in that page. The customer order detail also includes its count. Only opposite-role messages count as unread.
- Conversation GET responses add `readTracking`, `unreadCount`, and each message's reader-relative `unread` flag. Existing GETs have no read-state side effect. Without the read schema, counts/flags are `null`; existing conversation access remains available.
- `POST /account-api/orders/:orderId/messages/read` and `POST /admin/orders/:orderId/messages/read` accept `messageIds`, a unique nonempty array of up to 50 UUID v4 IDs from incoming messages on that authorized project. Authentication, parent ownership or owner bearer checks, JSON/origin/size limits and a separate read-write rate limit apply. Caller-supplied roles have no authority.
- Acknowledgement inserts are idempotent. Unknown IDs, another project's messages, duplicates, over-limit lists and the caller's own outgoing message IDs are rejected. New or unloaded messages retain their state. The response includes the current project unread count.

`project-thread.js` sends explicit read acknowledgements for loaded incoming messages in bounded batches; partial progress remains accurately reflected if a later batch fails. It never infers that a message was read simply because a hidden section was loaded. Customer and owner callbacks update only their own displayed counts, without changing reports, order statuses, payment state or revision usage. Fifty-five tests pass, including role isolation, refresh semantics, concurrent arrivals, idempotency, schema compatibility and existing workflows.


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

## Public URL checker

`POST /website-audit` provides a consent-based, origin-checked initial website check with existing D1 rate-limit storage. No new migration, secret or integration is required. `/health` reports `websiteAudit`. See [WEBSITE_CHECK.md](WEBSITE_CHECK.md) for the request, network policy, findings and actual service matching. The old local HTML checker remains separate.
