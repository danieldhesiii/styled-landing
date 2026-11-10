# Styled development improvements, 7 November 2026

This implements the development work in `site-fix-action-plan-2026-11-07.md`. The original walkthrough is preserved in `site-fix-list-2026-11-07.txt`.

## Implemented

- Product catalogue uses a wrapping category grid and concise product cards. Filters and supplier panels share presentation. Dates are a read-only summary linking to the event plan.
- Full product detail pages provide larger photographs, supplier/profile links, details, terms, quantity and basket actions. Return links preserve catalogue context. Preview-only products retain server-side booking restrictions.
- Products selected in the current event's basket are the selection for the visualiser. The visible Visualise selected action takes customers from catalogue to preview; browse/remove controls operate on that same selection. AI output never creates catalogue records or proves stock.
- Selected product IDs are validated/deduplicated, passed with reference images and retained in generation metadata. Explicit selections outrank style substitutions. Prompt improvement uses the current text, supports undo and ignores stale responses. Generation failure retains current selections and previous result.
- Product budget wording, separate event plans, clear venue entry and delivery defaults are improved. Item hire dates show one date summary and an explicit Change dates editor. Read-only planning and refreshed metadata no longer produce false leave warnings; actual unsaved edits remain protected.
- Boards is removed from current customer navigation, pages and pickers. Existing database data is retained. Saved items and Saved looks remain available across events.
- Supplier place searches use saved public areas. Postcode distance matching uses recorded coordinates only. Suppliers can set their private discovery postcode and delivery radius; exact location is not added to public product responses. Venue-owned supplier restrictions remain enforced.
- Support inbox has filters and pagination, protected staff status/replies, notification state and safe retry controls. New requests atomically enqueue a staff email notice after durable save. Sending is independent of booking email activation. Existing requests are not backfilled into outgoing email.
- Staff product management has search/category/publication controls; product dialogs are contained in the viewport. Publication checks remain authoritative.
- Basket includes product thumbnails and one estimate-details disclosure. Request copy is shorter and customer guidance identifies the next action.
- Public information pages use consistent readable layouts and clearer service/privacy/terms content, based on current UK official guidance. Help topics reflect current features and no longer advertise Boards.

## Verification and deployment record

Starting revision: `555d5fc`. The initial 332-test suite passed. The integrated `npm run check` passed 370 tests, TypeScript and the Next production build at the first final checkpoint. Later integration checks and release details are recorded below.

Isolated SQL fixtures cover the complete migration chain, support outbox deduplication/access and staff edit -> private draft -> approval -> anonymous catalogue read. These tests do not prove a real mailbox received an email or certify the deployed UI.

Chrome initially showed a signed-in development customer session. Subsequent extension calls timed out while opening the local preview. A public privacy page was checked at desktop and 320px by the public-content review. Full authenticated browser walkthrough and actual inbox delivery remain unverified unless explicitly recorded below.

## Manual checks after deployment

1. Open `/design?tab=wedding`. Switch between two events; verify each venue, dates, basket and preview returns correctly. Save edits and leave the page; clean pages should not warn.
2. In Catalogue, search a town/service area, inspect a product, return to the same results, add a product and choose Visualise selected. Check chosen names before generating. A paid real image-quality check requires approved supplier references and an agreed test budget.
3. Open Saved items and Saved looks. Confirm there are no Boards controls and prior saves still open.
4. In Basket, use Change dates for one item and retain event dates for another. Submit a controlled development request and verify both periods in customer and staff views.
5. Submit a controlled support question; keep its reference. Staff opens `/admin/support`, verifies that reference, replies and checks notification/provider status. Verify the support mailbox separately; provider acceptance alone is not delivery.
6. Staff edits a controlled product, reloads it, confirms draft changes are private, then follows the range review/publication flow and checks the public development catalogue/detail. Do not publish unapproved supplier information.
7. Walk through the venue customer and venue-owner routes with a permissioned partner or clearly identified fictional practice record; selecting a venue is not a booking.
8. Repeat at 360px/390px and desktop, keyboard-only through forms/dialogs, error/empty states and sign-in/deep links.

## Genuine prerequisites for production

- Supplier-approved photographs, descriptions, prices/units, dimensions, stock, delivery/setup/collection, insurance/installation and damage/cancellation terms.
- Confirmed legal entity/controller, lawful bases, retention/deletion process, processor/transfer disclosures and qualified review of marketplace/supplier/venue terms. See `legal-public-ux-review-2026-11-07.md`.
- Real notification delivery and provider webhook evidence, backup/restore and media recovery evidence, developer/security review and role/permission walkthrough.
- Put staff access in the team's approved password manager: site URL, approved staff email and owner. The account holder saves their existing password privately. Do not put passwords, OTPs, API keys or recovery links in this repository or chat. Prefer named staff accounts where possible; role membership is the access control.
- Explicit approval before any release to `styleduk.com`. This development release does not activate payments or promote the development database to live.

## Final integrated checks

