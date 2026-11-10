# Supplier onboarding audit, 2 November 2026

This is a current comparison against the supplied `supplier-onboarding-readiness.txt`, dated 1 November. It supersedes its setup instructions, not the historical record. All implementation and database work here is development only: `danieldhesiii/styledukprodprogress`, https://styledukprodprogress.vercel.app, Wedding Planner Dev `qkyeitvwscrxbiwamxan`.

## Built in this checkpoint

1. **Supplier product date limits:** Supplier workspace > Availability > Stock for a specific date. A supplier can reduce a product's total stock on a date, close it with zero, edit the exception or restore normal stock. Styled reservations are still deducted; whole-business blocks take priority. Made-to-order products can be closed, but quantity limits require normal stock to be defined first. Changes never cancel existing requests. Existing limits remain visible and recoverable after a failed request.
2. **Safe calendar failure:** Repeating events used to import just their first occurrence. The importer now refuses recurrence, duration-based unsupported events, invalid dates and incomplete feeds before touching stored dates. It skips cancelled/free events, observes exclusive all-day and midnight ends, and limits scanning to the supported 550-day horizon. Full recurrence expansion is still a future feature, not something this fix claims to implement.
3. **Bounded calendar fetching:** Direct public HTTPS feeds only, with pinned public IPv4 DNS, no redirects or URL credentials, a 10-second overall deadline and a 2 MB body limit. Invalid encoding and incomplete transfers fail safely. IPv6-only hosts and redirecting feeds are not supported; use a direct export URL or manual blocks.
4. **Resume saved looks:** Saved previews now have an explicit Continue designing button. Reopening from Saved or Boards, and restoring an event preview, retains the original room photo and catalogue report. Opening a look keeps the current event and basket unchanged. A failed/in-progress or mismatched render cannot be resumed; switching events while a Board look loads cannot apply it to the wrong event. No paid image generation was triggered for this audit.

The product date-limit write is transactional, checks the current supplier-user link and product ownership under locks, and cannot increase the normal stock figure. It uses SECURITY INVOKER and is callable only by the service role. No browser table policies were relaxed.

## Corrections to the supplied checklist

| Old claim or instruction | Current position |
| --- | --- |
| Configure Vercel styled-landing and styleduk.com | Those are live targets. Routine configuration belongs to the development project styledukprodprogress. Use its URL for callbacks. |
| OpenAI/Resend/cron keys are missing | Read-only Vercel inspection on 2 November found OPENAI_API_KEY, RESEND_API_KEY and CRON_SECRET configured for development deployment. Presence is not proof of valid credentials, actual generation or cron execution. |
| Use orders@styleduk.com | The agreed support/sender address is support@styleduk.com. |
| Venue conversation email queue is not built | Built and tested in the earlier 2 November checkpoint; there is a separate staff queue. Sending still remains disabled. |
| No duplicate protection without the Resend callback | Per-recipient sending/idempotency protections already exist. The callback is still required for delivery/bounce evidence. |
| No self-service password recovery | Recovery exists, including the supplier login link. Staff use the normal account login, then the authorised admin shortcut. Do not distribute an invented shared admin password. |
| Saved looks cannot reopen | Reopening already existed. This checkpoint repairs dropped context and makes the action explicit. |
| Per-product date limits are staff-only | Suppliers can now manage their own limits in Availability. |
| Apply a standard 25% deposit / 12% commission | Historical figures are not agreed terms. Current workflows record the full quote and offline booking arrangements. Do not impose percentages on a supplier without agreement. |
| Remove all fictional suppliers now | Keep the development rehearsal usable. Real/public onboarding must distinguish approved ranges from fictional fixtures. Do not deactivate live suppliers from this document. |
| Build a supplier page by copying website/Instagram images | Use supplier-approved assets and explicit listing/public-image/AI permissions. An attractive mockup does not replace permission or review. |
| Add one-tap email confirmation | Avoid confirmation through an email GET link. Email security scanners can follow it. Any future shortcut needs scoped, expiring access, deliberate confirmation and a fresh stock/fee check. |

## What is genuinely left, in order

### 1. Prove a controlled, no-payment pilot

- Complete Resend webhook registration and private RESEND_WEBHOOK_SECRET entry in the **development** Vercel project, redeploy, then capture a genuine signed provider callback. The variable was absent in the read-only 2 November inspection.
- Review historical queued jobs and intended recipients before enabling automatic booking/venue mail. ENABLE_BOOKING_EMAILS remains absent. Avoid sending old requests to real vendors accidentally.
- Rehearse with permissioned customer, supplier and venue accounts: request, full-period stock review, delivery/setup/collection fees, quote, customer acceptance, offline arrangements, returns, cancellation and a disputed claim. Test messages with approved recipients only.
- Trial the new date limits and saved-look resume on desktop and mobile with the actual participants. Local tests and database fixtures do not replace their usability feedback.
- Define the ambiguous "Boards does not behave as intended" report through a concrete example. Existing uploaded photos, catalogue references and saved looks are different reference types; a board link is not an imported image.

