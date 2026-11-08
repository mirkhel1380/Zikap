# Prepared private export controls

November 8, 2026.

Your data now offers Clear prepared file next to the completed JSON download. Clearing revokes the local object URL, hides both ready-file controls and resets password/preparation state. It makes no additional API call and does not delete an account, stored record or file already saved on the customer's device. The ready message includes the actual Blob size.

A prepared link expires ten minutes after file creation. A timeout revokes it; a click-time deadline check also blocks an expired link if a background-tab timer was delayed. Timeout callbacks are scoped to the current preparation run, so an older callback cannot clear a newer file. File creation/format/content collection and server grant expiry are otherwise unchanged. This is a browser-page link lifetime, not deletion or revocation of previously downloaded files.

The existing account-session-cleared event still resets the download, and pagehide now also resets it. In-page workspace navigation does not unload the page; a prepared file stays available until clearing, expiry or page/account cleanup. Reset/cancel invalidates in-flight collection; its grant is still finished once an outstanding request returns. No real customer export was prepared for deployment QA.

Validation:

- Four new VM/controller tests passed: complete JSON and explicit clearing without an extra server call; expired-click blocking and stale-timeout isolation; page/session cleanup; cancellation during a delayed part without later restoring a file, including grant cleanup.
- Actual account assets with a labeled isolated fixture: prepared one synthetic project export, downloaded its JSON, verified its account/report/completion fields, cleared the link and confirmed the saved file remained intact. The visible link and Clear prepared file button both disappeared with a clear explanation.
- Mobile iframe 375 px: ready-file controls were usable and body client/scroll widths both 360 px, with no horizontal overflow.
- JavaScript syntax passed. Backend routes/redaction/record limits did not change, so the backend suite was not rerun for this frontend lifecycle change. The earlier 177-test release result is not a new run for this release.

The screenshot of ready-file controls uses synthetic fixture data and is labeled as a preview. Production verification is read-only and does not require credentials, a new grant, a private download, record deletion or a financial action. Domain/email setup remains deferred.
