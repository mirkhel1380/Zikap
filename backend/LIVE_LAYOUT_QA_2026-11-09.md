# Live public layout review — November 9, 2026

The user requested the next section of the remaining-work list: public/mobile layout and navigation review. The prepared policy publication remained blocked by automatic approval review; this layout release contains no policy pages, policy links or policy activation.

## Findings and scope

All fifteen currently indexed public pages were loaded from the live GitHub Pages site in a 375 px iframe. Body widths alone appeared correct. A separate document-root check found pricing.html extending to about 845 px despite a 360 px root client width; the other fourteen pages had equal root/client widths. The pricing comparison's absolutely positioned screen-reader labels used the document as their containing block and escaped the table's scroll area.

The fix adds `position:relative` to `.comparison-scroll`. The hidden labels remain in the accessibility tree, inside the independently scrollable table container. No global overflow suppression is added. The table retains its 920 px content width and all four packages.

The published pricing HTML is derived directly from main at 5d252e079ffa619dc2ec9e3a01868540d8eea109. Its only change is package-comparison.css v1 to v2. It does not include the locally prepared policy-footer changes. The stylesheet adds only the containing-block rule.

## Verification

- Live 375 px review: fifteen page headings loaded; no broken completed images observed on the thirteen inner pages checked; fourteen root/client measurements matched and the one pricing overflow was reproduced.
- All fifteen pages also received a 768 px body-width check, with no body overflow. Root-level and interactive findings are not inferred from those body measurements.
- Fixed source preview: 375 px viewport produced root/client 360/360; 768 px produced 753/753. Table content remained 920 px wide. The comparison still scrolls independently.
- The live mobile menu opened with visible grouped links. No orders, messages, payments, AI checks or registrations were submitted.
- Existing public metadata/local-link checker passed on the workspace. The outgoing pricing payload is additionally checked to differ from its exact main source only in the stylesheet version.

This is a browser/layout review, not certification of every device or all assistive technologies. Policy publication is a separate blocked operation and is not bundled into this fix.
