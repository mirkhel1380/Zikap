# Platform research and customer workspace changes

Reviewed 2026-10-30. These are independently implemented patterns, not copied UI, assets, claims, or code.

| Reference | Observed capability | Relevant Zikap implementation | Remaining integration gap |
| --- | --- | --- | --- |
| AIOSEO | Actionable audit tasks and Search Console statistics | Request preparation checks; a free local CSV performance explorer with real imported row metrics, search, sorting and export | No live site-wide crawler, WordPress plugin, direct Search Console connection or continuous rank monitoring |
| Easy Ads for Shopify | Guided setup; simple navigation through a complex service | Focused workspace navigation and a live request-readiness checklist | Advertising is outside the current SEO service scope; no Meta campaigns or automated ad spend |
| wetracked Pulse | Central summary, organized reports, search and filters | Project summary cards, current status breakdown, recent project list, latest saved updates, report library; imported search data filtering | No ad attribution, store tracking, marketing pixels or live campaign metrics |
| Outrank | Content planning and CMS integrations | Existing free content planner is directly accessible in the dashboard tools section | No AI article generation, CMS publishing, automated backlinks or keyword data API |

`qutrank.so` did not produce an authoritative matching result in two search engines. `outrank.so` was reviewed only as a likely interpretation, not a confirmed correction from the user.

## Primary sources

- https://aioseo.com/features/seo-audit-checklist/
- https://aioseo.com/docs/using-the-search-statistics-in-all-in-one-seo/
- https://help.easyadsapp.com/hc/easyads/articles/getting-started-with-easy-ads-for-facebook-ads
- https://help.wetracked.io/en/article/pulse-dashboard-by-wetrackedio-1p6oxou/
- https://www.outrank.so/
- https://support.google.com/webmasters/answer/7576553?hl=en
- https://support.google.com/webmasters/answer/12919797?hl=en

## Data and scope

Dashboard counts and its report donut use loaded customer orders. The update feed shows one current saved update per project, not a fabricated event history. Empty accounts show zero counts and a usable starting point. Search CSV processing is entirely local and free. It supports one English Queries or Pages file, one period, at most 1 MB and 5,000 rows. It does not accept comparison exports. Search figures summarize matching imported rows; they are not full-property or live figures. CTR is computed from summed row clicks/impressions. The position summary is weighted by row impressions, not asserted to match Search Console's property-level total. Only the first 100 matching rows are rendered; export includes all matching rows. Text uses DOM textContent, CSV export neutralizes formula prefixes, and the import clears on reload/sign-out. No new third-party access or scripts were connected.

Existing account authentication, authorization, packages, delivery, revisions and payment guards remain server controlled. No production signup, new order, charge or refund was performed during this redesign. Browser QA uses isolated fictional accounts and projects.
