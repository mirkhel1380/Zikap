# Section-specific workspace refresh

November 8, 2026.

The top-right Refresh control now refreshes the active workspace context: saved profile details, session dates, saved payment records, the support request list, or the existing project list for Overview/Projects/Reports. Its accessible label identifies the target. Non-project contexts use contextual header labels rather than incorrectly reporting Projects up to date. Individual panels retain responsibility for reporting their actual request success/error.

The global control is hidden for private data exports, unsent request/receipt forms, local tools/performance and the AI review view, whose own dedicated controls remain available. It does not submit a form, regenerate/download private data, run AI, create checkout or contact Stripe. Refreshing profile details preserves the editor's draft; support list refresh preserves the unsent composer. Existing payment filters and session controls use their existing read paths.

Header refreshes track in-flight actions per context and account epoch. Background project completion updates the current context's header rather than overwriting a different view. Session cleanup clears pending header state. Existing module refresh/load methods remain the source of data and error handling; no backend route, schema, provider call or permission changes.

Validation:

- Syntax checks passed for account.js, profile-editor.js, payments.js and account-sessions.js.
- Actual customer assets with isolated read counters: initial profile 1/orders 1; header profile refresh changed profile to 2 while orders stayed 1 and preserved an unsaved name. Payments, support and sessions each reached 2 reads after their own header refresh, without extra project reads. Support subject/body stayed intact. Overview refresh then changed orders to 2. Write calls remained zero throughout.
- The header control was hidden in Your data and New request.
- A delayed initial project response completed after switching to Payments; the header retained Saved payment records and the corresponding refresh label.
- Mobile iframe 375 px: header profile refresh increased only the profile read count; body client/scroll widths both 360 px, with no horizontal overflow.

No backend tests were rerun for this frontend routing change. Production verification is read-only; no real profile edits, messages, private exports, session revocations, payments or AI generation are needed. Domain/email setup remains deferred.