- Final `npm run check`: **378 tests passed**, zero failed/skipped, TypeScript passed and Next production build passed.
- `git diff --check` passed. No new dependency was installed.
- Development migration `20261107132435_support_notification_outbox.sql` applied and verified: RLS on, no browser access to queue, exactly one enqueue trigger, provider ledger column present, zero historical jobs backfilled.
- Vercel development project `styledukprodprogress` has the existing Resend provider and a new `ENABLE_SUPPORT_EMAILS=true` setting. This does not enable booking notifications.
- The previous dashboard label “Customer questions” also referred to venue enquiries. Venue questions and the actual support inbox now have distinct labels/links. One saved support request exists in development; its original nonappearance was not reproduced, so hosted staff visibility still needs direct browser confirmation.
- Browser limitation: Chrome extension calls began timing out. No claim of a completed authenticated hosted walkthrough, real support mailbox delivery, or paid image-likeness check is made.

## Hosted release and navigation follow-up

Initial release `2350754` was pushed to GitHub and deployed Ready as `dpl_BZdkREqUd39PJeCzJQ8R6UfNKyQf` on the development canonical URL. Public product and privacy pages returned 200; the unauthenticated staff support API returned 401.

Direct native Chrome access recovered enough to verify the signed-in catalogue, new Saved items & looks navigation, supplier panel, realistic Crescent Moon cards and Visualise selected action. Product clicks exposed a browser navigation issue: the URL changed without a detail rerender. ProductBrowser now holds explicit selected-product state, synchronises route changes and restores Back/Forward through popstate. This corrects the in-studio detail handoff rather than relying exclusively on native history to notify the framework. Focused catalogue/shopping checks and TypeScript were rerun.

Full authenticated staff checks, real support email receipt and mobile interactive walkthrough remain pending; this partial browser check does not certify them. The final catalogue flow uses the event basket and bulk Visualise selected control; the optional individual-product visualise callback is reserved for a future separate selection model and is not displayed.


## New requirements: clearer staff dashboard and two visualiser modes

Recorded 7 November 2026, following the development release. These are requirements for the next build, not features already verified as complete. They supersede the earlier basket-based visualiser selection approach where they conflict.

### A. Future staff dashboard improvements

Make the staff dashboard easier to find things in and understand, particularly customer support. Staff should not depend on finding notification emails to know that work exists.

- Provide an obvious Customer support destination with an unread/new count, search by reference or customer, status filters and latest activity. Keep venue enquiries distinct from product requests and support questions.
- Give the dashboard a short Needs attention view: new support questions, unanswered supplier requests, venue enquiries awaiting a response, listings awaiting review and definite notification failures. Each item should lead directly to its record.
- On each record show its reference, type, current status, owner/assignee where available, next action and last activity. Show the conversation or response history together rather than scattering it across several screens.
- Keep email-delivery state secondary to the saved support request. Clearly distinguish request saved, notification queued, provider accepted and delivered. Staff must still be able to work if email fails.
- Use plain task names and consistent navigation for customer support, supplier requests, venue enquiries and catalogue review. Put technical delivery logs and connection details behind a separate service-check view.
- Before implementing a larger dashboard change, walk through the real staff tasks with Kamil and Dan, then build a concise prototype using existing data. Do not invent operational totals or introduce unnecessary workflow stages.

Completion checks: a staff member can find a new support question from the dashboard, understand who needs to act, open the full record, respond and see the updated status without opening Outlook or searching several sections. Verify small-screen and keyboard use as well.

### B. Immediate visualiser priority: choose the actual products before generating

Current gap: the development release uses the event basket as its visualiser selection. That does not provide the dedicated catalogue-image selection experience requested here. Build an explicit preview selection that is separate from buying or requesting products.

Mode 1: Choose my items

1. At the start of Visualise, let the customer browse/search the catalogue and select product photographs with clear selected indicators. Provide an equivalent Use in visualiser action on product details.
2. Selecting a product for a preview must not automatically add it to the basket, submit a request or reserve stock. Keep its product ID, name, supplier and reference photographs in the current event's preview selection.
3. Show the selection as a compact tray of thumbnails/names with remove and replace actions. Customers can select several items, then continue with their venue photo and description.
4. Use those exact selected catalogue records and their permitted reference images in the generation request. Explicit selections must not be silently replaced by a different supplier product.
5. Let the description control placement, style, atmosphere and other scene details while preserving the chosen items' identity. If a request conflicts with the selected items, explain the conflict and let the user change the selection or wording before spending a generation credit.
6. Once generated, show the original selected product cards below the result. Customers separately decide which products to add to the basket. Keep selection, rendered references and basket contents visibly distinct.

Mode 2: Choose for me

1. Provide a simple switch alongside Choose my items. The customer describes the look and the system chooses suitable products from the eligible catalogue.
2. Match style, product category, venue constraints and known location/service coverage. Keep availability checks honest: unknown stock or supplier confirmation requirements must not be presented as confirmed availability.
3. Show the suggested product selection before generation. The customer can remove, swap or lock an item, then continue. Manual locks take priority over later automatic suggestions.
4. Generate using those actual catalogue product references. Do not invent a purchasable item or claim an object in the generated pixels has an exact catalogue match without a recorded product reference.
5. If nothing appropriate exists in the allowed catalogue, explain that and offer broader filters or a different description. Do not silently substitute an unapproved or disallowed supplier.

