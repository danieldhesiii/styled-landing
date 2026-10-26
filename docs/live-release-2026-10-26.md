# Public release and separate development, 26 October 2026

## Completed

The user approved the live database upgrade and domain release. The current
application is published on https://styleduk.com and https://www.styleduk.com.
Application snapshot: `57ca861146ff4f25003b40e0750c586c2c575cb8`.
Live release commit: `168632c3a6059dfb43bc4b4e419bc8eee6aeda1d`.
Live deployment: `dpl_6YSDyvyT37FMkpEgUcvwjgSR6UTY`.
The release used an identical application tree, with the previous live main as
its parent. Daniel authored the commit through his authenticated GitHub account.
Subsequent release-record commits change documentation/migrations only.

## Environments

| Purpose | Vercel project | GitHub repository | Database |
| --- | --- | --- | --- |
| Public styleduk.com and www.styleduk.com | styled-landing | danieldhesiii/styled-landing, main | Wedding Planner, yfwqcidkfjzpwbylgnug |
| Development styledukprodprogress.vercel.app | styledukprodprogress | danieldhesiii/styledukprodprogress, main | Wedding Planner Dev, qkyeitvwscrxbiwamxan |

Routine work stays in the development checkout at
`/Users/kamil/Desktop/styledukprodprogress`. Changes there do not automatically
publish to the public domain. Do not share their database credentials, copy
private development data into production or move the public domain onto the
development project. No new paid project or database branch was created.
Accounts and saved plans in development are separate from live accounts/plans.

## Database upgrade

Applied the nine reviewed migration features: venue foundation, supplier bio,
saved products, private planning workspace and hire availability, discovery
locations, venue marketplace, venue messaging/viewing rules, per-item/venue hire
periods and durable support inbox.

A live-only legacy four-argument product_availability function had default
arguments that collided with the new three-argument function. Preserved its body
and four-argument callers, removed only its default arguments, restored the
original service-only grant, and applied the workspace migration atomically.
The compatibility prefix is recorded in the workspace migration and in
20261026160740_legacy_availability_overload_compatibility.sql. No stock rows were
changed. Both daily and hire-period queries returned all 36 products afterwards.

Existing records were preserved: 18 accounts, 36 products and 8 orders before and
after the upgrade. Development users, photos, plans and orders were not copied.
RLS is enabled on new tables. Existing anonymous-owner policy/advisor warnings,
is_staff and password-protection settings were not broadened or suppressed.
Support remains account-scoped with verified server submissions and staff-only
replies; it does not send automatic notification emails.

## Configuration and validation

The live Vercel project retains its own existing Supabase and OpenAI keys. Its
image model matches development. NEXT_PUBLIC_SITE_URL is https://styleduk.com;
notification sender/reply-to are support@styleduk.com. No mail-provider key was
added. Supabase Site URL is https://styleduk.com; callback allowlists cover
/auth/callback on the apex and www domains, including its local next query.

119 automated tests passed. Vercel production build reached Ready. Public HTTPS
pages, catalogue, venues, support and login were checked. No real support
messages, bookings, outgoing emails or paid image generations were submitted.
The application release snapshot had also passed TypeScript and local build.

## Rollback

Previous live main: `936f54d70906b6f3fb36e7c6ad2fd003b5c8d658`.
Backup tag: `before-marketplace-release-20261026` in styled-landing.
Previous deployment: `dpl_DeDjy7s3DcWS6T6uKb8vcoh3VLRD`.
Previous URL: https://styled-landing-cfrzycfmk-valorax-ai-s-projects.vercel.app

Use Vercel rollback to restore application serving if needed. It does not undo
additive database migrations. Do not delete live tables or customer data as an
application rollback step. The legacy four-argument stock function is retained.
