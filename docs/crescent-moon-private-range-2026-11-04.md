# Crescent Moon private starter range

Development only. Staff > Suppliers > Review Crescent Moon’s six draft listings.
URL: /admin/suppliers/crescent-moon-preview. The parent staff layout protects
the page; the image route separately requires verified staff and uses a manifest
allowlist. Images are bundled under private/, never public/. The development
GitHub repository was verified private before adding these assets.

Simon’s message says four but names six: Empire 90, Marie Therese 100 and 150,
Empire 200, French Crystal Empire 105 and Necklace Empire 180. All six are prepared.
Descriptions are editorial drafts based on the supplier photographs and supplied
brochure. Dimensions, weight and bulbs are brochure values, awaiting confirmation.
Brochure stock counts were deliberately not imported as date availability. Supplier
prices, service costs, install approval and permissions remain unconfirmed. The
private visual mockup displays one-day example pricing on four cards. Each breaks
out daily hire, delivery/setup/collection and a refundable damage deposit, then
shows the total amount due including the deposit. The example figures assume VAT
included for demonstration; supplier VAT treatment and all actual charges remain
unknown. Two other cards show “Complete price on request,” with the breakdown
required in the final quote. All sample amounts are invented mock data, not
Crescent Moon prices, quotes, catalogue records or booking prices. Underlying
supplier prices remain unset.

Published UK comparators show chandelier-only rates vary widely and use different
hire periods: Cinemattag lists £90/week at 95 cm, £270/week at 150 cm and
£450/week at 210 cm, excluding VAT, delivery and installation; Abacus publishes
£40 for a standard chandelier and £95 for a large 12-arm crystal chandelier.
These are context only, not direct day-rate comparisons. A public chandelier
installation cost guide gives £80–£210 for a straightforward domestic fitting;
event rigging, transport, venue access and crew can change this substantially.
The mock one-day values are therefore layout examples, not a claimed market rate.

Primary sources are the 4 November upload directory and its wedding brochure.
PDF pages 3, 9, 10, 5, 15 and 13 respectively identify the products. Brochure
embedded photos are used for Empire 90, Marie Therese 150 and French Crystal
Empire 105; the other primary images use named/matching supplied photographs.
The French screenshots appear closer to the vintage variant, so the labelled
standard brochure image is used and Simon must confirm the intended variant.
Other unmatched event images remain in the source folder rather than being
assigned to a model by guesswork. Wedding guests/photographer credits in event
images are not copied into the review gallery.

A standalone, self-contained HTML review and a JSON manifest are saved alongside
the original upload in “Styled Crescent Moon Review”. The shareable HTML presents
the six products in a responsive Styled catalogue layout, keeps one concise note
that example prices need Simon's confirmation, and includes a short review list
with a prefilled feedback email. It contains embedded supplier photographs, so
share it privately with Simon rather than publishing it publicly.

## Visualiser changes

Generation now names each successfully loaded product reference in input-image
order, including offsets for venue photos. Missing photos cannot shift a label
onto the wrong product. Product dimensions and materials, when available, are
included in the inventory prompt. Instructions distinguish product silhouette,
metal finish, crystal arrangement and proportions, and reject blending designs.

This is reference-image conditioning, not training or fine-tuning. The private
preview does not add draft products to the customer catalogue or bypass existing
publication/AI-permission checks. No image-generation API call or paid training
job was made for this change. After Simon approves identities, permitted image
uses and range details, use the existing supplier product/review workflow to
load and approve actual products; then test one model at a time in the visualiser
before mixed looks. Check silhouette, finish, dimensions/scale and crystal
pattern against the original, and record supplier feedback. Refinements need
their own product-likeness evaluation, not just initial-render approval.

Official reference-image editing documentation:
https://developers.openai.com/api/docs/guides/image-generation

## Next supplier confirmation

Confirm photo/model matches (especially French standard/vintage), current
specifications/finishes, hire price and VAT, date-check contact, delivery/setup/
collection pricing and coverage, rigging/site checks, installer choice, terms,
public-listing permissions and separate AI-reference permissions. Use a manual,
no-payment request and full quote for the first rehearsal.
