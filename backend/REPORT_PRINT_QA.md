# Customer report print verification

Reviewed November 7, 2026. No production reports, customers or payments were created for these checks. The original SVG logo is unchanged.

## Behavior

The customer account’s Report library and project report viewer share `report-reader.js`. A4 and Letter are available in the reader toolbar. Printing still opens the browser’s native print flow; the customer selects Save as PDF where supported. Browser margin-box support determines whether the custom running header and page numbers appear. The toolbar explains how to avoid duplicate browser headers/footers.

`report-layout.mjs` formats recognizable plain-text headings, preserves original source text for text download, and uses textContent for all report strings. It never interprets supplied HTML or loads report-supplied images. Long values wrap; normal paragraphs can break across pages, while headings stay with following content where supported.

Before printing, the reader creates a report-only copy outside the modal dialog. The print stylesheet renders that copy in normal document flow and hides the dialog, navigation, forms and toolbar. The copy stays hidden on screen. After printing, closing the reader or clearing the session removes the private print copy and restores the page title. A late close event cannot cancel a subsequent report opening.

## Checks completed

- Full existing backend and parser regression: 134 tests passed. New parser cases cover headings, fenced evidence, literal HTML/URLs, Unicode, long values and preservation of near-limit source text.
- Cloud browser: long/short reports, literal script/image markup (zero executable elements), A4/Letter selection, repeated close/reopen, print-copy equality and cleanup, and a 390px mobile frame without horizontal overflow.
- Isolated long fixture: 16,242 characters, 12 sections, long unbroken URL, Unicode and start/section/end sentinels. Browser-produced report markup and the actual print CSS were rendered in WeasyPrint 70 with only the local original logo allowed as an asset. The long fixture produced 8 A4 pages and 9 Letter pages. A4/Letter page sizes, every content sentinel, custom page counters, horizontal/vertical text bounds, nonempty pages and exclusion of account/dialog content were checked. All rendered pages were visually reviewed, with first/last pages inspected at readable size.
- Short fixture: complete on one page in both paper sizes, with no blank trailing page.

## Verification limit

The cloud browser’s native OS print dialog and its final Chromium PDF bytes were not automated. PDF pagination checks used a separate paged-media engine on the same report markup and stylesheet. Native print settings, browser-specific pagination, fonts and margin-box support can affect final output. The original plain-text report remains available as a fallback. No PDF-generation service, external report upload, extra billing or new runtime dependency is introduced.
