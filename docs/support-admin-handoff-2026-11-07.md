# Support/admin phases 1A and 6 — integration handoff

## Rollout status

Migration `20261107132435_support_notification_outbox.sql` was applied successfully through the Supabase connector to **Wedding Planner Dev, qkyeitvwscrxbiwamxan**, on 7 November 2026. No production database, repository or public domain was changed. No commits were made by this agent.

Post-apply verification confirmed `support_notifications` exists, RLS is enabled, authenticated clients have no SELECT privilege, exactly one enqueue trigger exists, and `booking_email_deliveries.support_job_id` exists. The outbox contained **zero jobs** after migration: no historical requests were backfilled. No dispatch endpoint or real email provider was invoked during this work.

## Configuration and deployment

- Parent reports `ENABLE_SUPPORT_EMAILS=true` added to the production environment of the **development Vercel project prodprogress**, with `RESEND_API_KEY` already present. This agent did not read or print secret values.
- Support sending independently requires `ENABLE_SUPPORT_EMAILS=true`, an existing configured provider, and `environmentMatches` for `https://qkyeitvwscrxbiwamxan.supabase.co` plus `https://styledukprodprogress.vercel.app`.
- **Do not enable `ENABLE_BOOKING_EMAILS` to enable support.** Historical booking/supplier jobs remain independent.
- Keep `NOTIFY_FROM_EMAIL` a verified sender. Existing Resend/Brevo delivery webhook configuration remains necessary to move from provider acceptance to confirmed delivery reports. Provider acceptance alone is not inbox delivery.
- Code and updated `vercel.json` still require the parent's development deployment. The support recovery cron is `/api/cron/support-notifications`, daily at 10:00 UTC, protected by existing `CRON_SECRET`.
- Immediate best-effort dispatch is scheduled with Next `after` only after successful support persistence. Failed/interrupted background work leaves the durable outbox for cron. The saved receipt never claims email was sent.

## Implemented

Support writes use the existing verified-user, idempotent submit RPC. An INSERT trigger creates one notification in the same transaction; repeated user/client IDs cannot create another request/job. Historical requests remain readable without an invented notification record.

The dispatcher uses the existing tracked provider ledger/callback mechanism, targets only the fixed support mailbox, and sends a saved reference plus staff inbox link. No customer body or customer address goes into the notice. Conditional claims prevent concurrent duplicate sends. Only definite rejection or pre-send failure retries; unknown, accepted, and interrupted sending jobs are held. Attempts stop at five, with a 15-minute automatic backoff. Staff can requeue definite blocked/failed jobs without sending from the click or resetting attempts.

The staff inbox now filters open/new/in-progress/resolved/all before pagination, so older open work is not displaced by resolved rows. It shows queue state, attempt exhaustion, provider reports and safe retry controls. Notification-query failures show a warning while leaving saved requests available. Customer history stays owner-scoped. Existing concurrent reply protection remains intact.

Admin navigation labels the actual support inbox Customer questions. The dashboard's former Customer questions category was actually venue enquiries; it is now Venue questions, with a direct link to customer support. Secondary attention-rule copy is collapsed while real operational warnings remain.

Global Products & availability has supplier, category and publication filters and name/supplier sorting. Supplier product pages have search, category/publication filters and name/price sorting. Product names open a native dialog with viewport bounds, scrolling, sticky actions, Escape and focus return. Staff can edit name, price, description and capacity; editorial updates check the last updated timestamp. Existing database guards hide material edits until review approval. New admin products default to private drafts. Supplier product-read failures are visible rather than rendered as an empty list.

Support answers now describe shared Saved items/Saved looks, use the Change dates button, omit Boards/Pinterest feature instructions, and give concise AI-preview guidance. Parent owns `lib/help.ts`.

## Original visibility report: verified limits

The hosted development database had one saved request, status new. Its original staff query selected all statuses, newest first, limit 100; it should return this row. Therefore pagination was **not proven to cause the original missing request**, and no persistence/RLS/admin-query failure was reproduced. The missing email path and confusing venue/support labeling were verified in source. A signed-in staff walkthrough of the original request is still needed to establish the exact original visibility failure; do not report it as conclusively diagnosed.

## Validation

- Full shared test run passed: **370 tests**, zero failures/skips, before the final three support cases were added.
- Final targeted support API/dispatcher cases passed, including independent support enablement with booking disabled, pre-send ledger failure, deferred dispatch only after save, and truthful persistence receipt.
- Full migration sequence plus rollback-only support and admin-publication fixtures passed in isolated PGlite. Tests cover one request/job across retries, owner visibility and cross-account denial, service-only outbox, provider callback correlation, and transaction rollback.
- Publication proof: approve fictional product → anonymous read sees it → staff edit/save/reload → anonymous read excludes the unapproved edit → submit/approve → anonymous catalogue/detail-shaped reads see the edited name/price. All fixture records roll back. This is database/read-path proof, not a hosted browser walkthrough.
- `tsc --noEmit` and `git diff --check` passed. Parent owns the final integrated build/deployment and hosted desktop/mobile/keyboard checks.
- Dev security advisors: outbox's RLS-with-no-policy INFO is intentional for service-only access. Existing warnings concern `is_staff()` definer execution and leaked-password protection; this migration adds neither.

No hard deployment blocker remains in this work. Remaining evidence: hosted signed-in staff visibility, real provider inbox delivery if explicitly requested, and deployed dialog/mobile interactions. No supplier notifications or real customer receipts were sent.
