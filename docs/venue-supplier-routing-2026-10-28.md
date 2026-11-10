# Venue-led supplier and booking routes

Development only, 28 October 2026. Repository `danieldhesiii/styledukprodprogress`; database `qkyeitvwscrxbiwamxan`. The live domain and live repository are unchanged.

## Venue workspace

The existing venue portal remains separate from the supplier product portal and the customer's wedding plan. A new **Suppliers & booking** section gives each venue three choices:

1. **Our own supplier network**: show the venue's recommendations and direct couples to its team. No Styled catalogue recommendations are made for that venue.
2. **Our approved suppliers on Styled**: show only products from supplier businesses linked by Styled staff after onboarding. An empty approved range remains empty. There is no fallback to the wider catalogue.
3. **Styled catalogue welcome**: allow the wider Styled catalogue, subject to any local sourcing limit chosen by the venue.

New venue drafts start with their own network. Existing published venues without an explicit setting retain their previous open-catalogue behaviour until reviewed, avoiding silent changes to existing listings.

Venue teams maintain public supplier names, categories, towns, business postcodes and website links. Recommendations do not create supplier accounts, product records, publishing rights or access to another business's stock. Staff link verified active catalogue supplier IDs; owners cannot change those links by editing a request payload. Each supplier still manages its own inventory through its supplier account.

All listing settings remain in the existing private-draft and staff-publication workflow. A separate `supplier_policy` object is stored in the existing `venue_listings.details` JSON field. No new schema or public grants are required.

## Booking handoff

A venue can provide an optional HTTPS booking-system link and explain its process. The link opens externally. It does not reserve a date, accept a payment, synchronise a calendar or create a confirmed Styled booking. Native Styled booking/viewing requests continue to reach the venue team through the existing request inbox.

Published venue pages and confirmed customer venue requests explain the appropriate supplier route. Venue-owned routes suppress unrelated catalogue styling links and package choices. The customer studio loads a venue-scoped catalogue, with a **Venue suppliers** navigation label for restricted routes. Boards and saved data are retained; shopping uses only the current venue's eligible range. Image generation's catalogue composition uses the same server-side scope rather than filling in unrelated products. Generated images remain illustrative, especially where the venue manages suppliers outside Styled.

Order submissions from the venue journey carry the venue slug, which is checked against current published settings. Disallowed products are rejected before order creation. The verified venue name and route are recorded in the request. General shopping without a partner venue remains available as before. This is venue-specific routing, not an account-wide restriction on unrelated events.

## Geography

A venue can specify a catalogue supplier radius from 1 to 300 miles and publish local sourcing guidance. Matching uses existing verified `discovery_locations` coordinates. Products from unverified locations or outside the radius are excluded; published supplier delivery radii are respected. If the venue has no verified coordinates, radius-based shopping fails with guidance instead of inventing distances or showing unrestricted results. With known coordinates, eligible catalogue products are ordered by proximity.

Distances are approximate straight-line miles, not delivery routes or a carbon score. External recommendations are curated by the venue and display its supplied business location. They are not automatically geocoded or represented as verified nearby suppliers. Staff must verify business and venue locations before enabling a local catalogue pilot.

## Preview and checks

`/business/venue-routing` provides a public interactive preview of all three customer journeys and the venue settings. It does not save or create bookings. `/business` links to this preview and the actual portal.

All 137 automated tests pass. Tests cover route defaults, unsafe links, input bounds, approved supplier inclusion, empty ranges, distance restrictions, missing locations, supplier delivery radii and staff linking. Browser checks cover adding/removing a recommendation, saving an owner draft without publishing it, the published own-network view, customer scope and narrow-phone layout. A synthetic development venue/account is used and removed after testing. No real bookings, supplier outreach, paid images or external booking submissions are created.

## Next operational steps

Confirm each pilot venue's route, recommended supplier permissions, booking-system URL, verified geography and handoff arrangements. Onboard any suppliers who want catalogue listings, agree commercial terms and have staff link those businesses to the relevant venue. Native booking-system integrations and automatic calendar sync need a separate provider-specific integration and testing plan. Email delivery still needs a configured sending provider before relying on alerts.
