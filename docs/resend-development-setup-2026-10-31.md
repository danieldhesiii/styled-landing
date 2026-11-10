> 1 November 2026 verified update: Resend now shows styleduk.com as Verified. The owner saved smtp.resend.com / 465 / resend in Wedding Planner Dev with their key. Resend reports Delivered for the app staff test and Supabase password recovery to support@styleduk.com. No password was changed. Automatic booking messages remain off. The earlier Pending/not-saved observations below are historical; signed callback registration and broader notification tests remain separate requirements.

# Resend development setup, 31 October 2026

Target only `styledukprodprogress` on Vercel and Wedding Planner Dev (`qkyeitvwscrxbiwamxan`) on Supabase. Do not change the live deployment or live authentication service.

## Current evidence

- The owner signed into Resend's `styleduk` team and added `styleduk.com`, Ireland region, with custom return-path `resend`.
- Public DNS lookup returned the matching `resend._domainkey` TXT record, `rresend` CNAME to `rsend-euw1.forge.rmta.net`, and `resend` CNAME to `send.forge.rmta.net`.
- The observed Resend page was still Pending. Public DNS presence is not provider approval or proof of email delivery.
- The existing Brevo test was rejected. Its support ticket contains an account-validation refusal. Do not retry the old provider as an automatic fallback.
- The owner saved RESEND_API_KEY in the development Vercel project, Production environment; the browser shows it as an encrypted secret. No Resend credential has been copied into chat, committed, or entered by the agent. Development Supabase SMTP still needs the Resend key and provider settings saved directly by the owner.

## Required private configuration

Create a Resend sending-access key restricted to `styleduk.com`.

Vercel development project, Production environment:

- `RESEND_API_KEY`: the sending key, server-only.
- `NOTIFY_FROM_EMAIL`: `Styled <support@styleduk.com>`.
- `NOTIFY_REPLY_TO_EMAIL`: `support@styleduk.com`.
- `NEXT_PUBLIC_SITE_URL`: `https://styledukprodprogress.vercel.app`.
- Keep `ENABLE_BOOKING_EMAILS` off until actual delivery and queued recipients have been reviewed.

When both keys exist, transport, delivery ledger and staff readiness now consistently select Resend. A rejected or uncertain Resend attempt does not automatically retry through Brevo.

Development Supabase Auth custom SMTP:

- Host `smtp.resend.com`, port `465`, username `resend`.
- Password: the Resend sending key, entered privately by the owner.
- Sender `support@styleduk.com`, name `Styled`.
- Keep development site URL and existing callback redirect allowlist.

An API key in Vercel does not automatically update Supabase SMTP. Environment changes need a development redeployment before testing.

## Delivery verification and limits

Use Staff > Service checks > Connections and test email to send one message only to the signed-in verified staff account. Confirm it in the actual inbox and Resend email log. Test account recovery separately without resetting the existing staff password or creating unsolicited supplier accounts.

Resend delivery/bounce callbacks are not yet integrated. The existing callback is Brevo-specific and must not be registered with Resend. Staff readiness deliberately does not report a Brevo callback secret as working delivery tracking for Resend. Acceptance remains distinct from delivery. Signed Resend webhook integration is a remaining follow-up before relying on automated delivery monitoring.

The free plan's current daily cap is 100 messages. Keep paid overages and upgrades disabled. Resend is being configured for account and service notifications, not the historic cold vendor outreach.

## Validation

189 automated tests, TypeScript and the production build passed for the provider-selection change. Real Resend sending remains unverified until the private credentials are saved and the inbox test succeeds.

References: [SMTP](https://resend.com/docs/send-with-smtp), [pricing](https://resend.com/pricing), [signed delivery callbacks](https://resend.com/docs/webhooks/verify-webhooks-requests).

Deployment attribution uses the existing repository owner identity, danieldhesiii, as explicitly requested for development publishing. No Git history is rewritten.
