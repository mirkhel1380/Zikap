# Zikap independent administration

The administration app is deployed as a **separate Worker** named `zikap-admin`, with its own assets, first-party session cookie and login. The customer/marketing sites keep their existing addresses. No custom domain is purchased or configured by this change.

## Data and service boundaries

- Existing D1 `zikap-orders` is authoritative for orders. Additive migration `0007_admin_accounts.sql` adds an admin-only single-owner record and hashed admin sessions; it does not copy, delete or replace customer/order tables.
- A `ZIKAP_API` service binding calls the existing `zikap` Worker for the allowlisted owner-order/message operations. The owner key remains server-side after initial setup. No Stripe secrets are copied to the admin Worker.
- A customer session, customer password, customer recovery code or bearer owner key alone cannot sign in to the separate admin API. No public admin registration exists. The old receipt/customer flows are unchanged.

## First-time owner setup

1. Open the deployed `zikap-admin` workers.dev URL shown in Cloudflare.
2. Enter the existing `ADMIN_TOKEN` owner key **only in the one-time setup form**, then choose an admin username and a password (15–128 characters). Do not send any key or password through chat.
3. Download and privately retain the recovery file. It contains the username, portal address and a recovery code that can replace the password. Only the latest code works.
4. Future visits use **username and password**, without entering the owner key again. The setup route refuses to replace an existing owner account, even with the original key.

The deployment does not create a production admin username/password for the owner. Password setup must be completed by the owner. If a setup response is lost, try signing in using the chosen username/password before retrying setup; change the password in Account & security to receive a replacement recovery file.

## Deployment

The existing build command `npm run deploy` in backend applies migrations 0002–0007, deploys `zikap`, securely transfers its existing encrypted build secrets over stdin, then deploys `zikap-admin` using `admin.wrangler.jsonc` and transfers only `ADMIN_TOKEN` to it. The shared database and service binding are explicit. CI name/tag/output overrides for the primary Worker are removed only from the second Worker's commands to prevent accidentally overwriting the primary Worker or its build output.

The build token must already permit creating/updating Workers and binding the existing D1/service. If Cloudflare denies the second deployment, the existing customer Worker remains deployed; the build reports failure. Do not solve a permissions error by copying credentials into source or weakening portal authentication. The owner can configure the separately named Worker through Cloudflare with the prepared config if needed.

A future `admin.<owned-domain>` custom domain can route to this separate Worker. Add the domain in the owner's Cloudflare account; do not change order/database IDs. Host-only sessions do not carry between the temporary hostname and the custom domain, so sign in again. No email delivery or password reset email service is configured.

## Security

Passwords use salted PBKDF2-SHA256 with 100,000 iterations (the current Worker WebCrypto limit). Recovery codes and 256-bit random session tokens are stored only as hashes. Admin sessions last 24 hours, capped at three, using a distinct Secure/HttpOnly/SameSite=Strict `__Host-` cookie. Password/recovery changes increment a credential version and revoke earlier sessions. Writes require exact same-origin JSON. IP and username attempt limits use the existing rate-limit table. CSP restricts scripts/styles/connect to self; framing, response caching and referrer transmission are disabled. Neither passwords, owner keys nor recovery codes are stored in browser storage, URLs or application logs.

The UI uses plain text for reports/messages. Delivery, payment-retention checks, unread acknowledgements and existing per-project constraints are enforced by the original owner APIs. The app does not create payments or perform SEO work automatically.

## Validation

64 automated tests pass, including eight new admin/SQLite integration tests and a deployment isolation test. The separate Worker dry run validates D1, asset and service bindings. Local browser QA used the real admin and order handlers with isolated in-memory SQLite, a fictional customer and a server-side fixture session. It verified order saving, message retrieval/reply, mobile navigation and a 375px body without horizontal overflow. The QA server relaxed frame headers only for its local mobile iframe; production frame protections remain intact. No production admin/customer credentials, orders or messages were created by QA.