### 2. Agree commercial and operating rules

Before taking money: agree commission, who contracts with the customer, who takes deposits/balances, supplier payout timing, VAT, delivery/setup/collection responsibility, late/damage claims, refunds and disputes. Decide hold duration and expired-quote handling; expired quotes currently require staff review and do not silently release all request stock. Record notice and preparation periods per supplier rather than imposing one policy.

### 3. Build payments around the agreed responsibilities

Card payments, automatic damage recovery and a supplier payout ledger/Connect flow are not implemented. Choose the contracting/payment model first, then build idempotent payment/refund webhooks, reconciliation, supplier balances and audited exception handling. Do not introduce real charges or automatic penalties as a mockup feature. Existing Booking arrangements and Returns and claims remain manual records.

### 4. Finish operational and release assurance

- Staff alerts for new requests remain a useful next addition. Use a durable notification queue and approved verified staff recipients; do not expose customer detail in email or add blanket broadcasts.
- Add staff MFA with recovery procedures and review leaked-password protection. Existing is_staff() execution is an intentional policy helper; service-only tables intentionally have no browser RLS policies. Advisor guidance: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.
- Perform an encrypted development database backup, isolated restore and separate Storage file recovery. The local preflight still reports missing private connection/restore/encryption inputs and PostgreSQL tools. No backup/recovery proof is claimed.
- Install the prepared CI workflow using an account with GitHub workflow rights. The existing template is not active CI.
- Expand recurring-calendar support only with bounded recurrence, exceptions, moved/cancelled occurrences, timezone and concurrent-sync tests. Current behavior is an explicit safe refusal.
- Before larger volume, review concurrent calendar reconciliation and feed changes, notification queue operation, monitoring, provider limits and load behavior with the developer.
- Pinterest remains subject to the existing support request and explicit approval for image copying/external AI use. Keep the existing import disabled until those conditions are met. Do not scrape Pins or submit a duplicate app.
- Complete supplier-approved images, descriptions, accurate stock and fees. Do a private range review, check withdrawn permissions, then approve publication deliberately.
- Independent developer review, production configuration/schema plan, rollback rehearsal and explicit owner approval remain required for any release to styleduk.com.

## Verification and deployment record

- `npm run check` passed: **307 tests, zero failed/skipped**, TypeScript and production build. The existing libheif/HEIC dependency emits its known dynamic-require build warning; compilation succeeds.
- Isolated PostgreSQL runs the full sorted migration chain and rollback-only stock fixtures. Tests cover ownership, caller spoofing, date/quantity validation, upsert uniqueness, blocked and made-to-order dates, reservation subtraction, business-block priority, restoring normal stock, and unchanged existing requests.
- Applied only to Wedding Planner Dev: local migration `20261102182024_supplier_product_day_limits.sql`; hosted history assigned `20261102182511`. Do not blindly reapply under a second timestamp.
- The same synthetic stock fixtures passed on hosted development and rolled back completely. No real suppliers, bookings or notifications were created by them. Browser roles cannot execute the function; service_role can.
- Post-change security advisors show the existing service-only RLS information and existing is_staff()/leaked-password warnings. No new function-exposure warning was introduced.
- `npm run readiness:local` remains incomplete by design: private backup/restore inputs and actual recovery/hosted evidence are missing. This is not a production-readiness certification.
- No credentials changed, automatic supplier mail enabled, payments activated or live application release performed.

## Where to test

Use https://styledukprodprogress.vercel.app only.

1. Log in with a supplier-linked account and open Supplier workspace > Availability. Pick a product, a future date and a reduced stock total. Save, reload, edit to zero, then choose Use normal stock. Whole-business blocks remain separate.
2. In a customer account, open Saved > Looks > Continue designing. The saved room comparison and catalogue report should belong to that saved preview; the active event and basket should stay unchanged. Try the saved-look action on a Board as well.
3. In a test supplier account, sync a feed containing a repeating event. It should explain that the feed is unsupported and retain all prior blocked dates. Use a direct HTTPS one-off feed for a successful sync. Do not disconnect a real calendar just to run a test.

The new authenticated UI paths have automated behavior/type/build coverage and hosted SQL evidence. A complete authenticated browser pilot with real participating accounts is still on the checklist.
