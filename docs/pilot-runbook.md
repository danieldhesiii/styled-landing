# Development rehearsal and supplier pilot

Updated 1 November 2026. Everyday work stays at https://styledukprodprogress.vercel.app with Wedding Planner Dev (`qkyeitvwscrxbiwamxan`). This is not permission to release to styleduk.com or collect money.

## Start here

1. Staff sign in at `/admin/login` with their own approved account. The existing selected staff email is support@styleduk.com. Never share its password with suppliers.
2. Open Service checks to review connections, private supplier intakes, outstanding requests and notifications.
3. Use the staff-only Pilot workflow template for fictional practice. It is deliberately separate from real saved requests; template edits reset on refresh.
4. For database-backed verification, use the rollback SQL fixtures in `supabase/tests`. Fixtures must not email real recipients or create retained accounts. Automated passing checks are not supplier approvals.

## Email setup

Resend domain verification and two development deliveries were verified on 1 November: the app's own-staff email check and Supabase password recovery to support@styleduk.com. Requesting recovery did not change the password. This proves those two paths only, not every notification or actual inbox placement.

The Vercel API key and Supabase SMTP are separate settings. The development Vercel project's Production environment is still the development website. Keep its site URL and Auth callbacks on the development host.

Automatic booking messages remain off until the intended recipients and old queue have been reviewed. Resend callbacks must use the Resend endpoint and signing secret, not the historical Brevo callback. Read `resend-development-setup-2026-10-31.md` for configuration and the remaining registration step. Provider acceptance, delivery and an actual person reading an email are different outcomes.

## When supplier material arrives

1. Confirm the named business contact, approved starting range, prices/VAT, package contents, minimums, dimensions and actual images.
2. Record public-image and optional AI-reference permission separately. A product image does not imply permission to send it to an AI provider.
3. Create or link the correct supplier profile. Invite only a recipient approved by that business. Recipients set their own credentials.
4. Save products privately or preview a CSV import before applying it. CSV imports are not an integration with a supplier's stock system. Missing rows are not deleted.
5. Add images to the private range review. Submit the range, request changes if necessary and approve only actual permissioned material.
6. Hide fictional suppliers/products before allowing real customer requests. Approval of a demo is not approval of public listings.

Do not use any historical default commission, deposit percentage, invented capacity or inferred fee as an agreed supplier term.

## Real no-payment rehearsal

Use a participating supplier and venue, approved recipients and an agreed test purpose:

- Customer sets an event, venue, guests and separate item hire periods.
- Customer submits a request. No charge or confirmed booking occurs.
- Supplier checks their own system, full hire dates, buffers, shared equipment/crew and venue access.
- Supplier records availability, any alternatives, item prices, delivery/setup/collection fees, refundable security, VAT treatment and terms. Enter 0 only for a genuinely included service; unknown fees stay blank.
- Staff issue a complete, expiring quote after all checks pass.
- Customer accepts the current quote. Changed dates/details invalidate prior checks and require a new review.
- Staff record the agreed contracting, payment, cancellation, deposit, damage and commission responsibilities before recording an agreed offline booking.
- Exercise fulfilment, return inspection, a dispute and cancellation review without charging or refunding anything.
- Inspect notification outcomes independently. Never resend an uncertain send merely because it lacks a delivery report.

For venues test own-network, approved-partner and Styled catalogue routes separately. External booking links are handoffs, not synchronised reservations. Video/3D placeholders are not generated tours.

## Stock and expired requests

An unconfirmed request can reserve capacity under the existing availability rules. Staff must review old open requests and expired quotes in Service checks, renew only after checking with the supplier or close through order management when appropriate. An expired quote cannot be accepted, but expiry does not currently automatically cancel the request or release stock. Agree a reservation duration/renewal policy before automating that change; do not assume a silent hold guarantee.

## Before public release

- Approved real range, descriptions, photos, service rules and venue policy.
- Role isolation and real supplier/customer/venue walkthroughs.
- Auth, notification failures, signed callbacks, support and mobile checks.
- Independent encrypted database and media backup with an actual isolated restore.
- Approved commercial terms and responsibility for support, cancellations and disputes.
- Developer review, live-schema migration plan, production configuration and rollback plan.
- Explicit owner instruction to release to styleduk.com.

Payment collection, automatic damage recovery, external stock synchronisation and automatic Pinterest/Google Photos account imports are not promised by this rehearsal. Use the existing clearly labelled manual workflows until their separate implementations and agreements are complete.