Shared interaction requirements

- A clear starting choice: Choose my items / Choose for me. One shared venue-photo, description and generation flow after selection; avoid separate confusing pages.
- Switching modes must not discard a selection or an unsaved description without a clear choice. Retain each event's selection independently. Account-wide Saved items and Saved looks remain separate.
- Show the supported product/reference limits before generation and explain any item that cannot be used. Selection should not be unexpectedly truncated by an API limit.
- Refresh product eligibility before generating and requesting a booking. Withdrawn listings, missing image permission and venue supplier restrictions must still be enforced on the server.
- A preview being unavailable to book must not automatically make it ineligible for visualisation. Keep listing visibility, image/AI permission, preview eligibility and booking eligibility distinct. For example, Crescent Moon mock listings may be previewed in development only where permitted reference material and the existing development safeguards allow; no fake stock or booking confirmation is implied.
- Preserve selections, venue photo and description after errors; retry explicitly and do not silently trigger another paid generation.
- Keep the selection tray usable on mobile and make the next action obvious. Update How it works after this flow is implemented.

### C. Product likeness and prompt construction

The objective is a reliable, fair representation of the real catalogue items, not simply a visually attractive room containing generic lookalikes.

- Build a structured product reference bundle for each selected item: immutable catalogue ID, exact product/model name, supplier, reference image(s), verified dimensions, material, colour/finish, shape and distinctive construction details.
- Use actual permitted product photographs as image inputs to the generation/editing API. Supplying names in the text prompt alone is insufficient for a strong likeness goal.
- Identify each reference image explicitly in the prompt and associate it with its product. Preserve identifying details such as chandelier tiers, outline, crystal arrangement, frame finish and proportions; do not substitute a generic item with the same category name.
- Keep product-preservation instructions separate from scene/style instructions. Specify what can change (placement, lighting, surrounding decor) and what should remain consistent (product design, relative dimensions and distinctive features).
- Use verified dimensions plus available venue measurements or a known scale reference when estimating size and hanging position. When room measurements are missing, do not represent inferred scale as measured truth. Do not invent installation feasibility or safety clearance.
- Record the selected product IDs, reference-image versions, prompt version, provider/model and output ID with each saved preview so staff can reproduce and investigate a mismatch. Keep private media and customer data within existing access controls.
- Treat this as reference-image prompting and generation/editing work. Do not describe it as training the model unless a separate supported training process is actually implemented.

### D. Reliability, quality checks and evidence

We want the product-selection pipeline to behave consistently on every supported request. A generative image model cannot guarantee a perfectly accurate visual depiction 100% of the time. Make the deterministic behaviour dependable and measure visual quality separately.

Deterministic checks:
- Every accepted selection retains the same catalogue IDs from the picker to the server request, saved preview and product cards.
- Every supported reference image is loaded and attached to the correct product; failed image loading stops generation with a useful error rather than silently omitting the product.
- Explicit selected products and locked suggestions are not silently changed. Unsupported requests and provider limits are explained before generation.
- No cross-event selection leakage, fabricated product match, duplicate automatic paid retry or accidental basket addition.

Visual review:
- Build a small repeatable test set using the real permitted Crescent Moon product photos and other supplier examples as they become available.
- Include a single named product, multiple selected products, an automatic catalogue match, a conflicting description, a low-detail venue photo and different room sizes/lighting.
- Score product presence, model/design resemblance, count, colour/material, proportions, venue preservation and unwanted additions. Agree the acceptance criteria after reviewing sample outputs rather than inventing a success percentage.
- Save the source photographs, selections, prompts and results for comparison. A second AI can assist mismatch detection, but must not be treated as independent proof of exact product identity or scale.
- If a result fails the review, let the customer report a mismatch, refine the scene or regenerate explicitly. Do not label the generated scene as an exact product photograph or a guarantee of the installed result.
- If reference prompting still changes product identity too often, evaluate a separate compositing/placement approach or dedicated 3D assets for products needing exact silhouettes. Treat this as an engineering option to test, not an already-working capability.

### E. Next build order

1. Create separate event-owned preview selections and persist/restore them without changing basket contents.
2. Add catalogue image selection, visible selected tray, remove/replace and a direct product-to-visualiser action.
3. Add the two-mode switch and automatic catalogue suggestions with manual overrides.
4. Connect validated product/reference bundles to the generation API and preserve deterministic product metadata.
5. Exercise failure paths, permissions, venue policies, event switching and mobile selection; then run the permissioned visual-quality test set.
6. Refine prompt/reference handling based on measured mismatches and record known limits for the supplier walkthrough.
7. Update help content after the flow stabilizes. Dashboard simplification remains a separate follow-up, with the existing support inbox retained as the source of truth.
