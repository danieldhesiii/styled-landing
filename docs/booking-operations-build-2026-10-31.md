# Booking operations build, development only

Scope approved: persisted quotes/customer acceptance, tracked notifications/follow-ups, private supplier submission/review, logistics/stock checks, venue handoff continuity, and recorded cancellation/damage/payment responsibilities with payment collection disabled.

Implementation plan:
1. Add private service-role-only workflow, immutable quote, claim, notification and supplier-review records, with RLS and transactional revision checks.
2. Attach actual request controls to existing customer cards, supplier requests and staff order details. Keep the fictional pilot separate and staff-only.
3. Queue and track initial requests, quote updates and reminders. Never label provider acceptance as verified inbox delivery. Sending remains explicitly configurable and tests never contact real suppliers.
4. Draft supplier submissions and permissions, privately stored review images, staff approval/publishing, and withdrawal of publication after material edits.
5. Preserve per-item dates, buffer checks and venue supplier restrictions through actual review. No new portal.
6. Claims require evidence and customer response; payment/contract responsibility checklist and offline booking confirmation, without any card charges/refunds.
7. Verify transactions, concurrent/stale updates, ownership across customer/vendor/staff, anonymous denial, photo privacy, notification failure, venue policies, browser/mobile and development-only deployment.

Implemented on development: private workflow/quote/claim/notification/review tables; revision-checked service-only transactions; supplier price and fee replies; item date/access editing; immutable full quotes and customer acceptance; offline booking arrangements; guarded claims and customer disputes; private image uploads with separate public/AI-reference permissions; staff review/publishing gates; current venue-policy/geographic checks; buffered stock reservations; queued notifications and daily reminder processing.

Verification: 173 automated tests, TypeScript and database transaction tests pass. Database tests execute workflow operations as service_role, matching the application permissions, and roll back all fixtures. Browser checks on the existing authorized account verified a full quote, acceptance, access edits invalidating that acceptance, renewed supplier checks, a replacement quote, guarded offline booking confirmation, and a reviewed return claim. The SQL fixture transaction rolls back all test changes, including its fictional users. Creation of additional persistent admin test accounts was rejected by automatic approval review; use the existing selected staff session for browser checks. No additional persistent account was created. No live repository/domain/database change.

Deployment configuration: development scheduler secret added as a sensitive Vercel variable. No supplier iCal feeds are configured. Booking email delivery remains disabled until a sending-provider key and a verified test-account delivery check are available. No messages or paid image requests were sent during this build. Payment collection remains disabled; the operational screens only record agreed offline responsibilities.

Role entrances: Customer > My bookings > Supplier requests > Saved quote, booking details and returns. Supplier > Requests > Availability, service costs and returns. Staff > Orders > selected request; Staff > Suppliers > selected supplier > Range approval and private preview; Staff > Service checks > notification queue. The old pilot stays separate and staff-only.

Known boundaries: shared-component/crew availability requires the supplier's manual confirmation; no private system integration is required. Claim evidence is a condition record/reference, not an automated liability assessment or charge. Notifications record provider acceptance, not proven inbox delivery; an uncertain sending attempt is not automatically retried. Real supplier terms, public content permission and payment responsibilities must be agreed before launch.

Browser verification used one explicitly fictional order owned by the existing selected staff account, reference STY-2D30DFC9. The request is now cancelled, its stock reservation released, and all its notification jobs are blocked at the processing limit. Permanent deletion confirmation expired, so the closed test history is retained. No test accounts or suppliers were created or retained. The real supplier session was not available; supplier access filtering and publication permissions were verified with automated and transactional database tests.

Final browser verification also covered customer disputes and staff resolution with no charge. Mobile width 390 px has no horizontal overflow; the tools selector and item summary were adjusted for comfortable reading. Anonymous workflow/queue checks return 401; an unpublished image returns 404. GitHub development changes are deployed successfully at https://styledukprodprogress.vercel.app. The live checkout remains at b533a3fcdd2bb9d9cb636d25a44fedecb329a892.
