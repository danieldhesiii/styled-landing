# Supplier request tracker prototype

31 October update: [Persisted booking operations](booking-operations-build-2026-10-31.md) now adds real development quote/acceptance, review and operations records beside the fictional pilot. Earlier template-only descriptions below describe the original iteration. Staff access has since been enabled for the account selected by the user.

Development only, 30 October 2026. This is a workflow template, not a completed booking/payment system.

## Entrances

- Staff: `/admin/requests`, selected through **Staff section -> Request tracker**.
- Fictional walkthrough: sign in as staff, open `/admin/requests`, then choose Try example requests. The old `/business/request-tracker-preview` bookmark redirects to that protected area.

## Current requests

The staff-only read API `/api/admin/request-tracker` shows up to the oldest 100 orders still marked `requested`, grouped into one record per supplier per order. Supplier identity, not display name, determines grouping. The response contains only selected fields and is private/no-store.

This view reads supplier/order decisions without changing them. Staff can save shared assignments, follow-up dates and private notes through a guarded PATCH that appends `supplier_tracking` records to existing private order history. The current order must remain open and contain the selected supplier; malformed fields and failed saves are rejected. Latest assignment/due date wins, with note history retained. There is no optimistic locking: refresh and coordinate simultaneous edits. No supplier message, booking, stock or payment change occurs.

It shows line-level availability responses and full item hire dates, last recorded availability response, an indicative follow-up threshold and links to existing order management/history. It does not verify outbound email delivery or claim the supplier received a notification. Responses can have been recorded by staff or suppliers.

“Availability agreed” leads to **Awaiting full quote**, not a confirmed booking. Alternative-needed and partial states remain visible. Waiting after 24/48/72 hours is an adjustable planning aid, not a contractual supplier deadline. Counts cover the loaded subset, not all company activity, and may contain several supplier requests for one customer request. There is a visible truncation notice beyond 100 orders.

## Example workspace

Five fictional supplier requests illustrate waiting, partial responses, unavailable items, availability agreed/full quote outstanding, and a quote-review stage. Two requests share a customer reference to demonstrate a mixed-supplier enquiry.

Users can try assigning Kamil or Dan, a follow-up date, an internal note, a simulated availability reply, an example quote-received stage and closing a fictional record. Activity is recorded in component state and resets on page refresh. No note, assignment, reminder or simulated response is written to the database or shared between browsers. No notification, stock change, reservation or payment is performed. Closing an example never closes an actual order.

## Boundaries for the next iteration

Shared follow-up edits now persist with staff author identity and field validation. The latest 1,000 follow-up records for the loaded orders are read; a visible warning explains truncation. Review retention and concurrency controls before scaling operations. Avoid local storage for real customer notes. Full fictional quote/customer acceptance templates are at `/admin/pilot`.

Email send/receipt events, reminders, quote documents/versions, customer quote acceptance, partial-order decisions and payment gates are separate future work. Do not infer them from an example stage label. Keep existing operational records authoritative until the shared workflow is implemented.

## Verification

- Automated tests cover supplier-ID grouping, partial replies, full dates, quote-pending semantics, follow-up thresholds, API denial for anonymous/nonstaff, bounded read shape, guarded event-only follow-up writes, pagination bound, no-store headers and database errors.
- Existing development database was read with the new selected columns and relationship to verify compatibility. No data, accounts, permissions or schema were modified.
- Browser checks cover fictional assignment, notes, availability response, follow-up filtering, no matching results and mobile selection/width. Deployment verification is completed separately before handover.


## 31 October access correction

Internal pilot and request-tracking demos are staff-only, including direct bookmarks. Customer and supplier accounts do not receive staff access. The existing server-side staff membership guard remains authoritative, independently of hidden navigation links. Development currently has no configured staff account; an explicitly chosen account must be provisioned before founders can access these tools. No account access or password was changed by this correction.
