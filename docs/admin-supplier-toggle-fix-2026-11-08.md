# Admin supplier visibility fix — 8 November 2026

## Exact root cause

The hosted Wedding Planner Dev schema (`qkyeitvwscrxbiwamxan`) matches the repository guard: `supplier_publication_guard` runs `guard_supplier_publication()` before supplier UPDATE. Reactivating an inactive supplier requires its `supplier_reviews.state='approved'`. Material profile changes force `new.active=false` and invalidate review approval. These rules are intentional and remain unchanged.

Read-only inspection found **12 development suppliers, all without a supplier_reviews row**. Existing legacy rows can be active without a recorded review; the old admin create API also defaulted inserts to active. Once paused, those suppliers cannot reactivate through the guard. This is the demonstrated approval-state blocker, not evidence that the active-only trigger breaks approved pause/reactivation.

There was a separate state-reporting defect: PATCH selected only `id` and returned `{ok:true}`. A successful editorial update could therefore force `active=false` without returning that fact. The page then started an unawaited GET, released its busy flag before refresh completed, did not catch network exceptions, and put rejection errors far below the switch. An older GET could also overwrite a newer saved state. API success alone did not prove the requested visibility was applied.

## Fix

- PATCH returns the canonical post-trigger supplier fields, `requestedActiveApplied`, and a concise actual outcome. A trigger-adjusted editorial save explicitly says the listing remains hidden pending approval.
- GET returns current review state and reactivation eligibility from approval plus existing public-photo/listing/image-rights declarations. Review-read failures are explicit, not treated as missing consent. Staff responses are private/no-store.
- The page uses the saved PATCH state directly for visibility-only writes; it does not depend on a second GET or reset unsaved profile fields. Old reads are invalidated. A synchronous in-flight guard prevents duplicate saves.
- The switch shows pausing/reactivating, saved results and errors beside it, and releases busy state after network or authorization/guard failure. A failed status refresh warns that the displayed status may be stale.
- Approved suppliers remain pausable/reactivatable. Hidden unreviewed suppliers show Review required with a range-review link and refresh action. Active legacy suppliers can still be paused, with an advance warning that reactivation needs approval.
- New admin suppliers now start private. Creation cannot request `active=true` as an approval bypass. No existing records were reclassified or auto-approved.
- Supplier list live-product counts are zero while the supplier is paused; product activation flags themselves stay intact.

## Hosted verification — rollback only

`supabase/tests/admin_supplier_toggle.sql` was executed against **Wedding Planner Dev only** through the connector. It creates uniquely identified fictional accounts/suppliers/products in a transaction, exercises the real existing review RPC and triggers, then rolls everything back.

Hosted result:

> PASS: approved pause/reactivate; legacy and draft reactivation refused; editorial override returned; permission guard retained. Fixture rolled back.

The fixture proves:

1. Pausing an approved supplier hides it and its catalogue join from anonymous reads while preserving approval and product activation flags.
2. Reactivation restores anonymous catalogue visibility for that approved fictional supplier.
3. A legacy supplier with no approval cannot reactivate after pausing.
4. A material edit returns inactive and moves the review to draft; reactivation remains blocked.
5. Withdrawing public listing permission remains effective.

Cleanup verification confirmed 12 suppliers, zero reviews, zero fictional toggle suppliers and zero toggle-proof products after rollback.

**No real supplier was paused, published, reactivated, edited, or approved.** There were no email/provider calls. No production database or domain was accessed. **No migration is needed or applied for this fix.** The existing publication and permission triggers were not weakened.

## Tests and integration

- Eight targeted tests passed (seven API/page cases and one full-migration SQL fixture): API actual-state responses, clear conflicts, staff guards, malformed visibility inputs, creation defaults, page-handler canonical state, preservation of unsaved profile fields, stale GET suppression, network failure recovery, and approval-aware toggle eligibility; the isolated PGlite fixture covers rollback and publication semantics.
- Targeted command: `node --test tests/admin-supplier-toggle.test.cjs tests/admin-supplier-toggle-db.test.cjs`.
- SQL fixture also passes against the hosted Dev schema as described above.
- Final `npx tsc --noEmit` and `git diff --check` passed. Initial shared TypeScript run encountered the independently evolving `lib/server/quote.ts:123` nullable `lineTotalPence` error. That independent error was resolved before the final check; the file was not edited by this agent.
- Native authenticated browser interactions are not claimed. Page handlers are exercised with deterministic React hooks and mocked requests; SQL tests exercise the real publication semantics.
- No commits or deployments. Parent owns final integrated checks/build and development deployment. Existing unreviewed legacy suppliers still need genuine range review and recorded permissions to reactivate; this fix does not invent consent.
