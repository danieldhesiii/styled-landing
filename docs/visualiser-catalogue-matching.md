# Catalogue-led visualiser, 5 November 2026

The visualiser no longer has a Crescent Moon/chandelier selection control. Users
choose a style and describe their idea. Exact catalogue names/model numbers are
matched before image generation. Automatic selection ranks the eligible products
using style tags and relevant words in the description and product details. This
is deterministic catalogue retrieval followed by reference-conditioned generation,
not a newly trained image model or a separate AI product-selection service.

## Selection and identity

- Name matching is case/accent insensitive and accepts letters next to model
  numbers. It recognises the short name without the leading Vintage label.
- Named products override automatic choices in their category. A shared model
  family without an exact number asks the user to specify which product.
- Negated names are excluded. Edits can replace an inherited preview product by
  naming another preview or an eligible live lighting product.
- Exact named products that are unavailable, out of scope or missing their photo
  fail clearly instead of silently generating another product.
- Named product photos take priority within the 16-image budget. Every refinement
  reloads original product photos. Matched Crescent Moon multi-view assets remain
  an internal reference adapter, with dimensions and likeness instructions.
- No dimensions, stock, descriptions or product names are learned permanently by
  the provider. New supplier catalogue data is read by subsequent requests.

## Product cards

The reference recorded in older and newer look reports is included in the usual
Pieces from this look cards. Clicking a card photo/name opens ProductDetails.
Clicking a reference in the image summary opens the same product details.
Preview photography is contained rather than cropped. Pricing distinguishes a
mock complete daily total from a real quote and a price-on-request listing.
Demo items support the existing private board workflow, not real booking or false
stock availability. The broken database-favourite action is not offered on demo
cards because those temporary identifiers are not product UUIDs.

## Boundaries and checks

Orderable catalogue composition still enforces date, quantity, supplier and venue
rules. Preview references are allowed only on unrestricted development looks;
their identifiers are never inserted into orderable render item_ids or orders.
The prior explicit-reference API field remains compatible with saved/test clients,
but is not sent by the visualiser UI. Prior measurement metadata remains readable;
there is no special chandelier UI. Scale and precise visual likeness remain
illustrative and require further supplier review.

Verification includes matching and ambiguity tests, stock/scope rejection tests,
photo-budget and missing-photo tests, request tests for automatic/named selection
and replacing an inherited preview with a live product, plus legacy product-card
resolution. Real API/browser visual review is recorded separately after deployment.

## Browser verification

Two real image requests were completed on the development site:

1. A Classic Elegance brief requesting crystal lighting, without a specific model,
   selected Marie Therese 100. Its normal product card was shown beneath the image.
2. A text refinement requesting Empire 200 and Oak Crossback Chair selected both
   exact catalogue names and supplied their photo references. The new version's
   recorded products contained the chair and Empire 200. Clicking Empire 200 in
   the image-reference summary opened ProductDetails and the existing board picker
   (Luxury board listed). No real supplier booking or board mutation was submitted.

Testing also identified that a named chair must replace other chair-slot products
rather than all furniture. The corrected slot-based logic retains tables and is
covered by a regression test. Supplier reference photos now have a separate demo
photo disclosure instead of being labelled synthetic seed imagery.

Final verification: 331 automated tests passed, TypeScript checks passed and the
production build passed. These tests establish product routing and interactions;
they do not certify pixel-exact likeness or true-to-scale geometry. The two image
requests preceded the final slot-preservation/disclosure patch; those final fixes
were verified by automated tests and do not change the image-provider adapter.

## Fully automatic size handling

Following the user's clarification, customers are not asked to select a chandelier,
enter room/chandelier heights or adjust suspension. New looks and edits use an
automatic physical-size instruction across all product categories. It prioritises
catalogue dimensions, relative product sizes at a common depth, room perspective,
placement and realistic shadows/reflections. It prohibits shrinking products to
fit the composition or changing the building to make products fit.

Legacy manual chandelierScale inputs and inherited values are ignored for new
requests. Historical records remain readable, but those values no longer steer
new images. True scale is not certified from an unmeasured photograph. A future
verified-scale workflow needs venue measurements/calibrated placement supplied
behind the scenes, rather than exposing measurement controls to customers.
