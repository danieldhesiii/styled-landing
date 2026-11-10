# Phase 2B: supplier location and venue discovery

Development checkout only. No commits, deployment, production calls, database writes or migrations.

## Cause verified

Read-only aggregate query on Wedding Planner Dev (`qkyeitvwscrxbiwamxan`) found 12 suppliers, all 12 with `suppliers.area`, none with `service_details.coverage`, and none with a supplier row in `discovery_locations`. Profiles already capture/save/read the public area. Distance discovery previously read only `discovery_locations`, so existing public place names could not be searched and no supplier distance could be returned.

## Implemented

- `POST /api/discovery` accepts `{query: "place or full UK postcode"}`; the existing `postcode`, `venueSlug` and `point` inputs remain supported. Place matching uses public catalogue suppliers' saved `area` / `service_details.coverage` and published venues' `location` / `county`. It never geocodes or creates a location for a place-name match.
- Place responses include `placeMatches: {suppliers: {[supplierId]: publicArea}, venues: {[slug]: publicPlace}}`. Their distance maps `suppliers` / `venues` are empty. Consumers must use `placeMatches` for filtering and labels, without interpreting them as distance results.
- Full postcodes reuse the existing postcodes.io lookup. Distance results omit malformed coordinates, unpublished suppliers and unpublished venues. Venue-led discovery additionally applies the existing server-side venue supplier policy.
- `components/venues/LocationFilter.tsx` supports names/postcodes, explicit no-match/error states and place-versus-distance wording. `VenueSearch` uses it and filters by matched venue slugs for place searches; radius filtering is disabled for place-only results. Cards continue to display saved public place names.
- Supplier business setup clarifies that the existing town/service area field is public and adds an independent private location form. `GET/POST /api/vendor/location` reads/saves/clears only the authenticated supplier's existing `discovery_locations` record. Explicit supplier confirmation, postcode validation and delivery radius 0–500 apply. Exact coordinates/postcodes are never added to public catalogue/discovery supplier responses. Full postcode lookup is disclosed in the form. Supplier confirmation is self-attestation, not independent staff verification.

Decision: repair the existing fields and simple matching first. No new paid autocomplete provider, guessed postcode, inferred coordinate, fabricated distance, public street-address field or schema migration.

## Studio integration completed

The initial scope left studio integration with its owner. The parent then explicitly assigned the minimal integration to this task:

1. `app/design/page.tsx` now uses `components/venues/LocationFilter` with `entity="suppliers"`; it accepts place names/full postcodes and allows 160 characters without forcing uppercase.
2. `ProductBrowser` accepts optional `placeMatches`, filters by matched supplier IDs, shows saved public place names and omits distance sorting/radius filtering for place matches. An empty map means no matches. Its supplier panel uses the same place scope. Account-wide Saved items remain available independently of the event's location.
3. The studio passes the venue place map through `VenueExplorer` to `VenueSearch`, whose own location control explicitly uses `entity="venues"`. Inherited place matches can be cleared. Distance responses retain the current contract and venue catalogue restrictions remain in force.

No changes to `components/wedding/*` were needed. Existing ProductBrowser and studio changes by other agents were preserved; the integration adds only location props, filtering, saved place labels and the control import/entity selection.

## Verification

Targeted automated tests cover stored public areas/coverage, no matches, missing/malformed coordinates, no invented distances, exact delivery-radius boundaries, nationwide delivery, public-only results, venue supplier scoping, private field exclusion, supplier membership scoping, save/read/clear and validation failures. Existing venue supplier-policy tests also pass. See final task report for whole-checkout test/type/build outcomes, which can change as other agents edit this shared checkout.

Final owned checks: 17/17 targeted tests passed; TypeScript passed; owned tracked diffs passed whitespace checks. Earlier whole-checkout run passed 350 tests; parent subsequently reported 360 passing tests and TypeScript. A shared-output build compiled but failed at `/_not-found` page collection; a separate temporary-copy build completed successfully before the parent's request to leave final builds to them. No build process remains running for this task. Browser walkthrough remains with the parent; no browser verification is claimed here.

Studio follow-up verification: `tests/studio-location.test.cjs` renders actual product/venue components to cover matching, no-match, clearing, saved-item isolation, correct supplier/venue copy and disabled distance controls for place-only results; it also verifies the real studio prop wiring. Run together with location discovery, catalogue product UX and venue supplier tests. No further Next build was started; the parent owns the final build/browser walkthrough.
