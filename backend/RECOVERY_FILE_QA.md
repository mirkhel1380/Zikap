# Local account recovery file reader

November 8, 2026.

The signed-out recovery form now offers an optional text-file picker for the exact account-recovery format already downloaded by the dashboard. It fills the email and masked recovery code only. The customer must still enter a new password and explicitly submit the existing recovery form. File contents are read locally with File.text(), not uploaded, stored in browser storage, logged or sent to another service. The code is verified by the unchanged recovery API only on submission. Project receipts are not account recovery files.

The parser accepts CRLF/BOM and hexadecimal case, requires the expected heading and exactly one valid email and 64-character hexadecimal code, and rejects oversized, incomplete, duplicate or wrong-format files. Any sign-in URL in the text is ignored and never opened. Error messages do not echo file contents. The selected file input is cleared after reading. Importing a file does not authenticate the customer or change a password.

Asynchronous reads are invalidated when the form is cleared, authentication starts, the view changes or the user manually edits email/code during reading. Entering a signed-in account and clearing a session also clear the reader and auth secrets. Auth form controls are locked for a pending request, a shared busy flag prevents duplicate/cross-mode submissions, and request-version guards ignore results after account cleanup. These frontend guards do not cancel a request already received by the server.

Validation:

- Four new file-reader tests plus all ten account tests passed (14 total). Cases include native download format, BOM/CRLF/case, ignored URL, receipt rejection, duplicate/missing/oversized fields, secret-safe errors, masked fill, clearing selected files, oversized files never read, delayed reads after cleanup, hidden forms and manual edits.
- Actual customer assets with an isolated signed-out fixture and a synthetic recovery text file: native file chooser read filled the synthetic email/masked code, cleared file selection and made zero authentication calls. Returning to Sign in and reopening recovery cleared the code and import message. No real password was entered and no recovery/login request was submitted by browser QA.
- Mobile iframe 390 px: body client/scroll widths both 375 px. Recovery controls and explanatory text remained visible without horizontal overflow.
- JavaScript syntax checks passed. Busy/auth-result guards were inspected in source; their entire authentication lifecycle was not independently replayed in browser QA.

Deployment should be checked read-only. Do not sign out a real customer or change a real password simply to expose the signed-out UI. Existing sessions can verify the deployed asset reference/markup; the isolated screenshot represents the signed-out recovery view. Domain/email setup remains deferred. Recovery email, new authentication methods and account deletion are not introduced.
