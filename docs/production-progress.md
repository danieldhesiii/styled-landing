# Latest planning phase

My wedding, separate delivery dates, private boards and postcode discovery are implemented. See [wedding-workspace.md](wedding-workspace.md) for scope, verification and supplier/payment decisions. Earlier sections below record previous milestones.

# Production build implementation

Updated 22 October 2026. Implements `docs/production-build-plan.md` in the root application at `/Users/kamil/Desktop/styledukprodprogress`.

## Completed

### Venues

- Published venue directory with county, setting and guest-capacity filters, correct pound prices, and empty/error states.
- Venue detail pages with photography, native-dialog lightbox, allowlisted video/map embeds, modal Matterport walkthrough and styling packages.
- Month-grid date selection backed by a public endpoint that returns only blocked dates. Booked-date enquiries are rejected server-side; other dates remain requests until staff confirm them. No payment is taken in this flow.
- Validated, rate-limited private enquiries with capacity checks and venue/package ownership enforcement.
- Venue partnership applications stored in the existing private applications table as `category = venue`.
- Staff venue publishing/editing, packages, enquiry status management and photography uploads. Draft venues stay private.
- Venue and style deep links into the studio, preserved across sign-in. Venue source photography is loaded into the visualiser.

### Suppliers

- Public business story and product-to-basket links, including supplier filtering in the studio.
- Supplier joining page and application form using the existing application workflow. Commission remains agreed upfront; no invented rate or partner logos.
- Supplier dashboard checklist for logo, products and availability review; editable business story and clear stock-import steps.
- Supplier logo/product photo uploads, plus staff logo upload. Images are checked, metadata stripped, resized and converted to WebP before storage. Accepted file types are JPEG, PNG and WebP up to 5 MB.
- Supplier writes are scoped to the authenticated supplier. Uploaded images use supplier-specific storage paths.

### Marketplace and visualiser

- Catalogue first, with category/search/supplier/style/price filters, price sliders, sorting and removable filter chips.
- Product photography, supplier links, unit prices, recorded reviews, date-aware availability, lead times and inline quantity controls.
- Supplier browsing with available logos, category summaries and product counts.
- Visible catalogue/saved-looks/orders navigation, compact wedding details and a collapsible visualiser.
- Mobile basket bottom sheet, full-screen filter/visualiser dialogs and persistent basket/visualiser actions.
- Uploaded supplier product photos can be passed to the image model as references. Server image loading is restricted to bundled images and this project's public asset bucket, with path traversal and arbitrary-host access rejected.
- Existing cream/sand/ink/clay/blush palette and serif typography retained. Site navigation, footer links and sitemap updated.

## Development database

Only **Wedding Planner Dev** (`qkyeitvwscrxbiwamxan`) was changed. Production (`yfwqcidkfjzpwbylgnug`) was not modified.

Applied migration files, in order:

1. `supabase/migrations/20261022220026_venue_foundation.sql`
2. `supabase/migrations/20261022222014_supplier_onboarding_profile.sql`

The first adds venue tables, RLS, composite package ownership and the public `supplier-assets` bucket with supplier-scoped write policies. The second adds the public supplier story and a server-only onboarding confirmation timestamp. Published venue content is real-business content to be entered by staff, not fictional seeded partnerships.

## Verification

- Production build and TypeScript checks passed.
- `npm test`: eight tests covering enquiry/admin validation, whole-pence prices, unsafe embeds and server image source restrictions.
- Development SQL access tests passed in `supabase/tests/venue_access.sql`: public/private venue isolation, public enquiry denial, staff access, supplier/unrelated-user storage boundaries and cross-venue package rejection. Transaction rolled back.
- Forty HTTP checks passed against the local production build and development database: public pages, draft 404s, authenticated role boundaries, cross-origin write denial, package/date validation, enquiry persistence, privacy-preserving date responses, image conversion/ownership, profile editing and venue application persistence.
- Browser checks covered venue gallery, sign-in/deep-link preservation, staff venue editor, mobile filters, supplier filtering, add-to-basket and mobile basket pricing. Final responsive screenshots are saved under `docs/screenshots/`.
- Disposable development listings, products, enquiries, accounts, applications and uploaded test assets are removed after verification.
- Security advisors found no new venue/storage findings. Existing notices remain for intentionally server-only tables without client policies, the staff-check security-definer function, and disabled leaked-password protection. References: [server-only RLS notice](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [staff helper notice](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Release boundary

This implementation has been exercised locally against development. It has not been deployed to production and its production migrations have not been applied.

Before release, staff need to supply the actual venue photography, packages and business content. External display-image URLs are supported, but server generation uses uploaded/bundled images rather than fetching arbitrary third-party hosts. No paid image-generation run, supplier notification or customer order was triggered during verification.

Existing untracked work, including `styled-landing/` and `20261020100000_basket_holds.sql`, remains untouched. The existing HEIC dependency emits a build warning; it does not prevent the build. The copied local TypeScript launcher is broken, so verification invokes the installed compiler directly.
