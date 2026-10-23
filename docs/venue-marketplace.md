# Venue marketplace and owner workspace

23 October 2026. Extends `studio-venues.md`.

## Customer journey

- `/venues` is the full directory. Search name/location, county, guest capacity and wedding date. More filters cover venue type, indoor/outdoor setting, maximum published starting hire price, facilities and sorting. Existing postcode/distance discovery remains available. Unknown distances are labelled rather than invented.
- Venue hire pricing is distinct from styling package pricing. Missing prices show "on request". A price filter excludes venues with unknown starting prices.
- Venue shortlists are explicitly saved on the current device, not synced to the user's account.
- Detail pages include capacities, facilities, hire inclusions, catering, access, address/map, photographs, optional film, styling packages and a dedicated walkthrough section.
- A real account is required to submit a booking or viewing request. The server takes the email and owner ID from the verified account, not the submitted form. `/venues/requests` displays only that account's requests and replies, including alternative dates. Unconfirmed requests can be cancelled; confirmed bookings need support-assisted changes.
- Supplier shopping remains separate. Selecting a venue or browsing styling does not reserve a date or start image generation.
- Known external blocks and confirmed Styled bookings are excluded from date searches and disabled in the venue calendar. Other dates remain subject to manual confirmation. Open enquiries do not reserve stock or venue dates.

## Venue team journey

- `/venues/partner` explains onboarding. Owners can open `/venue-portal` to sign in and create a private listing. The existing contact-first application remains available for assisted onboarding.
- Owner workspace has Listing, Requests and Calendar sections. Owners can manage up to three venues, with further onboarding handled by support.
- Venue teams enter prices in pounds. The server validates and converts them to integer pence. Profile details use an allowlisted structured payload.
- Photos can be uploaded from a device or supplied by URL. Uploaded venue assets use the existing public `supplier-assets` bucket; the UI explicitly describes their intended publication. File type, actual image contents, dimensions/size and upload rate are checked. The venue membership is checked before any upload. Unsaved uploaded assets may be orphaned; periodic storage cleanup remains a later operational improvement.
- Saved drafts and submitted changes live in `venue_listing_drafts`. They do not alter the live page. Required core details are checked before submitting. Styled staff review changes and explicitly approve publication through `/admin/venues`.
- Staff can attach existing verified accounts to a venue and remove team memberships. Owners cannot grant their own membership to another venue, publish a listing, access staff tools or alter another venue by changing an ID.
- Teams can respond to requests, suggest up to five future dates, and record a booking confirmation after agreeing arrangements with the couple. Viewing requests cannot be marked as wedding bookings.
- Teams and staff can block/unblock single dates with private notes. Confirmed bookings cannot be overwritten by an external date block.
- Venue operators who also hire out items can use the existing supplier onboarding separately. Inventory and venue hire are not conflated.

## Walkthroughs

- `VenueTour` always reserves an identifiable walkthrough section. Without a link, customer pages explain that no tour has been added and offer an in-person viewing request. Management pages explain how to add the optional captured tour.
- The existing `matterport_url` column accepts validated Matterport and Kuula share URLs. The legacy column name is internal; the UI calls it a "360° / 3D walkthrough URL".
- The tour iframe loads only when opened, supports fullscreen, and is removed when the dialog closes. Videos are separate YouTube/Vimeo embeds.
- Ordinary gallery images and video do not automatically generate a verified walkthrough. A venue or capture partner must supply a scan or connected 360° images, hosted by a provider.
- Official guidance: [Matterport embedding](https://static.matterport.com/mp_cms/media/filer_public/71/12/711245e6-6124-409b-81e5-df59be8472da/launching_a_website_msp_program.pdf), [Kuula embedding formats](https://kuula.co/help/embed-integration), [Kuula linked panoramas and hotspots](https://www.kuula.co/help/virtual-tours). Provider plan/access requirements apply. Custom domains and arbitrary iframe HTML are not accepted.

## Data and notifications

Migration: `20261023104157_venue_marketplace.sql`.

- Adds public structured venue details; private memberships, draft payloads and blocked-date notes; account-owned requests, kind, reply and alternative-date fields.
- RLS is enabled on all new tables. Authenticated clients can read only their own permitted rows; mutations require scoped server routes. The two booking/date-block functions are security invoker, service-role only, with explicit EXECUTE revocations for public/anon/authenticated roles.
- Confirmations and external blocks acquire a venue-row lock. A partial unique index prevents two confirmed bookings on the same venue/date. Concurrent confirmations were tested: one succeeded, one was refused.
- Customer receipt and reply notifications use the existing Brevo/Resend server sender setup (`support@styleduk.com`). New-request notices also go to the venue team and existing Styled staff. Delivery is best effort; request data and replies remain visible even if email is not configured. This adds no payment processing or binding online contract acceptance.
- Existing deployment publicly identifies Wedding Planner Dev (`qkyeitvwscrxbiwamxan`) as its configured database. The migration was applied there. Production secrets were not downloaded.
- Supabase security review reported no new venue warnings. Existing project advisories about the staff lookup and auth configuration remain outside this change. [Auth password protection guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Verification

- All 29 unit tests and the production build pass. Unit tests cover profile allowlists, pound-to-pence conversion, combined search filters, unsafe embeds, booking/viewing distinction, response requirements and alternative dates.
- A bounded integration check used temporary non-staff accounts, with email delivery disabled, to verify private draft creation/submission, public field selection, ownership denial, private blocked notes, public date filtering, request ownership, replies, alternative dates, viewing cancellation, restricted RPC permissions and competing booking confirmations.
- A follow-up run verified owner-scoped photo uploads and pound-price persistence. It then hit the per-network enquiry limit on a repeated submission, so the final viewing/cancellation portion was not repeated; those paths passed in the earlier complete run. Rate-limit protections were retained.
- The test runner removed its temporary requests, listings, uploaded assets, memberships and accounts in `finally`. Database checks confirmed zero remaining fixture accounts, venues or uploaded venue assets.
- Browser checks verified shortlisting, public detail/empty walkthrough states, owner profile/request tabs and 390 px layouts without horizontal page overflow. No paid generation or real booking was created.

## Next operational steps

Onboard a real venue, review its photographs/prices and publish its listing. Add a supplied tour link when available. Walk through a real enquiry with the venue before enabling deposits or online contracts. Later work can add recurring/calendar-feed blocks, staff review feedback history, a durable email outbox, automated storage cleanup, cloud-synced shortlists, richer venue packages and payments after commercial arrangements are agreed.
