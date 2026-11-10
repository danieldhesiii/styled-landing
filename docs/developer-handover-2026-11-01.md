# Developer handover — 1 November 2026

This work is development-only in `/Users/kamil/Desktop/styledukprodprogress`. No commit, push, deployment, dependency installation, database call, new account or secret creation was performed for this handover. Other agents own webhook/import and application changes in the shared working tree.

## Environment boundary

| Purpose | Repository / site | Database |
| --- | --- | --- |
| Development | `danieldhesiii/styledukprodprogress`, `main`; `https://styledukprodprogress.vercel.app` | Wedding Planner Dev, `qkyeitvwscrxbiwamxan` |
| Live — excluded | `danieldhesiii/styled-landing`; `https://styleduk.com` | Wedding Planner, `yfwqcidkfjzpwbylgnug` |

Follow `AGENTS.md`. A public release requires a separate explicit request and live-schema verification. Vercel's environment label **Production** can refer to the development project's main deployment; it does not identify the live project. Check project identity and target URLs rather than inferring identity from that label.

## Exact safe local preflight

Run from a trusted local checkout with the existing Node installation:

```sh
cd /Users/kamil/Desktop/styledukprodprogress
node scripts/readiness-preflight.mjs
```

No keys or arguments are required to run it. Do not place connection strings or keys on the command line. It reads literal assignments from `.env`, `.env.local`, `.env.development`, `.env.development.local`, `.env.production`, `.env.production.local` when present, plus the process environment. It never sources a file, expands a variable, authenticates credentials, contacts a database or invokes a deployment command. It probes `git`, `pg_dump`, `pg_restore` and `psql` with `--version` and runs local Git inspection only, with optional index writes and filesystem-monitor execution disabled. Tool output, environment values, repository URLs and changed filenames are withheld.

Every configured target in every inspected layer is checked, including a file value overridden by a safe process value. Development backup URLs must address the exact development project; restore URLs must use loopback and a `styled_restore_*` database. Live, unknown, malformed and dynamic targets are refused. Unsupported/conflicting dotenv syntax is refused rather than evaluated. Ordinary sender addresses such as `support@styleduk.com` are not deployment targets.

Statuses have deliberately narrow meanings:

- **VERIFIED:** a local check passed, such as allowed URL shape, executable availability, key encoding, development project-link name or clean Git status. Credential presence is not authentication or proof that it belongs to the correct project.
- **MISSING:** absent configuration/tools, an unidentifiable link, or an unreviewed/dirty working tree.
- **REFUSED:** an unsafe/unknown target, conflicting/unreadable configuration, invalid key, live/unknown Git origin, enabled automatic sending, or ambient libpq routing/service/options overrides.
- **UNVERIFIED:** real backup/restore, Storage recovery, server/client compatibility and hosted/business evidence. These are never upgraded by local encryption tests.

Exit **2** means refused/unsafe. Exit **1** means incomplete or externally unverified. This inspection intentionally cannot return a release-ready result: real recovery and hosted checks remain unverified even if every local prerequisite is supplied. Do not bypass that result or use it as deployment approval. No report file is written.

The local Vercel project name and optional `supabase/.temp/project-ref` are checked without hosted lookups. Legacy Vercel link metadata containing only opaque IDs is insufficient evidence and reports missing. All fetch and push URLs for origin must identify the development repository. Branch must be `main`, with no tracked changes or untracked files, before the local Git gate passes.

## Actual local findings

The preflight was run on 1 November 2026 after these edits. It exited **1**, with no refused checks:

- Development/local target allowlist checks passed for the configured targets. Public Supabase URL, public key and server service key were present locally; no value was printed or credential authenticated.
- Local Vercel link identified `styledukprodprogress`. Git fetch/push origin identified the development repository and branch was `main`.
- Git was dirty, including these changes and concurrent agents' work. Nothing was committed, staged, pushed, reset or removed by this task.
- `STYLED_DEV_DATABASE_URL`, `BACKUP_ENCRYPTION_KEY` and `STYLED_LOCAL_RESTORE_URL` were missing.
- `pg_dump`, `pg_restore` and `psql` were missing. Node and Git were available.
- The optional local Supabase project-ref link was missing. This is not a claim that the hosted development project is missing or incorrectly configured.
- Automatic booking sending was off or unset locally; the owner separately confirmed hosted automatic booking emails **Off**.
- Actual database export/restore, Storage byte recovery, PostgreSQL compatibility/TLS and hosted checks remained **unverified**. No backup success was recorded.

These are observations of the local checkout at inspection time, not a permanent hosted-state assertion. Rerun before reviewing a development release.

## Updated email evidence and older documents

Owner-reported evidence supplied in this chat on **1 November 2026** supersedes the pending/unverified email statements in `docs/resend-development-setup-2026-10-31.md` and the earlier Brevo-blocked readiness snapshot:

