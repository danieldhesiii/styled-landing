# Venue conversation notification outbox — DEV review handoff

Integration update, 2 November: main has reviewed and applied this migration to Wedding Planner Dev. Local complete checks passed with 283 tests, TypeScript and build. Sending remains disabled. The agent-specific implementation notes below are historical; see `development-functional-readiness-2026-11-02.md` for current evidence and remaining gates.

Implementation is local in `/Users/kamil/Desktop/styledukprodprogress`. No remote migration, deployment, commit, push, email enablement, or credential change was performed by this task. Main owns review, DEV application, and deployment. Never apply to the live database/domain as part of this handoff.

## Migration

`supabase/migrations/20261102120711_venue_conversation_notification_outbox.sql` was created through the installed CLI after inspecting CLI help. It was tested against the complete sorted migration sequence in isolated PGlite. The queue has RLS enabled and no browser-role grants or policies; the trigger is SECURITY INVOKER with an empty search path and restricted execution.

Each new current `venue_request_messages` insertion creates one uniquely linked queue job in the same transaction. Customer messages target current venue members; venue messages target the current enquiry owner. Historical replies copied by existing workflow RPCs retain old timestamps and do not queue. Existing rows are not backfilled. Status-only updates without a message do not create a conversation notice.

The delivery ledger retains its booking-only `job_id` FK and gains `venue_job_id`. A constraint requires exactly one booking, venue, or staff-check link. Existing provider-aware Resend/Brevo callback correlation remains valid, including callbacks arriving before the send response.

## Dispatch and review

The booking notification cron processes both queues behind `bookingEmailEnabled()`. Successful venue follow-up writes register best-effort post-response processing. Existing `notifyVenueRequest(..., "response")` calls dispatch saved outbox jobs instead of emailing response text or creating additional jobs. The legacy initial-request helper is also gated and verifies account emails.

Venue recipients are resolved from current memberships/ownership and confirmed, nonanonymous, nonbanned accounts when dispatch runs. Saved enquiry contact addresses are never used for conversation notices. Emails contain a generic notice and workspace link; message bodies are not even selected by dispatch.

The atomic status/attempt claim prevents concurrent sends. Only jobs with no send started or a definite provider rejection are eligible again, after 15 minutes, capped at five attempts. Partial acceptance, uncertain results, and interrupted `sending` jobs are held for review, including when saving a post-send result fails. Provider callback failures never requeue an accepted job.

Staff UI: `/admin/venue-notifications`, linked from Service checks and recognised by the staff section selector. It shows venue names, short request references linking to the venue-scoped enquiry admin, queued/error signals, attempts, and separate delivery reports. API reads require staff auth; actions additionally require a present same-origin JSON request, rate limiting, and retry eligibility checks. No action can reset uncertain/sending/accepted jobs.

## Executable checks

- `node --test tests/venue-notifications.test.cjs tests/venue-notifications-db.test.cjs`
- `npx tsc --noEmit --incremental false`
- `npm test`

The separate venue SQL runner uses the pinned local `@electric-sql/pglite` dependency first, with `STYLED_PGLITE_MODULE` only as a fallback. It loads all migrations in sorted order and runs `supabase/tests/venue_conversation_notifications.sql`. That fixture ends in ROLLBACK and the runner checks users, requests, messages, queue jobs, and deliveries returned to their original counts. It also forces an outbox insertion error to prove message rollback, verifies historical suppression, service-role-only access, deduplication, ledger link constraints, and early Resend callback binding.

Unit/integration tests use synthetic accounts and fake provider results. They test disabled zero-work behavior, changed/unverified recipients, concurrent claims, backoff/attempt cap, no retry after uncertain/partial/accepted sends, ledger failures, authenticated queue/CSRF paths, friendly queue rendering, navigation, cron gating, and dispatch after successful follow-up persistence. No provider request is made.

After main applies on DEV and deploys, browser verification can use synthetic conversations with sending still disabled: inspect the queued rows, staff links and errors, and denied nonstaff access. Resend webhook credentials remain a separate user-private setup step; this task neither configured nor tested a real email/webhook delivery.
