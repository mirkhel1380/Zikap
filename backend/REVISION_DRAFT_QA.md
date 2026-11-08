# Clarification draft retention

November 8, 2026.

Unsent formal clarification text is kept in a project-keyed, in-memory store. Refreshing the project, closing/reopening it or moving between workspace sections preserves the text. A clear control asks before discarding it; logout includes clarification drafts in its existing warning and page unload includes them in the browser warning. Account cleanup clears all entries.

Only a confirmed matching submitted note clears its draft. A late successful response cannot clear a newer different note. If the included revision is already used, a retained different draft is shown explicitly as unsent, with download/clear controls and no second revision form. Matching notes observed in the saved project are acknowledged. No storage on the device or server is added; page reload and session cleanup discard unsent drafts, as the form explains.

## Verification

- Three draft-store tests plus twelve account regressions passed (15 total), including per-project separation, exact whitespace retention, stale acknowledgement, cleanup and the existing atomic one-revision rule.
- Account JavaScript syntax check passed.
- Isolated desktop: exact multiline text survived project refresh and close/reopen, with zero submission calls.
- Isolated delayed response: reopened the project and wrote a newer note before the original submission completed. The saved project showed the submitted note and retained the different newer draft as unsent. One submission call total.
- Isolated mobile: draft survived refresh; body client/scroll widths were both 360 px in a 375 px iframe. Normal submission completed with the existing revision-requested notice and no retained different-draft panel.

Preview fixtures are labeled and never sent real revisions or payments. No backend or payment behavior changed. Domain/email/policy adoption remains deferred.
