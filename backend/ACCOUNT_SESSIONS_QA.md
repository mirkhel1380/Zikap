# Customer session controls

Reviewed November 8, 2026.

Authenticated `GET /account-api/sessions` returns up to five unexpired sessions with only creation/expiry timestamps and a current-session boolean. It exposes no session identifiers, token hashes, IPs, user agents or invented device/activity labels. Existing seven-day session expiry and five-session cap are unchanged.

Same-origin `POST /account-api/sessions/revoke-others` requires the current password and uses a five-attempt rate bucket. Its DELETE preserves the current token and all other users' sessions. An atomic EXISTS guard checks both the current session and verified password snapshot; a final check rejects a concurrently revoked session. Other sessions lose access on their next authenticated request. New sign-ins after this operation remain possible. No credential or recovery code is changed, no new session is issued, and no migration is required.

Account & security loads the list when opened and provides manual refresh. Revocation stays disabled until a successful load shows another session and a valid-length password is entered. Password inputs clear after every completed request. Errors retain clearly stale dates, disable revocation and require refresh. Session cleanup and epoch guards prevent delayed reads/mutations from repainting another account. Existing password/recovery forms now also reject late results after account expiry; a successful password change refreshes session dates.

Validation:

- All 164 backend/public-catalog tests passed. Two new account tests cover redacted DTOs, missing authentication, method/origin checks, incorrect passwords, preservation of the current and another customer's sessions, idempotent repeat revocation, and a revoked-current-session race.
- Browser checks used actual account assets with isolated fetch fixtures: three sessions rendered; incorrect password kept all three and cleared input; refresh and correct fixture password left one current session; the action disabled afterward.
- A delayed fixture read completed after simulated expiry without restoring rows/passwords or the dashboard.
- Mobile iframe viewport 375 px: body client/scroll widths both 360 px, no horizontal overflow. Desktop appearance inspected. Dates use the browser locale.
- JavaScript syntax checks passed. Real customer sessions, credentials, orders, payments and messages were not changed during validation.

The list is a refresh-time snapshot, not device identification or an activity audit. Already authorized in-flight requests can finish when another session is revoked. This feature does not revoke stolen passwords; customers can separately change their password if needed.
