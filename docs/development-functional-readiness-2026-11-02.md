# Development functional checkpoint, 2 November 2026

This record supersedes the outstanding implementation items in the 1 November readiness record. Development only: danieldhesiii/styledukprodprogress, main, styledukprodprogress.vercel.app, Wedding Planner Dev qkyeitvwscrxbiwamxan. The live site, repository and database are excluded.

## Completed

- Venue conversation messages now save a notification job atomically with the message. Recipients are checked against current verified accounts at dispatch. Emails contain a workspace link, never the private conversation text. Historical copied messages do not cause new notices.
- Staff can inspect the separate venue-message queue at /admin/venue-notifications, linked from Service checks. Safe retries are restricted; uncertain, partially accepted, sending and accepted jobs cannot be resent automatically.
- Booking-email staff review separates scheduled jobs from attention items, retains per-job reminder inputs and flags recipient delivery problems even when the provider accepted the original send.
- Anonymous or unverified accounts cannot submit catalogue orders into a workflow that requires a verified customer later. Their basket remains available.
- Supplier dashboards include incomplete service/fee responses in outstanding work.
- Unpublished suppliers cannot issue new quotes or confirm requests. Withdrawal of listing/photo permission hides their range and revokes image access; withdrawal of AI-only permission leaves public listings visible. Renewing permission requires fresh review before republication.
- Isolated PostgreSQL regression tests now run from a pinned project dependency without an external setup variable. The standard suite exercises the full sorted migration chain.
- A ready-to-enable GitHub workflow template at docs/ci/development-checks.yml.template runs TypeScript, tests and build using fictional build configuration, with no hosted database or provider credentials. GitHub rejected creation in .github/workflows because the current OAuth connection lacks workflow scope; it is not active. A developer with existing workflow rights can install the template later.
- Next.js was patched to 15.5.28, PostCSS to 8.5.23 and the affected selector-parser dependency updated.

## Verification

- npm run check passed: 283 tests, zero skipped or failed, TypeScript and production build.
- npm audit reported zero known vulnerabilities in the final lockfile. This is not a comprehensive security certification.
- All three 20261102 migrations were applied to Wedding Planner Dev only: venue conversation outbox, supplier publication guard and supplier AI permission withdrawal.
- Supplier publication and AI withdrawal rollback fixtures passed on hosted development. The public-permission hosted fixture confirmation expired, so its hosted execution is not claimed; it passed in the isolated full-migration test suite.
- Venue atomic rollback, deduplication, historical suppression, recipient isolation, delivery correlation and concurrent claims passed in isolated PostgreSQL and behavioral tests. No real venue-message email was sent.
- Post-migration security advisor: service-only tables intentionally have RLS with no browser policies. Existing is_staff() execution is intentional for authorization. Leaked-password protection remains disabled and needs review before launch.

## Remaining setup and launch gates

1. Resend webhook form is prepared for /api/webhooks/resend and seven delivery events. It has not been created. The user must create it and enter its signing secret privately as RESEND_WEBHOOK_SECRET in the development Vercel project's Production environment. Redeploy and test a genuine provider callback afterwards. Successful app/reset delivery is not callback evidence.
2. Automatic booking and venue conversation email remains off. Review queued historical jobs, recipients and service expectations before enabling. No real suppliers were emailed in this checkpoint.
3. Actual database export, isolated restore and Storage media recovery remain unverified. See the dated developer handover for prerequisites and safeguards.
4. Supplier-approved images/descriptions, accurate prices/fees, availability rules, terms and a permissioned end-to-end customer/supplier/venue trial are still needed.
5. Agree stock-hold expiry and renewal policy before automating release. Payments and automatic damage charges remain outside this checkpoint.
6. Developer review and a separate owner-authorized production rollout remain required. Do not deploy this work to styleduk.com automatically.

Run npm run check for local verification. Start future work with this record and AGENTS.md, and confirm GitHub/deployment revisions before editing.
