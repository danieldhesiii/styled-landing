# Crescent Moon photo reference library, 5 November 2026

Current customer flow: [catalogue-led selection](visualiser-catalogue-matching.md).
The dedicated product selector and measurement panel described in the historical
checks below have been replaced by catalogue/style matching and normal product cards.

All 16 supplied photographs were reviewed against the 24-page brochure and imported into a private reference library. Nine photographs have visual model matches; seven are retained for supplier identification and are excluded from generation. These visual matches are editorial assessments, not supplier confirmation.

Each new development look sends the selected model's primary image plus all matched additional views. The primary image and brochure dimensions determine identity and scale; installed views and detail views supplement appearance. Image labels identify the same product in each view and explicitly exclude people, backgrounds and unrelated chandeliers. Refinements resend the original matched photos to reduce drift. The request stays within 16 total image inputs; if the full reference set cannot fit, the user must reduce their venue/inspiration selection rather than silently losing chandelier views.

This is reference conditioning, not permanent training or fine-tuning. A multi-view library cannot guarantee exact geometry, crystal counts or proportions. The initial library import did not include a paid visual generation. Follow-up browser tests are recorded below; supplier likeness approval is still outstanding. Evaluate a new look and refinement for each model with Simon before describing results as accurate. Public-domain production publication remains a separate release.

## Photo decisions

| Original photo | Matched model | Decision / instruction |
| --- | --- | --- |
| 1a.jpg | necklace-empire-180 | Primary isolated product view |
| 1c19fb62-18b1-4b80-bdb8-6b60f52fe876.JPG | Unconfirmed | Mixed designs, uncertain size, or French standard/vintage variant. Do not send as a product reference until Simon identifies the model. |
| 2m Empire Set .jpg | empire-200 | Foreground chandelier, lit; ignore other chandelier designs in background |
| 2m Set 2.jpg | empire-200 | Foreground chandelier, unlit; ignore other chandelier designs in background |
| Clair-Paul-Wedding-Chloe-Lowe-Photography-738.jpg | Unconfirmed | Mixed designs, uncertain size, or French standard/vintage variant. Do not send as a product reference until Simon identifies the model. |
| DSC00326 copy 2.jpeg | marie-therese-150 | Front view; matches brochure page 10; ignore workshop and people |
| IMG_1934-edt.jpg | necklace-empire-180 | Installed view of necklace design; ignore flowers, room and other decor |
| IMG_4861 copy.jpeg | Unconfirmed | Mixed designs, uncertain size, or French standard/vintage variant. Do not send as a product reference until Simon identifies the model. |
| IMG_5835-edt.JPG | necklace-empire-180 | Installed necklace design; ignore people, room and other decor |
| Marie 100 Silver .jpg | marie-therese-100 | Primary isolated product view |
| Old Billingsgate-29052022-005.jpg | necklace-empire-180 | Central in-focus necklace chandelier only; ignore foreground and background chandelier designs |
| Screenshot 2022-09-16 at 14.36.17.png | Unconfirmed | Mixed designs, uncertain size, or French standard/vintage variant. Do not send as a product reference until Simon identifies the model. |
| Screenshot 2023-01-11 at 14.53.26.png | Unconfirmed | Mixed designs, uncertain size, or French standard/vintage variant. Do not send as a product reference until Simon identifies the model. |
| Screenshot 2024-12-10 at 10.18.28.png | Unconfirmed | Mixed designs, uncertain size, or French standard/vintage variant. Do not send as a product reference until Simon identifies the model. |
| Screenshot 2024-12-20 at 12.19.08.png | Unconfirmed | Mixed designs, uncertain size, or French standard/vintage variant. Do not send as a product reference until Simon identifies the model. |
| _ALX8602 copy.jpg | necklace-empire-180 | Detail of outer candle lights, gold rim and crystal necklaces only |

## Selection and likeness correction

A follow-up investigation found that the selector was sent only on new renders.
Tweaks inherited the previous model, so a newly selected chandelier could be ignored.
The selector now follows the displayed version, and an explicit Apply chandelier
button edits that version using the selected original photos. Switching models,
inheriting a selection during ordinary tweaks and explicit removal are covered by
request-level regression tests. Supplier and venue restrictions still apply.

For chandelier renders, inputs are ordered as the primary venue view, product
photos, supplementary venue angles and private inspiration. Prompt image numbers
follow that order. Product construction, metal finish and brochure proportions
now take priority over mood styling and existing decorative ceiling fixtures.
Chandelier requests use high output quality; ordinary renders keep their configured
quality. This can increase the cost and duration of chandelier generations.
Missing API configuration produces a clear error for selected-product requests
rather than presenting an unrelated sample image.

These changes improve conditioning and fix selection behaviour. They do not provide
pixel-exact product reproduction. Generated outputs must still be checked against
the supplier originals, particularly crystal arrangements, arms, silhouette and scale.


## Follow-up browser verification

The development deployment for commit 31bd22e was tested in the signed-in customer
visualiser with two real generation requests:

- Applying French Crystal Empire 105 to an existing look replaced an unrelated
  open ring chandelier with a tapered crystal body and lower basket. The resulting
  look report recorded French Crystal Empire 105.
- Switching that version to Marie Therese 100 replaced the Empire form with the
  tiered candle-arm silhouette and crystal drops. The resulting look report
  recorded Marie Therese 100, and both test versions remained available.

These checks confirm selected-product routing and a visibly closer model family,
not exact crystal geometry, bulb count or measured installation scale. The four
other models and first-generation-from-venue workflows still need visual likeness
review with Simon. Automated checks: 317 tests passed, TypeScript passed, production
build passed. The live styleduk.com site was not changed.

## Scale guidance, not true-to-scale placement

The supplier dimensions alone do not calibrate a perspective photograph. Existing
renders must not be described as true to scale. In particular, a chandelier's
apparent size depends on where it hangs relative to the camera.

The development selector now includes a brochure-size diagram against a metre
ruler, and optional ceiling height at the hanging point plus extra suspension
drop. Both measurements are required together; unknown values remain blank.
The floor clearance calculation assumes brochure drop is fixture height and
excludes extra suspension, which Simon must confirm. It is not an installation
or safe-headroom assessment.

Measurement guidance and local world-space ratios are sent on both new renders
and edits. The values are saved in each look report, restored with that version,
inherited by API clients that omit them, and removed when explicitly cleared.
Measurements that would put the fixture at/below the floor are rejected before
starting an image job. Unknown room dimensions are never fabricated.

This remains an approximate AI composition, not calibrated placement. Reliable
true-scale venue visualisation would need measured room geometry, a calibrated
camera/viewpoint, a specified hanging position and a dimensioned product asset
in a placement/compositing workflow. Neither the new numeric guidance nor the
comparison diagram proves the generated pixel size matches those measurements.