- Resend domain: **Verified**.
- Application test email to `support@styleduk.com`: **Delivered**.
- Supabase password-reset email to `support@styleduk.com`: **Delivered**.
- Automatic booking emails: **Off**.
- Webhook configuration: **pending**, owned separately. Do not equate those successful messages with configured delivery callbacks or tested webhook processing.

The preflight does not independently recheck the provider console or inbox. The older documents remain historical snapshots; use this dated update for current email status. No new test email or password reset was sent by this task. Supplier material, permissions, commercial decisions and real venue/pilot evidence still require their own records; email delivery does not establish those approvals.

## Backup changes and remaining recovery work

Owned implementation: `scripts/backup-codec.mjs`, `scripts/backup-development.mjs`, `scripts/restore-development-backup.mjs`, `scripts/readiness-preflight.mjs`, `tests/readiness-preflight.test.cjs`, and this document. No application/webhook/import files or dependency manifests were edited by this task.

Concrete fixes:

- Resolve the backup folder and existing ancestors through symlinks before enforcing the outside-repository boundary. This closes the former lexical-path bypass, including a not-yet-created child of a symlink. Existing destination folders must belong to the current user and have no group/other permissions. Created folders use `0700`; encrypted archive files use exclusive creation and `0600`.
- Pass a small tool environment rather than copying all process secrets and ambient libpq settings. `PGHOSTADDR`, service files, options and alternate password files cannot override the validated destination. Explicit passwords remain in the child environment, never command arguments; password-file fallback is disabled. Child processes do not prompt for passwords. IPv6 loopback is passed to libpq without URL brackets.
- Reject URL query/fragment routing and invalid/control-character encodings. Backup sources require the development database/project allowlist; restore targets require loopback and the dedicated database-name prefix. Backup key input must be canonical base64 for exactly 32 bytes. Existing AES-256-GCM archive format remains compatible.
- Authenticate the archive before querying a restore target. Refuse targets with user tables, views, materialized views, sequences or foreign tables. Restore uses a single transaction and stops on errors. Filesystem, cryptography and subprocess errors use fixed messages rather than reflecting private paths, passwords or child diagnostics.

Real backup prerequisites remain missing. Arrange the existing development-only connection privately, a separately held independent backup key, compatible PostgreSQL clients/TLS trust, an owner-only archive destination outside the repository and a fresh isolated local restore database. These scripts read **process environment only**; they do not automatically load `.env.local`. The preflight's presence check from local files therefore does not mean a subsequent backup process has received those values. Supply them through your trusted private environment mechanism; do not paste them into chat, Git or command arguments.

Backup and restore entry points, for a later explicitly arranged recovery exercise, are `node scripts/backup-development.mjs /absolute/private/archive-folder` and `node scripts/restore-development-backup.mjs /absolute/private/archive.dump.enc`. Restore additionally requires `ALLOW_LOCAL_RESTORE=yes` in the process environment. **Neither command was run against a real database in this task.**

Before that exercise, independently confirm the local endpoint is a disposable database, not a tunnel/proxy to a hosted service. URL guards establish allowed connection syntax, not physical server identity or freshness. Provision required Supabase roles/extensions in the isolated environment, keep other clients out, and use trusted private directories: filesystem permission checks do not defend against a malicious process running as the same user swapping paths concurrently. Dumps are buffered in memory with a 256 MiB output limit and two-minute execution timeout; larger exports require a separately reviewed approach.

An encrypted database dump excludes Storage file bytes. Recovery evidence must include the archive/time, independent key custody, compatible server/client/TLS checks, a successful isolated restore, schema/roles/extensions and meaningful row-count comparisons, plus separate restored Storage media checks. Keep private identifiers/counts in the private recovery record rather than this public-source handover. Encryption round trips, fake command fixtures and a zero exit from `pg_restore` alone are insufficient recovery evidence.

## Verification

Focused test command:

```sh
node --test tests/readiness-preflight.test.cjs tests/launch-readiness.test.cjs
```

The new suite contains 11 meaningful tests: keyless inspection, no secret reflection, no database command invocation in preflight, hidden/overridden live targets, malformed/unreadable dotenv data, missing tooling, deployment and push-origin isolation, key/tamper/wrong-key rejection, URL routing controls, inherited-environment isolation, private canonical path checks, CLI refusal before database invocation, and a fictional archive round trip through temporary fake PostgreSQL executables. The fake fixtures verify encrypted file permissions and atomic restore arguments; they never contact a database. Nonempty and unauthenticated fixture restores cannot reach `pg_restore`.

All **242** tests passed in the shared checkout during this task, including concurrent agents' tests at that moment. Syntax checks passed for all four backup/preflight modules. No build or hosted/SQL/browser validation was performed for these dev-only script changes. Concurrent application work may change subsequent suite counts or results; its release review remains with its owners.
