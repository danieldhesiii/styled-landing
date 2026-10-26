# Support and completion review, 26 October 2026

## Scope

Reviewed customer planning, the public landing page and footer, in-workspace help, supplier and venue navigation, service information, privacy, request guidance and failure recovery. Changes are additive except for removing duplicate footer navigation and shrinking the repeated account invitation. Shopping, image generation, pricing, booking submission, stock, authentication and supplier approval behaviour are retained.

## Gaps addressed

- Support was mostly a mail link in public service information or How it works. Added a public /support page and a shared in-place support panel, available near the top of the customer studio, in its account menu and bottom utility links, and in both business workspace headers. The panel does not navigate away from an unfinished plan.
- Added question topics, optional request/listing references, a message draft, quick answers for the most common planning/account/business/request issues, account recovery links, email preparation and copy-message fallback.
- Closing and reopening the support panel keeps the draft in memory while the page is open. No private message is written into browser storage. Email preparation is explicitly labelled as a draft, never a sent message.
- The previous footer repeated the main navigation and business-workspace links. Replaced it with one compact row retaining support, service information, privacy, terms and the business entry point. Reduced the oversized repeated registration invitation to a compact closing action.
- Added keyboard skip links to customer, public, supplier and venue layouts without changing their route or access checks.
- Added a branded error boundary with retry and support, instead of a generic failure screen. It does not expose technical diagnostics or promise unsaved edits are recovered.
- Updated privacy information for support messages and added /support to the public sitemap.

## Durable support inbox

Support submissions are now saved in the current website database (Wedding Planner Dev, qkyeitvwscrxbiwamxan). This replaces direct email transport for this form because no Brevo or Resend key is configured. No email integration or booking behaviour is changed.

Confirmed, non-anonymous accounts submit questions with a server-verified owner and email. Body limits and same-origin checks apply. The server-only submit function atomically enforces three requests per ten minutes, and deduplicates retries by account and client-generated submission ID. It uses invoker privileges and is executable only by service_role. Failed storage never reports success. No email notification is sent automatically.

The isolated support_requests table has RLS enabled. Authenticated customers have only SELECT permission, with an owner-only policy. All writes go through verified server routes. Staff access uses the existing staff membership guard, never user metadata. The admin inbox at /admin/support shows the latest 100 requests. Staff can update status and a latest reply; optimistic concurrency checks refuse overwriting another saved change. This is a simple request inbox, not a multi-message chat or email delivery service.

Customers use Help & support > Your requests to review their latest 50 requests, status and latest staff replies. The page tells them to check back and provides Refresh; no email notification or response time is promised. For a follow-up they can submit another question with the reference. Email preparation and copy remain alternatives, including for signed-out users.

## Verification boundaries

No real support messages, supplier emails, booking requests or paid images are sent during verification. API tests mock verified sessions and database operations. Database checks run in rolled-back transactions. Existing order email defaults remain unchanged. Automatic refunds/cancellations, stock changes and booking edits are outside this feature.

Validation: 119 tests passed; TypeScript and the production build passed. A rolled-back database check verified retry deduplication, persistent throttling, owner-only reads and denied direct client writes. No test requests remain. Supabase advisors reported no findings for the new table/function; existing is_staff and leaked-password-protection warnings were left outside this change. The old generated build cache stalled during cleanup; a fresh cache built successfully.
