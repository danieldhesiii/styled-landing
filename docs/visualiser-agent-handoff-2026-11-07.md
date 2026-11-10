# Visualiser selection handoff — final

Owned implementation complete. Final focused suite: **53/53 passed**, including 14 visualiser regression tests. Owned-file whitespace checks passed. No Next build, paid render, commit or deployment was run in this pass; parent owns final integrated checks and release.

## Integrated contract

- `RenderStage.itemIds`: authoritative current-event preview selection, independent of basket.
- `selectionMode?: "manual" | "auto"` and `onSelectionMode?: (mode: "manual" | "auto") => void`: controlled by parent; default is manual.
- `onRemoveItem`: preview-only removal; `onBrowseProducts`: catalogue navigation. Parent wiring was verified using `removePreviewItem`, `changePreviewMode` and `previewSelection.itemIds`.
- `LookProducts.selectedVisualiserIds` and `onVisualise(item)` pass through to ProductDetails. `selectedIds` remains a compatibility alias; neither falls back to basket. Parent wiring is present.
- `/api/generate` accepts `selectionMode`, with existing `itemIds`. Older requests without a mode retain their existing composition behavior.

## Semantics and safeguards

Manual mode uses exact selected products: no automatic extras or substitutions. Conflicting named/omitted products receive an explicit correction error. Auto mode ignores saved manual IDs and ranks the full eligible catalogue by prompt/style, with existing venue/supplier, publication and date checks.

Crescent Moon reference-only products bypass stock/booking eligibility checks and retain the existing development-host, venue/supplier restrictions and permissioned reference loaders. Booking restrictions remain unchanged. Required selected/named product photos and the selected preview reference set must load before any model job is scheduled; missing references or an unavailable engine block the request.

Accepted job metadata and persisted `item_ids` include all references, including the preview-only product ID, so polling/saved versions retain accurate references. Existing tests were updated to expect complete IDs.

Multiple reference lighting designs are rejected before generation: the selection summary says “Use one reference lighting design per preview.” and disables generation. The existing 12-product limit is also surfaced before generation. No chandelier sliders/options were introduced.

One visible “AI preview” notice remains with a details disclosure. Repeated per-card image explanations were removed; useful product facts and booking restrictions remain. Sample rooms now restore directly from saved `venue.id`/SAMPLE_VENUES after reload or event return; uploads and partner images take priority. Restoration never changes the event venue.

## Verification

Final focused command covered visualiser-selection, product-matching, pilot-workflow, look-products, crescent-moon-references, prompt-assistance-limits and render-limit-failures: 53 passed, zero failures. Reference failure, unsafe preview scope, mode exactness, basket independence, forward props, early lighting limit and sample/event restore are covered. All generation/provider IO was mocked. The earlier failing details-forwarding test selector was corrected to distinguish ProductDetails from ProductPurchase.

Parent owns full check, browser walkthrough and deployment. No further owned edits are pending.

## Selection-controls follow-up

RenderStage now observes a stable signature of mode plus sorted/deduplicated selected IDs. A real selection change opens generation controls in new mode from the original venue, clearing stale generation errors while preserving the current image and versions. Reordered IDs, new array/callback instances and completed/saved render changes do not reopen controls. No request is made until the user clicks Generate. Added an effect-aware regression that starts in tweak mode, verifies switching to new mode after selection changes, checks existing-image retention and confirms render arrivals settle without a reopen loop. Parent owns the final type check/build.
