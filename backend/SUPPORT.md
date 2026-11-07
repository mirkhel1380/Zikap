# Account-scoped Help & support

Customers use **Help & support** in their account; the owner uses **Support** in the separate administration application. No project is required. This is a signed-in channel; a public contact for visitors unable to sign in still needs to be supplied when the owner completes domain/email setup.

## Workflow

Topics: account access, project/report questions, payments, refund review, privacy/account data, and general questions. Customers submit a subject and initial message, then read/reply inside the same private request. No support email or external messaging operation is performed. Do not submit passwords, receipt keys, full card details or identity documents.

The owner replies through the customer-visible conversation and can set Needs Zikap review, Waiting for customer, or Conversation resolved. A new customer message reopens the conversation; an owner reply marks it waiting. Status is separate from payment/refund/account state. Resolving a conversation does not issue a refund, delete records or confirm SEO work.

## Storage and access

Migration 0014 adds support_threads, support_messages, support_message_reads and an insert trigger that advances the thread version/state. Customer APIs live at /account-api/support; owner APIs live at /admin-api/support. Both run only after their existing independent session/origin checks. Customer IDs and sender roles come from the authenticated caller. Lists, details, posts and read acknowledgements enforce the customer scope; the owner directory includes only the profile name/email needed for support. Security credentials, internal owner work and payment processor secrets are never returned.

Request creation and messages use immutable UUID references. Retries preserve one record; conflicting body/reference reuse fails. Creation and message caps are checked in the insertion statement. A conversation status write requires the saved version, so a new message rejects an older owner status edit. The UI retains the draft choice on conflict. Read receipts apply only to explicitly selected incoming loaded message IDs; fetching a conversation does not mark anything read.

Lists page 25 requests, conversations page 50 messages, both with date/UUID cursors and tied-timestamp coverage. Limits are 20 unresolved requests per account and 200 messages per request. Creation allows five attempts per customer/IP/hour; customer/owner replies allow 20/100 per actor/IP/hour, within the support read limit of 180 and the existing admin portal limit. There is no general deletion/retention policy introduced by this feature.

## Downloads and UI

Account JSON downloads now include a support section: own subjects/topics/statuses and conversations, paginated under the existing password-confirmed, session-bound download grant. Existing size/record caps and incomplete-export handling remain in place. No private owner notes or security data are included.

The shared conversation widget keeps project wording by default and uses support-specific wording only when context is support. Unsent replies/status choices are preserved during list/message refreshes. Opening another request warns before discarding a reply/status draft. Sign-out/session clearing removes support data and drafts from the page; late responses cannot restore them. Reload/close warns for unsent support drafts.

## Verification

142 tests passed, including support creation without projects, customer/owner isolation, origin checks, role assignment, immutable retries/collisions, unread acknowledgements, stale status updates, reopening, bounded limits, stable pagination, migration replay, missing-schema behavior and inclusion in account exports. Browser QA uses isolated fictional records; no production support request, message, payment, refund or email is created for demonstrations.
