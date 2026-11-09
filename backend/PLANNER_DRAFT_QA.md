# Content planner draft protection — November 9, 2026

Rebuilding, trying a sample, restoring a device copy and opening a backup previously replaced edited planner data without confirmation. The planner now tracks unsaved plan edits, asks before replacement, validates backups before asking, and preserves the current plan when replacement is cancelled. A successful explicit device save or restore clears the unsaved-plan flag; requesting a downloaded backup does not pretend that a file was successfully saved.

Pending file reads have a selection generation and plan/form revision. An older read cannot overwrite a newer selection, a new plan or edits made while the file was opening. Starting another build/restore also clears the obsolete file selection so the same backup can be chosen again. No automatic device save or upload was introduced.

## Verification

- Six VM controller tests passed: sample replacement cancellation, device restore cancellation/confirmation, delayed read versus newer edits, competing file selections, invalid backups preserving data, and a new build invalidating an older read/file selector.
- JavaScript syntax and the fifteen-page public metadata/sitemap/local-link checker passed.
- Isolated browser: the native confirmation appeared for a second sample and for restoring a device copy after editing. Dismissing either preserved the edited working title; restore cancellation showed the kept-plan message.
- Isolated mobile: explicit Restore saved plan loaded the saved four-article sample, with document-root/client widths 360/360 px in a 375 px iframe.
- A best-effort beforeunload handler is covered by the controller tests. The automated browser reload did not expose a native leave-page dialog, so this review does not certify that warning on every browser/device. Explicit save/download controls remain necessary for keeping work after page reload or closure.

Only synthetic planner data and storage on the isolated preview origin were used. No live customer storage, accounts, requests, messages, payments, AI calls or website audits were created. The change affects only the browser-local public planner.
