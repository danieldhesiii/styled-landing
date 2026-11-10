# Supplier stock import preparation

Development changes, 1 November 2026. This describes CSV import behaviour,
not approval to publish a supplier or take a real booking/payment.

## Lifecycle and review

Staff choose a supplier; the vendor endpoint takes the supplier from the signed-in
account and ignores a client-supplied supplier ID. The server parses the original
CSV for preview and re-plans from that CSV at apply time. Preview writes nothing.
Invalid rows are reported and skipped; validated creates/updates go through the
existing service-role-only `apply_stock_import` transaction. Products absent from
the file are reported and left untouched. No deletion or review approval happens.

Both staff and vendor imports create hidden products. `active=yes` cannot publish
or reactivate a hidden product. `active=no` can hide an existing product. Price,
category, unit, quantity rule, lead time, styles, image and note changes explicitly
hide the product in the plan and write payload. The database publication guard
also returns the supplier review to draft for these changes. Submit the range for
review again; staff approval is a separate action with listing, photo, price and
terms declarations and a matching snapshot. Capacity-only changes retain current
visibility and do not invalidate the reviewed catalogue snapshot.

The UI clears previews when the supplier/endpoint changes, ignores late responses
from the previous scope, and prevents file/text changes during a request. Warnings
on unchanged rows remain visible, and warnings from the apply-time re-plan remain
visible after success.

## Stock information

- A blank capacity cell or omitted capacity column leaves existing stock unchanged.
- A new product requires a numeric capacity, including zero, or an explicit
  `made to order` value (also `made-to-order`, `mto`, `unlimited`, `no limit`, `bespoke`).
- Unknown placeholders such as `n/a`, `none` and `-` are errors, not unlimited stock.
- Explicit made-to-order maps to the existing nullable capacity schema. It means
  no stock limit is recorded; it is never evidence of verified availability.
  Existing null capacity gets the same qualification in the preview.

The downloaded template uses an explicit made-to-order value. Older files with
blank capacity for new products need a number or that explicit value before apply.

## Full hire-period warnings

The planner computes each product's peak concurrent reserved quantity from live
`requested`, `confirmed` and `deposit_paid` orders, excluding declined supplier
lines. Each inclusive range uses the database availability precedence:

- Start: `stock_start`, then `needed_date`, then `orders.wedding_date`.
- End: `stock_end`, then `return_date`, then `orders.wedding_date`.

Recorded stock boundaries already include preparation and return buffers, so the
planner does not add them again. End dates are inclusive; a later hire starting on
the next day does not overlap. A sweep of dated quantity changes finds the peak
without expanding every day. Hires ending before today are ignored, while past
weddings with stock still out are included. Same wedding dates do not combine
non-overlapping item hires; different weddings can overlap.

Supplier catalogue and reservation reads are paginated in primary-key order;
product ID filters are batched. All reads stay within the selected supplier.
A failed read aborts planning/apply rather than implying zero reservations.
Malformed or undated reservations produce an explicit incomplete-check warning.
Capacity below the known peak produces an advisory warning and can still be saved.

These warnings compare recorded capacity with Styled order commitments. They do
not check external/shared inventory, calendar coverage, date blocks/overrides or
basket holds, and do not certify availability. Confirm full hire dates, preparation,
collection, external bookings and stock with the supplier before quoting/booking.
Preview and apply are separate reads, not a locked stock snapshot; the import
transaction and booking availability checks remain separate operations.

## Constraints inspected before implementation

No migration was changed or applied. The implementation follows:

- `20261012100000_stock_aware_looks_and_import.sql`: transactional, supplier-scoped
  updates; absent payload keys preserve values; null capacity maps to made-to-order;
  import execution restricted to service role.
- `20261024094330_item_hire_and_venue_booking_periods.sql`: item return dates and
  hire-period constraints, legacy wedding-date fallbacks.
- `20261028092449_supplier_workspace.sql`: bounded product/supplier details.
- `20261031023755_supplier_booking_operations.sql`: buffered stock dates,
  full-range availability, supplier review snapshots and publication guards.
- `20261031024810_booking_workflow_hardening.sql` and
  `20261031030437_booking_service_role_actor.sql`: subsequent workflow definitions.
- `20261031025106_booking_stock_buffer_range.sql`: internal checks can cover up
  to 59 elapsed days including buffers; request entry retains its hire limit.
- `20261031025749_supplier_photo_permissions.sql`: public photo permission and
  approved snapshot required before range publication.

## Validation

`node --test tests/stock-import.test.cjs` exercises the real parser, planner and
apply function with a filtering/paginating database mock, plus the vendor route.
Coverage includes overlapping/different/disjoint weddings, buffers, inclusive
boundaries, leap day, ongoing past hires, legacy nulls, live-state filtering,
malformed reservations, later-page peaks/errors, unknown stock, private review,
foreign IDs, duplicates, unchanged fields, fresh apply-time planning and forged
vendor request scope. These are behavioural tests; no remote database is used.
