# Customer account boundary

Accounts are served on the API Worker's `/account/` origin, not in an embedded frame. Session cookies use the `__Host-` prefix, Secure, HttpOnly, SameSite=Lax and Path=/ with no Domain attribute. Tokens are random 256-bit values, only their SHA-256 hashes are stored, sessions expire after seven days and at most five sessions per user are retained. Logout revokes the current session; password replacement and recovery revoke existing sessions. No account credentials are put in URLs, localStorage or sessionStorage.

Passwords are 15–128 characters and hashed with per-user random salts using native PBKDF2-SHA-256 at 100,000 iterations, the Workers WebCrypto limit. The work factor is explicit; this is not a claim of meeting every password-storage recommendation or an independent security audit. For a larger public service, evaluate a dedicated identity provider or a runtime supporting a stronger password-hashing work factor. Passwords, cookies and recovery codes must never be logged.

Recovery codes are independent random 256-bit values and only their hashes are stored. A code is shown once after registration, password change or explicit replacement. Using a code rotates it and replaces the password. Reusing the previous code fails. Customers who still know their password can issue a replacement code from account settings. No email verification or recovery emails are available. An unverified email address is a login identifier, not identity proof.

Every account project operation authorizes through a server-side user/order link. Email matches do not grant access. Attaching an earlier receipt requires the original private receipt key and cannot move an order already linked to another account. Existing receipt access is preserved. New account orders use an internal receipt hash that is never issued to the customer. Order creation and the ownership link commit together in a D1 batch. Retrying an unchanged client request ID returns the same owned order; a collision with another account cannot create an ownership link.

Cookie-authenticated mutations require an Origin matching the account API origin and JSON request bodies. Responses are no-store. The account document uses a self-only CSP, denies frames and object content, and has no external scripts. Report and customer text are rendered with textContent. Inputs, upload sizes and request sizes are bounded. Authentication, recovery, project creation, attachment and read operations are throttled server-side. No automatic customer notifications, payments, URL fetching or publication are added by this feature.

The owner desk retains separate ADMIN_TOKEN bearer authentication. A customer password, session cookie, recovery code or receipt does not authorize owner endpoints. The additive schema does not delete existing requests. Keep D1 backups and restrict account/build credentials as part of operating the service.

Technical references consulted during implementation:

- https://developers.cloudflare.com/workers/runtime-apis/web-crypto/
- https://github.com/cloudflare/workerd/issues/1346
- https://developers.cloudflare.com/d1/worker-api/d1-database/
- https://developers.cloudflare.com/d1/wrangler-commands/

## Private account JSON download

Account & security includes **Download your account data**. The current password is rechecked before a grant is issued; the browser clears that input immediately after submitting it. Grants are random, stored only as SHA-256 hashes, bound to the current user and exact session, expire after ten minutes, and cascade when that session is deleted. Successful browser preparation revokes the grant. No archive is saved server-side. Start attempts are limited to five per customer/IP per hour; parts are limited to 1,500 per customer/IP per hour.

The same-origin POST API is `/account-api/data-export/start`, `/part`, `/finish`. Part/finish calls require the `X-Zikap-Export` header and the existing account cookie. Parts use validated date/UUID cursors and fetch one owned project or unexpired saved check at a time. Projects include customer-visible briefs, reports, revision details, conversations, action plans and sanitized payment summaries. Profile fields are explicitly selected. Owner-only notes/checklists, report history, credentials, receipt keys, payment processor IDs/URLs and provider request data are excluded. Local browser tools/CSV inputs are not server records and are not included.

The browser collects at most 1,000 records and 50 MiB into one JSON file, with explicit failure on incomplete collection. It does not offer a truncated file as complete. Cancellation or session clearing prevents late responses from creating a download. Data are read in separate requests, not as a transactionally frozen database snapshot. No account deletion, refund, email or external-provider operation is performed. Migration 0013 is additive and replay-safe; missing export schema disables this feature.
