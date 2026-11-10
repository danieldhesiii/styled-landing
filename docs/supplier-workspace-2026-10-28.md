# Supplier workspace development update

28 October 2026. Development only: `styledukprodprogress` and Supabase `qkyeitvwscrxbiwamxan`. No public-domain release.

## What is available

- Separate supplier navigation: Overview, Requests, Products, Availability and Business setup. Phones use a labelled section selector; customer and venue workspaces remain separate.
- Overview highlights requests needing a reply and setup steps. Setup completion does not publish a business automatically.
- Suppliers can create a hidden product individually, cancel before saving, edit prices and descriptive details, add a photo, and choose visibility. Spreadsheet import remains available inside Products. Only active businesses and active products appear to customers.
- Full edits check the last saved revision to avoid silently overwriting another edit. Creation retries use a stable product identifier. Ownership and publishing fields are never taken from the submitted product data.
- Requests show delivery and return dates per item. Suppliers respond to selected items, with a reason or alternative when declining. A supplier availability response does not confirm the overall booking or take payment. Existing staff review remains in place.
- Business setup records delivery coverage, delivery/collection/setup options, descriptions, optional minimum order and hire policies. Private contact details and commission remain private. Published guidance must still be confirmed in the final quote.
- Availability separates stock quantity from blocked dates and includes an acknowledgement of a supplier's review.
- Customer product details display dimensions, materials and hire terms supplied by the business. Supplier profiles display their published delivery and hire guidance.
- Staff Service checks show whether transactional email is configured and link to request, support and onboarding queues. No key values are displayed.
- A read-only tour at `/business/supplier-tour` uses clearly marked example data. It is a preview, not another login or working supplier account.

## Data and security

Migration `20261028092449_supplier_workspace.sql` adds bounded JSON objects for supplier service guidance and product details. Public column grants cover only the published guidance; existing row visibility rules remain in force. Existing supplier ownership checks, stock checks and staff order review are retained. New JSON handlers enforce size, type and same-site origin checks. Product inputs validate prices, quantities, categories and lengths.

## Validation

All 128 automated tests pass. Automated tests cover input validation, same-site requests, bounded request bodies, ownership scoping, hidden product creation, retry behaviour, stale edits and selected-line supplier responses. Manual browser checks used a temporary synthetic account on the development database: cancel without creating, create a draft, publish a product, save a full edit, save business rules, review availability and confirm one of two items with different hire dates. The unselected item remained pending and the order remained under review. Narrow-phone layout was checked for page overflow. Synthetic accounts, products and requests are removed after testing.

## Before a real pilot

- Use permissioned supplier photos and verified descriptions, prices, service areas and stock.
- Agree commission, deposit, cancellation and damage terms with each supplier. Optional policy fields do not create charges or contracts.
- Configure a transactional email provider and test delivery before relying on email alerts. Without a provider, staff must check the queues directly.
- Run a real supplier onboarding session and an agreed test request, including unavailable items and different item dates.
- Payments and automatic payouts remain disabled. Calendar or spreadsheet integrations require individual setup and validation.
- Promote this work to the live repository only after explicit release approval and a live-schema review.

Security advisors report no new table-policy exposure. Existing service-only tables intentionally have no client policies; the staff-check function is intentionally callable for access checks. Compromised-password protection remains a separate auth hardening task.
