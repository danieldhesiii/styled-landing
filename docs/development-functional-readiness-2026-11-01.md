# Development functional readiness, 1 November 2026

Historical checkpoint: see `development-functional-readiness-2026-11-02.md` for subsequent implementation, database application and verification.

Development only: styledukprodprogress, Wedding Planner Dev qkyeitvwscrxbiwamxan. Live repository, domain and database remain unchanged. This is a tested checkpoint, not production certification.

## Delivered in this checkpoint

- Signed Resend callbacks with raw-body verification, timestamp tolerance, recipient/provider isolation, duplicate handling and out-of-order protection. Separate messages per recipient prevent cross-recipient exposure; partial acceptance blocks unsafe whole-job retry.
- Supplier requests continue to need attention until the complete service response is recorded. Availability alone is not the full quote.
- Final offline booking confirmation transaction queues customer and supplier notices. Actual sending remains off pending recipient review.
- Hire-date amendments and quote issuance check supplier notice periods.
- CSV import previews account for full overlapping hire periods and recorded buffers. Blank capacity preserves existing stock; new rows need explicit stock information. Imports do not publish draft products or silently reactivate them.
- Staff Service checks includes expired-current-quote and seven-day-old request review. No invented automatic hold expiry or cancellation.
- Venue conversations refresh every 30 seconds while open and on window focus, preserve draft replies and reflect the actual request status.
- Paid-preview and order usage queries fail closed on database errors. The description helper has user/network/global rate checks. JSON form bodies are bounded and malformed requests return controlled errors.
- Product instructions/help direct suppliers into private range review rather than unsupported self-publication.
- Read-only local preflight, hardened encrypted backup tools and developer handover. These do not claim a real backup or restore has occurred.

## Verification completed

- 260 automated tests passed; one optional isolated PostgreSQL runner skipped in the standard run because its external test runtime was not configured. Supabase SQL verification below covers the new database behavior separately.
- TypeScript and the production build passed for the main checkpoint.
- Migrations `20261101073258_provider_aware_resend_delivery_events` and `20261101073427_booking_workflow_tasks_confirmation_notice` were applied to Wedding Planner Dev only.
- `supabase/tests/resend_delivery.sql` and `supabase/tests/booking_workflow.sql` passed on Wedding Planner Dev. Both roll back their fictional fixtures, with no outbound sending or payment.
- Resend previously reported Delivered for the own-staff app check and Supabase password recovery. No password changed.

## Outstanding and explicit boundaries

- Register the Resend webhook at `/api/webhooks/resend`, enter its signing secret privately in the development Vercel project and verify an actual delivery callback after redeploy. Built endpoint is not proof of provider registration.
- Automatic booking mail remains disabled. Review the old queue and actual recipients before enabling it. No real supplier notifications were sent by this checkpoint.
- Venue conversation notification outbox is not implemented in this checkpoint. Existing saved conversations and refresh work; proactive email alerts for follow-up messages remain a next task.
- Agree temporary stock-hold duration/renewal rules before automating release. Expired quotes currently need staff review to renew or close their request.
- Actual database export/restore and Storage-file recovery remain blocked by missing private connection/key/local PostgreSQL tooling; see the developer handover. Encryption tests do not substitute for recovery evidence.
- Review outstanding independent code-audit findings before declaring the development feature pass complete.
- Supplier-approved content, prices, delivery/setup rules, terms, named recipients and a permissioned end-to-end supplier/venue trial remain outstanding.
- Payments, automatic damage charges, private supplier-system integration and supplier image/model accuracy are not certified or enabled.
- The live release still requires the owner's explicit instruction and a separate production migration/configuration/rollback review.

Start the next session by reading this file, `AGENTS.md` and `docs/developer-handover-2026-11-01.md`. Check the GitHub HEAD and deployment commit before continuing. Do not restart old Brevo setup or treat historical deposit percentages as supplier agreements.
