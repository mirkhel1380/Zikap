# Receipt tracking response guards — November 9, 2026

The legacy private-receipt tracking panel now scopes asynchronous reads and revision follow-ups to the currently entered receipt. Editing an ID/key or selecting another file invalidates earlier responses and clears the displayed report. A delayed file read cannot overwrite manual edits or a newer file. Pagehide clears entered receipt credentials and local results, including the page's history-cache state.

Revision submission locks its note/control, ignores repeated submissions and cannot refresh/repaint a different receipt after completion. An already submitted server request may still complete for the originally authorized project; the UI guard does not cancel that request or alter server ownership rules.

## Verification

- Five UI-controller regressions plus twelve account/receipt ownership regressions passed (17 total). Covers stale success/error ordering, field edits, pagehide, delayed/competing receipt reads and a late revision response after changing receipts.
- Browser preview loaded the actual workspace assets with labeled synthetic deferred responses. Requested A, then B; completing B before A left only B's report visible. Two GETs and zero POSTs.
- Changing receipt details removed the previous result immediately. Navigating away and back left ID, private key and result empty.
- JavaScript syntax and the fifteen-page public metadata/sitemap/local-link checks passed.

All receipt IDs/keys/reports in the preview were synthetic. No real receipt, customer report, revision, account, payment, private export or AI operation was used or changed. Existing server authorization remains unchanged; no browser storage of receipt credentials was introduced.
