# Zikap project requests and delivery

This companion Cloudflare Worker keeps the public website on GitHub Pages. It is deployed as Worker `zikap` at `https://zikap.m-mirkhel20.workers.dev`, and `../api-config.js` points to it. At the latest production check, `/health` returned `{"ready":false}`; runtime configuration and the production smoke test are still outstanding. The public workspace disables submission until a configured API passes its readiness check. Do not announce online orders as active until the complete production smoke test below passes.

## What works without a server

The existing browser-local checker runs ten heuristic checks on customer-provided HTML, displays real findings, and downloads a report. It does not fetch a live website or fulfill the specialist packages. No search volume, difficulty, rankings, automatic keyword research, or paid audit is fabricated.

## What this server implements

- D1-backed project requests with server-controlled package prices and page limits.
- A random private receipt key (only its SHA-256 hash is stored) for customer tracking.
- Owner-authenticated request list, status updates, text report delivery, and deletion.
- Report reading/download in the customer workspace, plus one revision request after delivery.
- Fixed-origin CORS, body limits, SQL parameter binding, no-store responses and per-IP/hour rate limits.
- No payments, email delivery, account recovery, URL crawling, or external SEO database. No request is automatically accepted. A person must complete the promised research/recommendations and use `owner.html` to deliver the report.

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

Monitor the delivery desk regularly; no automated notifications are sent. Requests contain names, emails, websites and project goals: only collect what is needed, keep owner access restricted, and delete records when no longer required. Receipt keys are shown once after submission and never stored by the app in browser storage. Lost keys have no automated recovery in this version. Customers must save their receipt. A separate specialist workflow, acceptance/timeline agreement and a legitimate payment method are needed before taking paid work; this code does not perform research on the owner's behalf.

Production traces are disabled in the sample Wrangler configuration; never add logging of request bodies, keys or reports. D1 rows are authoritative; screenshots or local browser state are not order confirmation.

## Request recovery and reliability

The workspace creates a random request ID and receipt key before submission. Retrying the unchanged form in the same page reuses them; the server inserts at most one row and rejects mismatched contents or keys. The receipt key is held in page memory and only its hash is stored in D1. A failed network response offers a recovery receipt without claiming the request succeeded. Customers can open saved text receipts to populate the tracking form. Owner pagination uses creation time plus order ID, so tied timestamps do not skip records.

Integration checks include retry deduplication and tied-timestamp pagination. A local browser QA run used the real Worker handler with a temporary SQLite adapter to verify intake, owner delivery, customer report viewing, one revision, receipt download and receipt import. This does not verify deployed Cloudflare bindings or make the production API active. The temporary QA server, in-memory test orders and test credential are not included in the repository.

## Cloudflare Builds: runtime owner secret

Build environment variables are not Worker runtime bindings. With root directory `backend`, set the Cloudflare Builds deploy command to `npm run deploy`. Keep the existing encrypted `ADMIN_TOKEN` build secret. The deployment script checks its minimum length before starting, deploys the API using `./wrangler.jsonc`, then passes the single secret as JSON over stdin to `wrangler secret bulk`. The owner key is not put in command arguments, the child environment, Git-tracked files, or application output; Wrangler output is suppressed for these deployment steps. The build token still needs permission to deploy this Worker and edit its secrets. A failed secret upload fails the deployment script rather than claiming readiness.

The value is reused exactly; it does not need to be regenerated. Once the deployment completes, check `/health` for `adminSecretStatus: "configured"` and `ready: true`. Local manual deployments that already configured runtime secrets can use `npm run deploy:worker`. Automated deployment tests use fixture secrets only and never contact Cloudflare.
