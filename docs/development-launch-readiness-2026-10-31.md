> 1 November 2026: Brevo has been replaced for development by Resend. Domain verification, an app test and Supabase password recovery delivery were verified. The old Brevo setup instructions below are historical. Use `pilot-runbook.md` and `resend-development-setup-2026-10-31.md` for the current path. No live release or payment enablement.

# Development pilot readiness, 31 October 2026

Development site: https://styledukprodprogress.vercel.app. Live domain, live repository and live database are unchanged.

## Where the work lives

- Staff > Service checks > Pilot setup and launch checks: private supplier intakes, commercial decisions, connection checks, own-account email checks and technical incidents.
- Staff > Suppliers > selected supplier: recipient-approved private account invitations and the existing range review/publication controls.
- Customer > My bookings > Venue requests: a booked venue's onward route keeps the existing conversation and respects the venue's supplier policy.
- Staff > Service checks > Email queue and supplier follow-ups: send acceptance and per-recipient delivery/bounce reports are separate.

## What is prepared

Crescent Moon: Simon still needs to identify six popular products. Private intake records his preference for manual checks in his own operations system, hire-only versus supplier installation, no customer money before supplier acceptance, and the need for real product specifications/photos and quotes. No products, capacities, prices, permissions or commissions have been invented.

Sarah Mae Flowers: private intake requests a small agreed artificial-floral range/package selection, inclusions and variations, minimums and Scotland travel/setup rules. The existing booking system remains authoritative. The contact identity, prices and licensing/commission arrangements remain to be verified.

Both intakes can download a blank material worksheet, link a real supplier profile later, record evidence and commercial decisions, and save a revision-checked private audit history. An intake cannot publish a range or give someone business access. A reviewed range and the actual end-to-end walkthrough are separate requirements.

## Email blocker, checked in the actual account

The existing signed-in Brevo account's Deliverability center currently says **Under review**, **sending paused**, and **additional verification required**. There is no BREVO_API_KEY or RESEND_API_KEY on the development Vercel project. Automatic booking sending remains off. No compliance statement has been submitted and no supplier email has been sent as part of this work.

Ready integration: provider message identifiers, private recipient delivery records, authenticated Brevo callbacks, duplicate-event protection, chronological delivery/bounce updates and safe uncertain-send handling. Failed or uncertain messages are not described as delivered. Email opens/clicks and raw webhook payloads are not retained. The private staff test sends only to the signed-in verified staff address, never to an arbitrary supplied recipient.

After Brevo confirms sending access:

1. Put the existing approved API key in the development project's server-only BREVO_API_KEY. Do not paste secrets into chat or commit them.
2. Keep sender/reply-to at support@styleduk.com with the authenticated domain.
3. Add a private BREVO_WEBHOOK_SECRET of at least 32 characters to the same development environment.
4. Register a transactional webhook for https://styledukprodprogress.vercel.app/api/webhooks/brevo. Use Brevo bearer authentication with that same token, never put the token into the URL. Include sent, delivered, deferred, soft_bounce, hard_bounce, blocked, spam, invalid and error events as supported by the provider's current configuration.
5. Use Service checks > Connections and test email. Verify the actual inbox and the provider delivery report. Record both observations.
6. Test signup/recovery separately. Supabase Auth mail uses its own SMTP configuration; a Brevo API key in Vercel does not configure it.
7. Enable ENABLE_BOOKING_EMAILS only for a controlled pilot after these checks. Review old queued messages before processing them.

