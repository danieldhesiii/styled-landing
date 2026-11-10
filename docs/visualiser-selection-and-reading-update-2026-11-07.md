# Visualiser selection, reload recovery and text cleanup

Development only: `styledukprodprogress`, Wedding Planner Dev. Public `styleduk.com` excluded.

## What changed

- Catalogue cards and full product details now expose Select for preview / Selected as controlled toggles, including supported development reference listings. These use event-owned preview product IDs, independently of the basket.
- The visualiser has Choose products and Choose for me modes. Manual mode uses selected product records/reference images; auto mode matches catalogue products to the description/style. Switching modes retains manual choices. The preview selection is not a reservation or order.
- Selections and mode persist in the existing event workspace JSON and in a verified local draft. Public product preview links enter the same selection flow without invoking basket addition. Product cards below a generated image also support preview selection.
- Manual generation validates IDs, does not silently substitute selected products, fails clearly on missing required references and preserves reference metadata. Unsupported reference combinations are blocked before generation. Existing venue/supplier/image permission and development-only reference boundaries remain enforced.
- Customer reload/leave warnings now apply only when edits are genuinely unsaved and a verified recovery draft cannot be retained. Venue editing compares actual form values with the saved baseline, including a return to original values; real unsaved venue edits remain protected.
- Shorter default-visible copy across public, customer, supplier, venue and staff screens. Repeated notices, unknown specification rows and empty-review notices are removed. Secondary guidance is in native disclosures or Help. Prices, fees, supplier conditions, consent, operational warnings and errors remain accessible.
- Account/recovery and contextual help copy are shorter and describe preview selections separately from basket choices.

## Audit evidence

The public/business sweep scanned all existing TSX files for long visible paragraphs and inspected owned content arrays. It is a source audit, not a claim that every authenticated screen was visited. See `text-simplification-2026-11-07.md` and `staff-text-simplification-2026-11-07.md` for file-level findings.

Direct native Chrome inspection confirmed the old live-development product page had no preview selector and repeated five missing-specification notices. The browser later returned no available window, so the complete interactive hosted/mobile walkthrough is not certified.

Independent integration review identified a venue-scope race when consuming preview links and sample-venue image restoration on remount. Both were assigned for correction before release.

## How to check the new flow

1. Open the development site in a fresh tab, then Catalogue.
2. Choose Select for preview on a product photograph/card. The control changes to Selected; basket count stays unchanged. Select further supported products.
3. Open Visualise selected. Review the product thumbnails, add your venue image and describe the scene.
4. Switch between Choose products and Choose for me. Switching back retains your manual selection.
5. Reload or switch events and return. The correct event's selection and venue should return. Routine recoverable planning edits should not show a leave/reload warning.
6. Generate only when ready to spend a render. Check the original product cards and reference images against the result; add items to Basket separately.

## Verification limits

A selected-product pipeline can be tested deterministically. AI-generated product likeness and scale cannot be guaranteed exactly on every output. No paid generation or claim of a 100% visual match is part of this release. A permissioned real-image review remains a separate check.

Full-check and deployment results are recorded after final integration below.

## Final integration review

- Venue-scoped preview links now wait for the matching loaded catalogue before consuming the selection.
- Example venue selection derives its display image from the persisted venue ID, so reload and event return retain the correct image.
- Customer recovery drafts retain all events, selections and render IDs. Storage failure is tested; the protective warning remains only when changes cannot be recovered.
- Manual preview selection and below-preview details use the same preview IDs; no basket IDs are inferred. Public `preview=<id>` handoffs never invoke the basket-add handler.
- Final automated suite: 403 tests passed, zero failures or skips. The parent runs TypeScript and the production build as part of the same release check.

The last UX correction makes changed products or selection mode reopen the generation controls in New mode, retaining the existing image/versions and never starting a paid request automatically. Stable selections and a completed render do not reopen the controls. Supplier CSV import and calendar guidance also received the same concise-copy treatment in the final pass.

Final source verification after all follow-ups: 404/404 full-suite tests passed with zero skips/failures; TypeScript and diff whitespace checks passed. The earlier full production build passed; the final development deployment rebuilds the complete source again.

## Hosted verification recorded 8 November 2026

Release `e7d04bc` was pushed to the development repository and deployed Ready as `dpl_BRVo7WBMxVGPsSszvVaB6FWggWz1`, aliased to `https://styledukprodprogress.vercel.app`.

Direct Chrome checks on that release confirmed:
- Gold Chiavari Chair has a visible Select for preview control. Clicking it marks the product Selected and shows one preview product while Basket stays at zero.
- Visualise selected opens the correct chair reference and the generation controls. No image request starts automatically.
- Reload completed without a leave/reload warning; the selected chair and original event/render returned, with Basket still zero.
- The product details no longer repeat missing specification rows or empty review notices. Image information is available under its disclosure.

Read-only smoke checks covered 45 non-parameter page routes: 17 returned 200 and 28 returned sign-in/access redirects (307), with no request errors or server failures. These checks do not certify every authenticated staff interaction or every mobile layout. No paid generation or actual likeness/scale assessment was performed.

The public domain and live repository/database were not changed. GitHub contains all runtime changes; this follow-up records the observed release evidence.
