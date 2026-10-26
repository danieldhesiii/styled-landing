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

## Direct website email

The support endpoint uses the existing server-verified account session. Anonymous, missing and unconfirmed sessions cannot send. Its recipient is fixed to support@styleduk.com; the reply-to comes from the verified account, never a supplied email or user ID. Input/body limits, same-origin enforcement, HTML escaping and a bounded per-instance throttle guard the new endpoint. No new tables, database grants or RLS changes are required.

Existing order email defaults remain unchanged. An optional reply-to parameter allows support staff to reply to the customer when direct email is configured. Tests verify both default and explicit reply behaviour.

Production inspection found sender/reply settings but no BREVO_API_KEY or RESEND_API_KEY. Until one is configured, the interface offers Prepare email and Copy message, rather than a send button that would fail. GET /api/support reports only whether email is configured, never a credential. Once configured and deployed, direct sending is enabled automatically. A successful provider response is required before the form reports a sent message. A provider failure retains the draft. Provider acceptance is not a delivery receipt.

The throttle is process-local and is not a durable distributed ticketing or deduplication service. Support replies are handled in the mailbox, not a new in-account conversation history. A support message never changes or cancels a booking automatically.

## Review boundaries

No live support messages, supplier emails, booking requests or paid images are sent during verification. Route tests use mocked sessions and email transport. Credentials are not read or committed. A full ticketing inbox, live chat, automated refunds/cancellations and account deletion are not added: they need agreed operations and data policies; the support area provides a route for those requests now.
