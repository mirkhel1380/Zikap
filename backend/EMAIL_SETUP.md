# Transactional email notifications

Sending is **off by default**. This release does not create a provider account, buy a domain/plan, verify DNS or send real customer mail.

## Customer events

Four English HTML/plain-text notifications cover request received, project accepted, payment confirmed and report ready. Receipt confirmation explicitly says submission did not charge the customer. Acceptance asks them to review the agreed scope/timing. Payment notifications follow the authoritative database transition, not the return URL, and label simulated payments TEST MODE / no real charge. Report notifications direct customers to the latest saved report.

Templates match Zikap's navy/blue style. No reports, messages, names, website URLs, project briefs, passwords or private receipt keys are included. Only the project reference, package title or payment amount is specific to the project. Links are fixed public workspace addresses without automatic authentication. Linked orders notify the linked customer account; guest orders use the saved request email and receipt-based tracking.

These are service notifications, not marketing. This feature does not verify account email addresses or provide email password resets. Existing recovery codes, authentication and request rate limits remain in force.

## Activation after domain setup

1. Create the merchant's Resend account and verify a domain the merchant owns using the provider's exact DNS records. Choose a sender on that verified domain. An ordinary Gmail address is not a verified business-domain sender.
2. Create a **sending-only** Resend API key, limited to that domain if available. Store it as encrypted Cloudflare secret `RESEND_API_KEY`; never put it in source, browser JavaScript, URLs, command arguments or chat.
3. Store `EMAIL_SETTINGS` as a separate encrypted secret with this shape. Replace both example addresses and use the actual activation time in UTC, not a time before setup:

```json
{
  "enabled": true,
  "from": "updates@example.com",
  "replyTo": "support@example.com",
  "startAt": "2026-11-02T00:00:00Z"
}
```

`replyTo` is optional. Use plain addresses; the integration adds the Zikap display name. The example is not an activated sender.

Build secrets are transferred to the primary Worker only via stdin by `deploy.mjs`. Existing runtime secrets omitted from the build environment are preserved. Do not copy email secrets to the independent admin Worker. Add eventual build secrets through the merchant's secure Cloudflare settings and redeploy for consistency.

4. `/health` exposes enabled/configuration/schema booleans only. Admin **System settings** displays readiness and private queue counts. Readiness checks local configuration; it does not verify DNS, key permissions, provider eligibility, inbox delivery or placement.
5. Perform a deliberate merchant-approved notification check to the merchant's own verified/test recipient and inspect Resend's delivery record before using real customer events. Do not enable production mail merely to test unverified sender credentials.

To pause, set `EMAIL_SETTINGS` to `{"enabled":false}`. On reactivation use a new `startAt` to skip paused-period events. Keep this timestamp fixed across ordinary redeploys. Pending attempts with a prior activation boundary are held for review rather than resent.

## Reliability

Migration `0009_email_notifications.sql` adds an outbox and triggers for future order/status/payment transitions. Existing orders are unchanged and nothing is backfilled. Event capture and the business write share one database transaction. Unchanged saves and replayed webhooks add no duplicate notification. Editing a report already marked delivered sends no new ready email; a later delivered transition after a revision does.

A five-minute Worker cron claims at most five messages per run using conditional two-minute leases. Requests and checkout never wait for a provider. No public or admin endpoint sends arbitrary emails. Cloudflare cron changes may take time to propagate.

Before the first call, the complete immutable request payload and an event-specific provider idempotency key are persisted. Retries reuse sender, recipient, content and key even if settings change. Transport failures, 408/409/429 and server errors retry with bounded backoff. Other provider rejections stop for review. Provider bodies/error details are never stored or returned. Acceptance IDs mean **accepted by provider**, not **delivered to inbox**. Bounce/complaint/delivery webhooks are outside this release; the provider dashboard is the delivery and suppression reference.

Resend's idempotency window is 24 hours. Automatic retries stop after 23 hours from the first attempt, holding unknown outcomes as `uncertain`. Do not clear IDs, blindly resend, or rotate keys after expiry. Failed/uncertain messages have no automatic resend control; first review the provider's result.

Before sending, private outbox rows hold only event type, order ID, package/payment metadata and timestamps. Once attempted, they also hold rendered payload/recipient/sender and provider references. These rows never appear in public API responses. They cascade when a deletable order is removed; existing payment-retention protections remain. Define retention in the business privacy policy.

## Verification and remaining work

Tests use memory-only SQLite, all real migrations and an isolated provider transport. They cover atomicity, no backfill, disabled/activation states, templates/privacy, test-mode wording, concurrency, immutable retries, expiry, permanent rejection, linked recipients, bounded batches, cron and secret handling. They do not send real email.

Remaining: merchant domain, verified sender, sending-only key and an approved delivery check. Production stays disabled until these are ready.

Official references:

- https://resend.com/docs/api-reference/emails/send-email
- https://resend.com/docs/dashboard/emails/idempotency-keys
- https://resend.com/docs/dashboard/domains/introduction
- https://developers.cloudflare.com/workers/configuration/cron-triggers/
