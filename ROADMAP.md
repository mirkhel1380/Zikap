# Zikap remaining work

Status reviewed on 2026-10-31 against the repository and completed deployment checks. English product UI; the public site, customer account and owner portal remain separate.

## Completed in this update

- Previous project report/update states are captured on future meaningful edits, including customer revision requests. Up to 20 previous states per order are retained; existing reports are not backfilled into invented historical versions.
- The owner can inspect/download an older report and load its text into an unsaved draft. Publication remains an explicit save. Current status, owner note and formal revision state are not restored from the old snapshot.
- The current admin editor uses a numeric editing version to reject stale saves. Save acknowledgement describes its own committed write, avoiding a later read that could silently adopt another writer's version. Legacy API writes without the optional version remain supported and are captured by the history trigger.
- 73 automated tests pass. Browser verification of this update remains blocked by a browser-connection timeout; it must not be described as visually verified.

## Next implementation priorities

1. **Editable service catalog.** Services currently displays the actual prices/scopes but does not edit them. A proper editor must keep public pricing, intake, server checkout validation and the historical agreed price on existing orders consistent. Changing a price must not rewrite existing orders.
2. **Saved owner checklists and internal notes.** The delivery desk's review ticks are currently session-only. Persist explicit internal completion notes without accidentally publishing them in customer-visible updates. No fabricated research or automatic delivery.
3. **Finish a production lifecycle check with the owner.** The owner reported saving a report and earlier local end-to-end checks passed. A complete deployed account request, owner acceptance/delivery, customer report download and scoped revision round trip still needs an owner-operated verification. Do not collect the owner's key, password or recovery code in chat, and do not create new production test records without the owner's specific authorization.
4. **Complete browser print/PDF verification.** Report display/download/mobile checks passed previously; this browser did not expose a real print/PDF dialog. Actual exported PDF pagination remains unverified.

## Deliberately deferred by the owner

- Custom domain and business email.
- Stripe merchant configuration and a merchant-operated test before live activation. Payment records and guarded checkout code exist; merchant secrets remain unconfigured and no charge/refund was performed by the agent.

## Optional later platform work

- Verified email and email notifications after an email provider is selected/configured; private recovery codes are the current recovery method.
- Live Search Console integration, crawling, keyword/rank data, automated content generation or CMS publishing only after real integrations, costs and permissions are defined. The current CSV explorer and HTML tools use customer-supplied data; specialist packages require actual manual work.
- A website content editor is not implemented by the admin dashboard. Customer impersonation, password resets by the owner and destructive account management are not exposed.

## Current limits

Summary statistics cover the database; order/report/inbox search and CSV export cover loaded orders and are labeled accordingly. Customer and payment directories use server pagination. The separate admin uses its existing same-origin sessions. History is a rolling 20-state recovery aid, not a general database backup or a record of edits predating its activation.