References: [Brevo authenticated webhooks](https://developers.brevo.com/docs/secured-webhooks), [transactional event formats](https://developers.brevo.com/docs/transactional-webhooks), [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

## Business access

Future invitations require a supplier-approved recipient and an email provider. Staff never receive a password or OTP link. Opening an invitation in an email scanner does not consume it: the recipient must choose Continue. New account holders choose their own password. Invitations cannot move an account away from a different supplier or turn a staff login into a shared supplier account. No real supplier/venue login has been provisioned during this unattended build.

Supplier and staff access now require a verified account email. Venue access already requires it. Existing memberships remain authoritative; editable user metadata never grants a role. Supplier APIs remain scoped to their linked supplier and customer APIs to their owner.

## Payment work

The private commercial record now asks who contracts, invoices and receives money; deposit/balance/security terms; cancellation/refund ownership; damage evidence/disputes; commission basis; and the supplier approver/agreement reference. These are decision notes, not a signed agreement. No provider, payout account, card mandate, charge or refund is enabled. Commercial decisions require the actual parties' agreement before payment integration can be completed.

## Backup and recovery

Encrypted offline development database backup and isolated local restore tooling is supplied in scripts/backup-development.mjs and scripts/restore-development-backup.mjs. The codec uses authenticated AES-256-GCM; tests verify round-trip recovery and tamper rejection. Source checks refuse the live database. Restore checks refuse remote hosts, ordinary database names and nonempty local targets. Secrets are passed through the environment and never printed in command arguments. Archives are excluded from Git.

Actual database export/restore is **not yet performed**: no development database connection string, independent backup key or PostgreSQL client tools are available in this workspace. A database archive also excludes Storage file bytes. Obtain the development-only connection, arrange separate private storage-file backup and independent key storage, then restore into a fresh local styled_restore_* database and verify schema/row counts and media. Do not mark the launch check passed from encryption tests alone.

[Supabase backup scope and recovery guidance](https://supabase.com/docs/guides/platform/backups).

## Verification and real-pilot boundary

Automated tests cover email failure/uncertain outcomes, callback authentication, identifier/recipient isolation, invitation safety, intake validation, environment separation and encrypted-backup guards. Database transaction tests cover recipient isolation, repeated and out-of-order callbacks, bounce history, intake audit and service-only access. Existing no-payment booking and venue participant/routing tests are rerun with fixtures rolled back. No test accounts, active suppliers or actual venues are retained from those SQL tests.

The real-business pilot still needs approved product material, a named participating venue, its actual supplier policy, verified business recipients, restored email sending and agreed commercial responsibilities. Meeting notes and fictional simulations cannot supply those approvals. This checklist remains deliberately incomplete until the evidence exists.

## Automated verification result

186 automated tests pass. TypeScript and the production build pass. Development database transaction tests pass for launch-readiness receipt/audit/privacy, the complete booking operations workflow, and venue participant/alternative-date routing. All database fixtures roll back. Security advisors show no new warning category: the pre-existing is_staff() role helper remains intentionally security-defining for its narrow membership query, and leaked-password protection is still disabled in the hosted Auth configuration. Review that hosted setting before launch; no paid plan or policy change has been made automatically.

The current Supabase changelog's November TLS cipher retirement was checked; this build uses modern HTTPS and does not relax certificate validation.

## Deployed browser verification

Development release 76b6b3faf31a81d56c460a8d9afae02b89368796 is Ready on Vercel. The signed-in staff account can load both private intakes, save actual preparation notes and reload them. Both still show 0/8 supplier approval steps, deliberately: no material/price/permission has been received. The page confirms development/database isolation, email unconfigured, automatic sending off, scheduler configured and payments disabled.

At 390 px, the pilot setup has no horizontal overflow, all form controls have labels and keyboard Tab reaches the next action. Desktop/mobile screenshots are saved locally. The private invitation landing screen renders and a GET does not consume a credential. Anonymous pilot access and supplier invitation requests return 401; an unauthenticated Brevo callback returns 401; public liveness returns 200.

All three fictional venue journeys were exercised in Chrome from practice request through simulated venue agreement. Own-network venues keep customers with the venue; partner venues show only their approved route; wider-catalogue venues explain that product requests are separate. These are simulations, not real bookings or external system integrations. No actual venue listing is published on development yet.

The local build's 166 public static files were checked against the one configured server secret available locally; no match was found. This is not a claim that every remote provider credential was independently scanned.

An optional supplier-access-removal/audit migration requested database confirmation and that confirmation expired. It was not applied; its unshipped code was removed and the already-deployed invitation flow remains intact. No business membership was granted or removed during this build.

Existing Auth advisory reference: [leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). The existing role helper checks only the caller's own staff membership with an empty search path; its intentional definer permission was inspected and retained. [Supabase function advisory](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

Actual backup/restore additionally requires compatible PostgreSQL client tools and an isolated local target with the Supabase roles/extensions required by the archive. Never point restore at the live or development service.
