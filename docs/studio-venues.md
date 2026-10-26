# Venues in the studio

Implemented 23 October 2026.

## Buyer journey

Venues have their own full-width tab beside the catalogue. Couples can filter by county, setting and guest count; view photos, packages and dates on the existing venue detail page; and choose a venue before returning to supplier shopping. Selection preserves the basket and saved items and does not start image generation or reserve a date. The selected venue is visible in wedding details, with a direct way to change it.

The AI visualiser remains a separate, explicit tool. Couples who already have a venue can open it to use their own photo.

## Venue operator journey

A clearly labelled venue-team section leads to the existing partnership application. Styled staff continue to manage approved listings, photographs, packages and date enquiries through `/admin/venues`. This does not imply that venue operators have staff access or an independent portal.

## Shared implementation

- Public venue pages and the studio share venue cards and filtering logic.
- The studio loads the existing server public-venue loader through `/api/venues`, only when the venue tab is opened.
- Only published public listing fields are returned. Enquiry contacts remain private.
- Canonical venue detail, date enquiry and partner application routes are reused.
- Venue choice and tab are reflected in the URL and the saved wedding brief. Switching to a sample venue clears the old partner-venue URL so it cannot override the new choice after refresh.
- Empty collections, no matches, loading and retry states are included. Real venue content appears when staff publish it; no fictional venues are left published.

## Verification

Production build passed. API checks verified published-listing visibility, correct styling prices, private-draft exclusion, absence of contact/enquiry fields, public directory/detail/partner responses and draft 404s. Browser checks covered capacity boundaries, indoor/outdoor matching, partnership form navigation, venue choice returning to the catalogue, refresh persistence and basket preservation. The visualiser stayed closed when a venue was chosen. The mobile layout was checked at 390px without horizontal overflow.

Temporary development listings and the disposable test account are removed after verification. No booking, application or paid generation was submitted. No database migration was needed for this change.
