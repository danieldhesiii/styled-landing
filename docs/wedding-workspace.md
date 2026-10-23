# Wedding workspace, delivery and discovery

## Delivered scope

- My wedding keeps an account-owned venue choice, name, postcode, guest count, budget, wedding date, delivery preference and private photo selections. An existing venue never becomes a public partner listing.
- Delivery defaults to the wedding day. Unchecking Same as wedding day allows an earlier delivery, including Saturday setup for a Sunday event. The same values flow through catalogue, basket, visualiser and checkout.
- Private boards collect catalogue references, uploaded inspiration, notes and saved AI render references. Board changes save to the account; real products can be added to the basket independently. Inspiration and AI previews are labelled as illustrative.
- Wedding details use an explicit Save wedding details control. Account-scoped local drafts preserve unsaved details against the same server revision; a newer server revision takes precedence. Stale server writes return 409 instead of overwriting another device.
- Private images reuse the existing normalisation, metadata stripping and owner-scoped storage. Signed URLs are refreshed on account load and not stored in workspace JSON. Detaching a venue angle does not delete a board image.
- Postcode search and optional current-location matching return approximate distances. Exact business postcodes stay staff-only. Current device location is not persisted to the couple's account.
- Staff record confirmed venue locations and supplier base postcodes, delivery radii or nationwide coverage at `/admin/locations`. Unknown coverage is labelled rather than invented. No fictional location records are published.
- Delivery coverage is a business-stated radius, not a delivery-slot or fee guarantee. Distance uses a straight-line approximation. Saved items remain visible even when outside the current delivery area.

## Stock and booking rules

Stock reservations now cover the inclusive delivery-to-wedding interval. The database checks the lowest daily availability across that interval and locks products before creating an order. A rental appearing on two days is not counted twice on a single day. Supplier/product blocks anywhere in the interval are respected. Dated orders require delivery on or before the event, within 31 days of it; longer hires need a staff conversation. Notice periods are measured from delivery.

This is not a complete hire-return model. Collection dates, turnaround buffers, delivery slots, setup access and damage terms remain to be agreed with suppliers. Do not imply availability after the event until those rules are implemented.

Checkout continues to create a request, not take payment. Its button now says Request this design and its deposit is explicitly illustrative. No universal four-week balance rule, 40-50% deposit or damage penalty has been adopted from a single interview.

## Data and access

Only Wedding Planner Dev (`qkyeitvwscrxbiwamxan`) was changed. The original production database was not changed.

- `wedding_workspaces`: owner-only RLS for reads and writes, explicit grants, bounded JSON, server validation and optimistic revisions. Photo/render references are checked against the current owner before saving.
- `discovery_locations`: no client grants or policies, server-only access. Public discovery returns rounded distances and coverage labels for active listings only. Staff APIs check staff membership and same-origin writes.
- Existing service-only availability functions remain unavailable to client roles.

New migrations:
- `20261023050421_wedding_workspace_and_delivery.sql`
- `20261023051005_location_matching.sql`

The unrelated basket-hold migration and nested styled-landing checkout were not included.

## Supplier interview implications and next decisions

The retired supplier is an advisor, not a sales prospect. Her experience suggests testing with a venue, a DIY couple and a small supplier group, including more established hire businesses. A low-effort workflow and clear treatment of completed sales matter more than a complex portal.

Before expanding supplier operations, confirm stock spreadsheets/imports, external bookings, shared/lent stock ownership, delivery coverage and charges, setup/collection, cancellation, substitutions, settlement timing and who bears damage risk. Lending from another supplier cannot be treated as owned live stock without their confirmation.

Her 40-50% reservation deposit, balance four weeks before the event, per-item breakages deposit and penalties are interview benchmarks only. Obtain written terms per supplier and decide the platform policy before coding them into checkout. Commission should apply to agreed completed bookings; explicitly decide how cancelled/refunded orders affect it.

## Payment milestone

Payments follow confirmed booking and commercial rules. Compare current UK processing, marketplace payout, refund, dispute, international-card and fixed-transaction fees before selecting a provider. Do not assume a free payment gateway, onboard a payment account or activate live charging from the interview notes. Implement hosted payment pages and verified webhooks, then test deposit/balance/refund/damage flows in test mode before enabling money movement. The present preview does not collect card details or charge funds.

## Verification

- All 14 automated tests passed, including date coupling, invalid and oversized intervals, workspace validation, stable saved-state fingerprints and distance calculations.
- 24 HTTP checks passed for private account persistence, stale-write rejection, cross-site writes, owner-scoped uploads/references, date intervals, staff access denial and real postcode lookup.
- Browser checks covered private wedding refresh, the same-day checkbox across catalogue/checkout/My wedding, board creation/product/note saves, basket insertion, contextual help and 390px layout without horizontal overflow.
- Final production build passed. No paid generation, live customer order, supplier notification or payment was triggered. Disposable customer accounts and their test images were removed.
- `supabase/tests/wedding_workspace_delivery.sql` checks owner isolation, forged owners, overlapping rentals and delivery-day blocks inside a rolled-back transaction.
- Security advisors report no new warning-level findings. The server-only locations table deliberately has RLS without client policies, like existing service-only tables. See [Supabase server-only RLS notice](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
- Existing staff-helper and leaked-password notices are unrelated to these changes.
- Staff access restriction is checked with an ordinary account. A privileged test account was not created because automatic approval review rejected that grant.

Reference for postcode lookup: [Postcodes.io API](https://postcodes.io/docs/api/lookup-postcode/). No paid location dependency or new package was added.
