# Request preparation validation

November 8, 2026.

The customer New request form now checks the actual supplied page count, complete HTTP/HTTPS URLs, embedded credentials and exact website origin (protocol, hostname and port) before marking its preparation checklist ready. On-page allows three supplied page URLs; the other packages allow five. Keyword reference pages remain optional; other packages require at least one page. Whitespace-only required topic/language/market/goals fields are invalid. Inline messages reference their fields through aria-describedby and set aria-invalid when displayed; native validation focuses an invalid field when submission is attempted.

Page hints show supplied count and the package limit. This is local form validation only; it performs no fetch of the submitted website and makes no claim that the website has been audited. Server validation remains authoritative and unchanged. Existing order requests, quotes, scopes and prices are unchanged.

Account catalog loading now validates four unique allowed IDs, whole USD prices 1–9,999, nonblank titles/summaries and nonnegative safe-integer versions before using a quote. Invalid data clears the current quote and all option prices. Reloading invalidates the previous quote while loading; a request sequence guard ignores older catalog responses. Failed/stale quotes cannot be used by the form. Existing server catalog-version checks remain in place.

Validation completed:

- Four new Node tests exercise all package rules and match accepted/rejected URL, count and required-text cases against the real server validateOrder function. Catalog tests cover missing, duplicate, unknown, null and malformed entries, price limits, versions, and legacy version zero.
- Those four tests and all ten account tests passed (14 total). JavaScript syntax checks passed. No backend route/schema was changed.
- Actual customer assets with isolated fetch fixtures: four pages in On-page showed the three-page limit, focused the invalid field and sent zero submission calls. A different-origin page showed a line-specific error and zero calls. Correcting the pages made the checklist ready; one valid fixture submission reached the stub, and its simulated failure retained the form and retry guidance.
- Keyword empty reference pages remained valid; a whitespace topic remained incomplete until corrected.
- A duplicate-ID catalog showed all prices unavailable. Completing a valid brief still sent zero calls and displayed the load-current-price message.
- Mobile iframe 390 px: body client and scroll widths both 375 px; line-specific errors remained visible without horizontal overflow.

No production orders, payments, support messages or website checks were created for verification. Domain and email setup stay deferred.
