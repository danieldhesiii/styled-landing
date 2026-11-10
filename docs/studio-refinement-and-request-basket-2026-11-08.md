# Styled studio refinement and request baskets, 8 November 2026

Development only: styledukprodprogress / Wedding Planner Dev. No public-domain release or payment activation.

## Changes

- Browse products from Visualise clears the previous product/detail handoff and opens the catalogue, retaining useful filters. Regression checks cover stale product and preview parameters.
- A single compact studio header contains the main destinations. Event switching, countdown and save controls share a slim row; checkout keeps a clear route back. Saved views no longer repeat their heading and preview toolbar.
- The visualiser uses a compact three-stage progress rail and removable thumbnail chips. Active/completed stages and next actions are clearer, and opening selection/style controls does not trigger generation.
- Product/detail panels, navigation and dialogs use restrained transitions. Motion respects reduced-motion preferences. Existing colours, typography and supplier photography are retained.
- Development chandelier references can be added from generated-look product cards and product pages to a request basket, including price-on-request items. Known estimates match the listing breakdown. Unknown amounts are represented as awaiting a quote, not free products.
- Server-owned request snapshots preserve product identity, quantities, requested dates and pricing state without publishing fictional suppliers/products or pretending stock is confirmed. Mixed requests retain their normal catalogue lines. Request-only lines cannot become paid/confirmed bookings or acquire payable quotes until linked to verified products and agreed terms.
- Customer and staff request views retain unpriced lines and display their quote status. There is no payment collection in this request flow.
- Supplier visibility controls return the canonical database state and show success/errors beside the control. Approved suppliers can pause/reactivate. Unreviewed suppliers show the required review path; new admin suppliers start private.

## Supplier activation finding

All 12 inspected development suppliers lacked review records. The database requires approved listing/image permissions before reactivating an inactive supplier. This is why older seed suppliers can pause but cannot simply reactivate. The previous API also returned success without exposing trigger-adjusted visibility. The fix makes these outcomes explicit; it does not invent supplier consent. See `admin-supplier-toggle-fix-2026-11-08.md` for the rollback-only hosted proof.

## Design references

Official Conran Shop, 1stDibs, NET-A-PORTER and THE WED navigation/content patterns informed the hierarchy. Source links and observations are in `luxury-ux-review-2026-11-08.md`. No brand assets or partnership claims were copied.

## Verification

Final automated and deployment results follow below. No paid image generation or full-site mobile/browser certification is implied. The request-only flow remains a development demonstration of manual quotation, with server-side booking/payment guards.

## Final checks before deployment

- Full suite after review follow-ups: 429 tests passed, zero failures/skips. TypeScript and whitespace checks passed. The full production build passed at the preceding 426-test checkpoint; deployment builds all final source again.
- Development request snapshot migration applied only to Wedding Planner Dev and verified with a rollback-only hosted fixture. No fixture records or outgoing supplier notifications remain.
- Hosted supplier fixture confirmed approved pause/reactivation and accurate post-trigger visibility; legacy/unreviewed activation remains blocked with a clear review route. No real supplier was changed.
- Review follow-ups corrected rail navigation to reset old tweak text through the existing New handler, and basket wording now distinguishes included package charges from unquoted costs.

## Deployed verification

- Source release `77949a1` is deployed and Ready on `https://styledukprodprogress.vercel.app`. The public `styleduk.com` site was not changed.
- Read-only smoke checks covered 45 routes: 17 returned 200 and 28 returned the expected access/sign-in redirect. No route failed.
- Signed-in Chrome verification confirmed that Browse products leaves a stale product URL and reaches `/design?tab=catalogue` with All pieces selected.
- French Crystal Empire 105, with price on request, could be added to the basket and taken through to the supplier-request form. The summary retained the product and showed Awaiting quote rather than a zero price.
- Marie Therese 100 could be added directly from Products from this look. Its basket package estimate matched the displayed one-day total of £375.
- Selection-stage navigation opened style controls without generating an image. The existing three preview selections and image version were preserved.
- No request was submitted, no payment or image generation was triggered, and both temporary basket additions were removed. The customer's basket returned to its original zero items. No browser console errors were captured during these checks.
- A screenshot of the deployed visualiser is saved locally at `/tmp/styled-studio-refinement-2026-11-08.png`.
