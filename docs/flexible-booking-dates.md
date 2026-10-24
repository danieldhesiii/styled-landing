# Flexible hire and venue dates

Wedding day describes the event. It is separate from the requested hire/access period.

## Customer controls

- Wedding plan sets default delivery and return dates, synced privately with the planning workspace.
- Basket and checkout let each item use the defaults or choose its own delivery/pickup and return/collection dates. Overrides are kept in the existing saved basket and survive refresh on that browser.
- Items from the same supplier can use different periods, including a period after the wedding. Removing an override returns that item to the shared defaults.
- Venue booking requests default to the wedding day. “I need the venue for extra days” exposes access-from and access-until fields for setup, multi-day celebrations and pack-down. The wedding date must fall within that period.
- Viewings remain separate appointments and never reserve venue hire days.
- Each requested period is at most 31 days apart; contact support@styleduk.com for longer periods. Return/access-until dates are inclusive. Same-day handover times need manual agreement.

## Availability and fulfilment

Preview, order creation and staff rechecks use the full period for each item. The existing transactional product lock protects order creation. Return dates are stored on order lines; legacy orders retain the wedding date as their fallback end.

Supplier emails, the supplier dashboard, staff order details and customer orders show dates per item. Supplier calendar order counts include every requested hire day. Dates are requests; final supplier confirmation, access times, shipping and hire-duration charges remain manual. Catalogue estimates do not automatically multiply by days.

Venue requests store access dates separately from the wedding or viewing date. The public calendar includes every confirmed hire day. A service-only invoker trigger serializes confirmations on the venue, rejects overlaps/blocks anywhere in the period and preserves setup/pack-down offsets when a customer requests a suggested alternative date. Alternative dates remain requests. Confirmed bookings cannot be blocked on their setup or pack-down days.

## Deployment and verification

Additive migration applied only to DEV qkyeitvwscrxbiwamxan, the database used by this development website. Original production project is untouched. No RLS permissions were expanded.

`supabase/tests/item_hire_periods.sql` exercises real database functions inside a transaction that always rolls back. It covers inclusive returns, later item dates, stock conflicts, venue overlaps, blocked setup/pack-down and period-preserving alternative dates. It sends no emails. Automated tests cover server validation and per-item order payloads, including two items from the same supplier with different periods. Notification tests replace outbound transport.

Existing security-advisor notices concern the pre-existing is_staff helper and leaked-password setting, plus intentionally server-only RLS tables. This migration adds no definer functions or client write privileges.

Release checks: 95 automated tests passed, TypeScript passed and the production build passed. Browser component checks verified shared-default updates, independent item overrides, viewing/booking separation and a mobile layout without horizontal overflow. The temporary preview route was removed before the release build.
