# Mobile layout and booking rehearsal, 2 November 2026

Development only: styledukprodprogress.vercel.app, danieldhesiii/styledukprodprogress, Wedding Planner Dev qkyeitvwscrxbiwamxan. No live-site changes or payments.

## Mobile changes

- Catalogue, linked-look products, saved looks and board pins use two columns from 360px, with a single column on narrower screens. Desktop column counts remain unchanged.
- Product thumbnail sizing no longer grows from the child image's intrinsic height. Mobile photos fit inside the smaller frame; full details remain available.
- Compact cards keep prices, short honest image-source labels, supplier names, notice periods, availability, basket and save controls. Full source disclosure, detailed terms and Add to board remain in product details; desktop retains the expanded card actions.
- Event selection stays available on all studio tabs. Outside Wedding plan, mobile event creation/save tools open through Manage event or Save / manage. The full controls remain on the planning page and desktop.
- Mobile catalogue headings and view controls fit more efficiently. The redundant catalogue introduction is hidden where no venue policy is being explained. Venue restrictions remain visible.
- Mobile visualiser actions sit below the image with large tap targets; portrait previews have a sensible viewport height limit. The desktop overlay remains.
- Product detail and venue tour media use a shorter landscape frame on phones. Public venue introduction spacing is reduced.
- Phone form fields remain at least 16px to avoid Safari's small-input focus zoom. No viewport scaling, disabled pinch zoom or global shrinking was introduced.
- Contact support remains in the account menu; desktop keeps the extra top support shortcut.

## Booking rehearsal completed in Chrome

Used the staff-only /admin/pilot template, clearly labelled fictional and reset on refresh:

1. Submitted a practice request for two fictional suppliers with example hire dates.
2. Tried issuing an incomplete quote. The page refused it with the missing availability, fees, venue checks and security amounts.
3. Entered fictional availability, site checks and complete delivery/setup/collection/security amounts. The full quote became available.
4. Reviewed the customer-facing total and separate refundable security, checked the review acknowledgement and accepted the current quote.
5. Recorded the fictional booking in the staff view. The activity history showed acceptance followed by confirmation, with payments disabled.
6. Entered fictional return evidence and a proposed amount, then recorded report, customer notification, dispute and resolution. Final claim state: resolved. No actual charge, refund, message or booking was created.
7. In a separate disposable template, a supplier alternative response blocked quote issuance. Customer cancellation then produced Request cancelled.

These are template UI results, not a claim that real participants have completed a production booking.

## Database and automated evidence

- Both existing rollback-only fixtures, supabase/tests/booking_workflow.sql and supabase/tests/booking_operations.sql, passed against Wedding Planner Dev. They exercise real database functions for supplier approval/publication, full service quotes, customer acceptance, offline confirmation, amendment notice, stale revisions, claims, permissions and venue supplier routing.
- The fixtures report no payment and roll back all synthetic users, suppliers, orders and notification jobs. No background sender can see their uncommitted rows.
- npm run check passed: 307 tests, zero failed/skipped, TypeScript and production build. The known HEIC dependency warning remains nonfatal.
- Signed-in customer/staff access was checked with the existing support@styleduk.com account. It is verified, has staff membership and successfully signed in. No password was read, changed or reset.

## Email setup: corrected evidence

The earlier audit inferred that a webhook was absent from the missing deployment secret. Chrome now confirms an existing enabled Resend endpoint:

- Resend endpoint ID: b3cb157c-8b1a-4868-b0f1-38393408b15f.
- URL: https://styledukprodprogress.vercel.app/api/webhooks/resend.
- It shows seven subscribed events and no received events. No duplicate endpoint was created.
- RESEND_WEBHOOK_SECRET was absent in the development Vercel environment. The existing endpoint's secret must be entered privately into the prepared development form, then deployed and tested with a real signed callback.
- The user was asked to complete that private credential entry. No secret has been copied into code, logs, chat or this document.
- Staff Service checks now separately shows whether the callback verification secret is configured and states that actual callback delivery still needs verification. Merely saving a key is not proof of delivery.
- Automatic booking/venue email remains disabled pending recipient/queue review. Do not enable it to test against historical real suppliers.

## Next work after this checkpoint

1. Complete the private callback-secret entry, redeploy and verify an actual provider delivery event using an approved test recipient. A genuine supplier trial still needs supplier-approved recipients and content.
2. Test the real customer and supplier pages together with the participating supplier using approved listings. Keep the pilot template for safe rehearsal.
3. Agree the contracting party, commission, deposit/balance arrangements, supplier payout timing, cancellation/claims responsibilities and stock-hold policy before building real payment collection. No commercial terms were invented during this work.
4. Actual backup/restore and separate Storage recovery, staff MFA/recovery, active CI and developer review remain launch gates. The existing UI and SQL rehearsals do not certify production readiness.

Screenshots for the completed fictional claim and prepared email setup are saved locally in the chat's nov2 visualization folder. The final mobile verification record is delivered with the development update; do not treat an earlier deployment screenshot as the final version.
