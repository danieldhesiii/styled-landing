# Supplier pilot workspace

31 October update: [Persisted booking operations](booking-operations-build-2026-10-31.md) now adds real development quote/acceptance, review and operations records beside the fictional pilot. Earlier template-only descriptions below describe the original iteration. Staff access has since been enabled for the account selected by the user.

Development only, 30 October 2026. This builds the meeting requirements into reviewable templates while retaining existing customer, supplier and venue workspaces.

## Where to open it

- Staff fictional walkthrough: `/admin/pilot`. The former public `/business/pilot-workspace` bookmark redirects into the guarded staff area; the public business-page link has been removed.
- Staff: `/admin/pilot`, through **Staff section > Pilot workflow template**. Requires existing staff access.
- Real open request monitoring: `/admin/requests`. Staff can now save shared assignments, follow-up dates and private notes.
- `/business/request-tracker-preview` now redirects to the guarded `/admin/requests` area. Staff can choose Try example requests there.

## What can be tried

Four views share one page-memory example: Customer request, Supplier replies, Admin tracking and Supplier setup. Refresh or Reset example clears everything.

1. Choose example products, full hire dates, venue and optional setup/collection/access windows. Use example dates avoids needing to type dates for a demonstration.
2. Per-supplier minimums apply independently. A package is a complete example SKU. Quantity limits are fictional, not claims about Simon or Sarah Mae.
3. Submit with no charge or reservation. Suppliers manually check their own system, shared components, crew and full hire period.
4. Each supplier replies available, alternative needed or cannot fulfil. Installed versus hire-only is recorded. Delivery, setup, collection, extra hire and refundable security must be entered explicitly; blank is unknown and zero means included/no charge. Installed service requires the example venue check.
5. Issue a full, versioned example quote only after all required checks. It expires after 72 hours, a demonstration rule rather than agreed supplier terms. Security is separate from the service total; all example prices are VAT-inclusive illustrations.
6. Customer reviews and accepts the current quote. A date, venue, access, product, price or commercial supplier change invalidates the old acceptance. Assignment/notes do not invalidate it.
7. Admin records an example booking after current acceptance. This is a simulated state, not fulfilment of real contract/payment steps.
8. Try a return inspection: condition evidence and claimed amount, then recorded notification, then dispute/resolution. Steps are ordered. No charge, deduction, refund or actual notification occurs.
9. Supplier setup illustrates private range, image permission and terms approvals. Removing approval blocks the practice request/quote. Real supplier material and publication approval remain outstanding.

The template has no database writes, local-storage persistence, emails, paid generation, stock reservation or real payments. Venue images are conspicuous illustrative placeholders, not product photography. No supplier licensing, model training, legal terms or specific commission is promised.

## Working development changes outside the template

- New-look supplier selection in the existing visualiser is enforced in server composition, before autofill and substitution, intersected with venue permission. Scope and venue policy are recorded in the look report. Refinements inherit the original scope and recheck current eligibility; changes to scope/policy or now-ineligible parent items require a new look. New supplier-only looks with no eligible pieces fail clearly. Missing image-engine configuration still returns an explicitly labelled illustrative placeholder, never a generated supplier product claim.
- Existing supplier `minimumOrder` guidance now has explicit hire-item subtotal meaning. The public catalogue includes its parsed pence value. Browser basket and shared server pricing reject under-minimum requests independently for each supplier. Transport/security do not contribute. Actual supplier values and interpretation still require agreement before entry.
- Basket totals say estimated item subtotal and explain that delivery, setup, collection and security remain to be agreed. Removed the generic 25% deposit figure from this basket, avoiding a proposed deposit being mistaken for an approved payable amount. Historical order/deposit models have not been migrated into a new payment system.
- Staff tracker PATCH appends an existing private `order_events` record of type `supplier_tracking`. It checks staff access, same-origin JSON through the existing guard, valid IDs/date/owner/note, an open order and a supplier actually on that order. It never changes supplier replies, order status, inventory, quote or money, and sends no messages. Failed saves are reported.
- GET loads at most 100 open orders and the latest 1,000 tracking records for them with visible truncation notices. Latest saved assignment/due date wins, while earlier notes remain in history. This is not optimistic locking; coordinate edits and refresh to see another staff member's save. The order history remains the wider audit source. Example tracker changes remain temporary.

## Intentionally not activated

Real quote persistence/customer acceptance, binding contract roles, payment collection, supplier notification delivery verification and reminders, external booking integrations, shared-component automation, technical installation approval, actual supplier publication and media transfers remain release-gated. Existing order management remains authoritative for actual orders. A working fictional demonstration does not make these production systems complete.

## Verification

Automated checks cover the complete state journey, supplier minimums in mixed baskets and server pricing, scope intersection before composition, quote expiry/version changes, approval and site-check failures, cancellation, claim sequencing, private tracking validation and write isolation, plus existing regression checks. Browser verification covers customer > supplier > quote > acceptance > admin > return review, minimum-spend errors and responsive views. Read-only development schema queries verify catalogue service fields/private event fields; no schema or supplier data changes are needed. No paid image request, real supplier message or real payment is part of verification.

The development repository/site only are released. `styleduk.com`, the live repository and live database remain untouched.


## 31 October access correction

Internal pilot and request-tracking demos are staff-only, including direct bookmarks. Customer and supplier accounts do not receive staff access. The existing server-side staff membership guard remains authoritative, independently of hidden navigation links. Development currently has no configured staff account; an explicitly chosen account must be provisioned before founders can access these tools. No account access or password was changed by this correction.
