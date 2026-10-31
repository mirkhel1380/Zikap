# Public website check

POST /website-audit accepts JSON `{"url":"https://public-site.com/","consent":true}` from the configured marketing origin or Worker origin. No account is required. The existing D1 rate_limits table is required; no migration or credential is added. Health exposes websiteAudit readiness.

## Scope and safeguards

- Maximum three pages, 512 KiB decompressed UTF-8 HTML per page, 128 KiB robots policy per origin, 20-second network deadline and 24 outbound requests including DNS. Three redirects maximum per resource; manual redirects are revalidated.
- Public HTTP/HTTPS domains with standard ports only. Userinfo, queries, literal/obfuscated IPs and reserved/local domain suffixes are rejected. Cloudflare DNS-over-HTTPS validates A/AAAA and CNAME answers before resource requests; private, link-local, loopback, documentation and other special-use addresses are rejected.
- DNS preflight is not IP pinning. The deployment uses ordinary Cloudflare Workers fetch with public-network egress restrictions; do not add VPC/Tunnel/private network access to this Worker without reviewing the SSRF boundary. No caller headers, cookies or authorization are forwarded.
- Robots rules are fetched before HTML, including redirected origins. Specific ZikapBot groups, longest allow/disallow, wildcards and end matches are honored. Unavailable robots fail closed except 404/410. Crawl-delay or nofollow limits analysis to the submitted page.
- Only same-origin safe internal links are sampled. Query links, common assets and account/transaction paths are skipped. Verification/challenge pages are rejected rather than scored as SEO defects. Other inaccessible samples are shown as coverage limits.
- Five attempts per IP/hour, six per target host/hour, sixty globally/hour. Public checks write only rate-limit counters; reports and downloaded source HTML are not stored in D1. HTML is parsed inertly, never executed or sent back raw. Deployment observability remains disabled.

## Findings and service matching

The checker observes titles, descriptions, headings, image alt attributes, document language, canonical declarations, indexing directives, HTTP transport and sampled broken links. Context-dependent findings are labeled as reviews; noindex, multiple H1s, cross-origin canonicals and duplicate titles can be intentional. Missing canonicals are not treated as defects.

Supported title/description problems can suggest the existing on-page package. Technical signals can suggest the existing technical review, with the need for human context stated explicitly. Every suggestion cites actual finding IDs and uses server catalog prices. Keyword research and bundles are not automatically recommended from HTML. Clean supported checks have no paid suggestion.

No Google indexing status, rankings, traffic, speed, keyword volumes, backlinks, JavaScript execution or full-site coverage is claimed. The initial check is free. Specialist packages remain manual one-time work at their current prices; no trial, recurring charge, automatic acceptance or payment activation is introduced. Account links prefill intake only.

## Validation

Node tests use native Miniflare HTMLRewriter and isolated network responses, with SQL-backed quota tests. The complete suite has 85 passing tests. Browser QA used fictional responses to exercise three-page findings, one-page clean results, download controls, correct account handoff parameters and a 375px content viewport without horizontal overflow. Fixture QA does not prove that an arbitrary public website permits server requests. Production validation should check health and submit an authorized public URL through the deployed form; blocked or unsupported websites must return honest errors or coverage notes.

Production verification on 2026-10-31: GitHub Pages and Cloudflare Builds completed successfully. The deployed public form fetched the actual Zikap site and analyzed three pages. It returned two context-dependent duplicate-title observations and no paid recommendation. No test order, customer account, message or payment was created. A browser download-event check timed out, so the actual exported file remains unverified; the control and generated text path were inspected.
