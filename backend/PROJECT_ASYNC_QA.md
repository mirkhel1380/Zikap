# Project response lifecycle checks

November 8, 2026.

Customer project checkout preparation, payment-status checks and formal revision submissions now capture the current project view, account epoch and navigation generation. Late responses cannot redirect to checkout or reopen a project after the customer closes it, changes sections, opens another project or ends the session. Changing sections also invalidates pending project reads. Rendering a newer detail invalidates older reads.

Checkout consent and its button lock together during preparation. Revision text and submit lock during submission. Returning to an old panel after an interrupted follow-up gives a refresh instruction instead of a permanent loading message. An operation already sent to the backend may still complete; these guards do not cancel a saved revision or a prepared Stripe session.

## Verification

- JavaScript syntax check passed.
- Isolated checkout: one delayed fixture call, consent/button disabled; closing the project before response prevented redirect and kept detail closed.
- Isolated checkout: ending the example session before response prevented redirect and left the dashboard hidden and detail empty.
- Isolated payment-status check: navigation to New request remained there after response, with no extra project read. Returning to My projects displayed the refresh instruction.
- Isolated revision: text locked during submission; normal completion refreshed the project and showed the existing one-revision-requested notice, with one action call.
- Isolated project read: navigation to New request before response kept the destination and detail hidden.

Tests used labeled preview-only fixtures and the actual account assets. No real Stripe checkout, payment, refund, customer message, account mutation or revision was created. No backend/payment rules changed. Domain, email and policy adoption remain deferred.
