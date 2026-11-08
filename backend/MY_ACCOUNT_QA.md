# My account navigation and personal area

November 8, 2026.

The customer top-right name/initial block is replaced by an always-visible My account link with a generic person icon. The sidebar uses the same label. Sign out is inside the account page rather than beside the top-right link. The account name/email pair is removed from Overview; the existing first-name greeting remains.

The My account page groups existing personal functions in three accessible tabs:

- Personal details: the actual signed-in account's full name and sign-in email, plus Customer account type. These fields are read-only; no unsupported profile editing, address or phone data was added.
- Security: existing password change, recovery-code replacement and active-session controls. Sessions load when this tab is opened.
- Your data: existing password-confirmed private JSON export and a link to account support for privacy questions. No automatic deletion or new data collection was added.

Tabs expose matching tab/tabpanel labels and controls, selected state and a single keyboard tab stop; Left/Right/Home/End move selection and focus. Shortcut buttons open the matching tab. The top-right and sidebar links open Personal details. The old #account-security address resolves to #my-account with Security selected, preserving bookmarks. Sign-out/expiry clears name/email/monogram and returns tab selection to Personal details. Existing account permissions and backend routes are unchanged.

Validation:

- account.js syntax passed. HTML parsing found no duplicate IDs. Removed header/profile-line IDs have no remaining JavaScript references.
- Actual customer assets with isolated account fixtures: top-right text contained Refresh/My account with no personal name; Personal details showed the fixture account's name/email; Security loaded session dates and retained both security forms; keyboard Right selected Your data; top-right My account returned to Personal details.
- The old security bookmark normalized to the new page and opened Security. Sidebar label was checked as My account.
- Mobile 375 px iframe: the account link remained visible, personal cards stacked, and Personal details/Your data were usable; body client/scroll widths both 360 px with no horizontal overflow.
- Simulated expiry hid the dashboard and cleared profile full name/email to dashes. Data export remained password protected; no export, credential change, recovery rotation or session revocation was submitted during verification.

This is a frontend organization change. No new production accounts, projects, personal fields, payments, messages or credentials were created/changed for QA. The original logo and existing service/payment functionality are preserved.
