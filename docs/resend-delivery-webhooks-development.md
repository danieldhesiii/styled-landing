# Resend delivery webhooks — development implementation

This change is local development source only. The migration has not been applied
remotely. No provider settings, secrets, emails, deployments or live data were
changed.

## Configuration and rollout

After separately reviewing/applying the new migration, configure the development
Resend endpoint `/api/webhooks/resend` and its `RESEND_WEBHOOK_SECRET` signing
secret. The secret is distinct from `RESEND_API_KEY`; never place it in client
configuration. No setup or provider calls happen automatically.

Both provider webhook routes bypass browser-session middleware; each endpoint
verifies its own authentication before processing callbacks.

The readiness API's `configuration.deliveryWebhook` indicates valid local secret
configuration for the selected provider. It does not assert that a dashboard
endpoint exists, a migration is installed, or an email was delivered. The
PilotReadiness component is unchanged.

Supported events: `email.sent`, `email.delivered`, `email.delivery_delayed`,
`email.bounced`, `email.complained`, `email.failed`, `email.suppressed`.
Unrelated authenticated events are acknowledged without database access.

## Verification and correlation

Verification uses Node crypto with the documented Svix HMAC-SHA256 protocol:
`svix-id.svix-timestamp.rawBody`, the base64-decoded `whsec_` secret, constant-time
comparison, any matching space-delimited v1 signature, and a 300-second attempt
timestamp tolerance in either direction. Bodies are bounded to 64 KiB and verified
before UTF-8 decoding or JSON parsing. Invalid signatures return 401; invalid
supported event shapes return 400; oversized bodies return 413; database errors
return 503 for retry. Responses and logs contain no payload or provider errors.

Tracked Resend sends create one private message per normalized recipient, each
with an independent run, ledger row and provider send ID. All rows are inserted
before sending; no Resend recipient sees the other recipients. Partial acceptance
or any uncertain outcome returns `unknown`, which the existing queue dispatcher
and manual retry endpoint exclude from retries. Staff must review the individual
recipient ledger before scheduling any separate follow-up. All recipients being
explicitly rejected remains safely retryable. Ledger errors after acceptance
never turn the result into a retryable whole-job failure. Brevo keeps its existing
group-send behavior.

Tracked sends include `tags: [{name: 'styled_delivery', value: runId}]`. Resend
returns this as `data.tags.styled_delivery`. Each tracked message has exactly one recipient; the parser deliberately
requires a single impacted address. Ambiguous legacy multi-recipient outcomes
are rejected rather than fanned out.
Correlation uses `data.email_id` (the API send ID, not the SMTP Message-ID).

The service-only RPC matches provider and recipient hash plus every supplied
message/run reference. A run tag can bind an early callback when the message ID
is unset. Conflicting references and ambiguous matches return false; they never
fall back to a different run or provider. Authenticated untracked events are
acknowledged without storing anything. Early callbacks for newly tracked sends
are supported through the run tag; old sends without a tag require an already
recorded message ID.

Resend event keys use the stable Svix event ID and recipient hash. Retries are
idempotent, with provider namespaces in the RPC; existing Brevo event keys and
the six-argument Brevo RPC remain compatible. Brevo callbacks now explicitly
supply their provider to the seven-argument RPC.

Lifecycle status is monotonic by severity: accepted, deferred, delivered, failed,
blocked, bounced, complaint. Delivery cannot regress to sent/delayed; terminal
failures stay visible even with reversed arrival order or equal timestamps.
`last_event_at` retains the latest event time and `delivered_at` the earliest
observed delivery time. Late send responses only update pending rows.

Only sanitized identifiers, recipient hashes, status and timestamps are stored.
Subjects, email addresses, error details and raw payloads are not persisted.

## Validation

- `node --test tests/resend-webhook.test.cjs`: signature vector from Svix,
  raw-byte/Unicode integrity, rotation signatures, timestamp boundaries,
  invalid signatures/configuration, sanitized parsing, endpoint responses,
  tracking tags, late send-response guard, provider-aware readiness, middleware
  bypass, multiple-recipient isolation and partial-acceptance retry exclusion.
- `supabase/tests/resend_delivery.sql`: rollback-only fixtures for strict
  correlation, provider isolation, duplicates, key conflicts, ambiguous matches,
  forward/reverse event order, historical delivery and RPC permissions.
- Both the existing `supabase/tests/launch_readiness.sql` and the new SQL suite
  were executed using PGlite 0.3.14 against the original launch-readiness
  migration plus this migration, with minimal local dependency tables/roles.
  This checks PostgreSQL behavior without accessing a hosted database; it does
  not replace testing a full local Supabase migration rollout.

The migration was created with `supabase migration new` after consulting CLI help.
No application dependencies were added.

## Official references

- [Resend raw-body signature verification](https://resend.com/docs/webhooks/verify-webhooks-requests)
- [Svix manual verification and published test vector](https://docs.svix.com/receiving/verifying-payloads/how-manual)
- [Standard Webhooks implementation and five-minute tolerance](https://github.com/standard-webhooks/standard-webhooks/blob/main/libraries/javascript/src/index.ts)
- [Resend tags returned in callbacks](https://resend.com/docs/dashboard/emails/tags)
- [Resend per-recipient event visibility and tag shape](https://resend.com/changelog/webhook-event-visibility)
