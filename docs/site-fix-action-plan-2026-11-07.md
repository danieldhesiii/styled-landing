# Styled website fix and readiness action plan

**Prepared:** 7 November 2026  
**Source:** `site-fix-list.txt`, the walkthrough and agreed follow-up decisions  
**Build target:** Development only, `danieldhesiii/styledukprodprogress`, branch `main`, `https://styledukprodprogress.vercel.app`, development database Wedding Planner Dev (`qkyeitvwscrxbiwamxan`).  
**Purpose:** Turn the walkthrough findings into an ordered implementation plan, distinguishing missing work from existing functionality that needs repair, refinement or proof. This document is a plan, not confirmation that these changes have already been made.

## 1. Outcome and working principles

Prepare the development site for a clear, credible walkthrough with Simon and for the next supplier onboarding conversations. A customer should be able to create separate events, find a venue or products, understand delivery dates, select products before visualising them, save useful ideas, and send a request. Staff should be able to receive and track support questions, review catalogue changes and understand whether an edit reached the customer-facing development catalogue.

Build on the current system instead of replacing features that already work. Keep the customer, supplier, venue and staff areas clearly separated. Do not enable payments, automatic supplier commitments, automatic stock deductions or live publication as part of these fixes. Use the existing manual-confirmation model until supplier operations and commercial terms are agreed. Do not invent supplier locations, listing content, prices, fees or availability.

The venue marketplace, venue-owner portal, supplier workspaces, event plans, flexible item hire dates, support inbox, staff support view, supplier-location schema/search foundations, and booking request workflows are already present in the repository. Treat the corresponding checklist entries as verification and targeted completion tasks first. Inspect the live development database and deployed commit before adding migrations or rebuilding a flow.

## 2. Scope decisions recorded from the fix list and project history

- **Boards:** Remove the Boards customer navigation and screens for now. Keep Saved items and Saved looks. Do not delete existing board rows or shared database structures in this cleanup; preserve user data and avoid an unnecessary schema migration. Check whether Saved looks or product details still depend on board-only UI and replace those links with the intended save/open actions.
- **Basket and account:** The basket and account work. Reduce clutter and correct confusing copy without changing their business logic or account access.
- **Requests:** Keep product requests and venue enquiries as distinct processes, even where the customer can see them in one bookings area.
- **Payment:** The phrase “add to basket/payment” in the product-page note is not approval to collect payment. Product detail pages should support quantity, dates and adding to a basket or submitting the existing supplier-confirmation request. Payment remains disabled until the commercial, legal and technical model is agreed.
- **AI visualiser:** Remove Crescent Moon-specific mock/demo disclaimers as requested, while retaining concise, site-wide accuracy information for AI-created previews where needed. Do not imply an AI image is an exact photograph, a guaranteed product match or a stock/booking confirmation.
- **Development/live boundary:** Make and verify these changes on the development site only. A future public release is a separate explicit decision.

## 3. Current implementation findings to verify during kickoff

| Area | Existing foundation | Planned treatment |
|---|---|---|
| Support | `/support`, customer request submission and history, `/admin/support`, staff status/reply fields and durable `support_requests` storage exist. Earlier review explicitly says this form does not automatically email staff or customers. | Trace the current deployed form path. Ensure the request appears in the staff inbox, then add reliable staff notification using the configured provider/outbox pattern if available. Show a clear saved receipt and reference. Test delivery and failure states; do not report an email as sent unless the provider accepts it. |
| Venue | Public venue directory/details, owner portal, draft/review/publish, date requests, calendars and staff review are implemented. | Find the exact event-setup entry that appears empty. Connect it to the existing venue discovery and selection flow; do not create a parallel venue system. Test customer and venue-owner paths. |
| Supplier location | Supplier profile and venue location fields, location matching migration and location filtering exist. | Inspect columns, profile editor, saved records, search query and place-name display. Fix missing/incomplete data entry or query/display logic. Decide how to present unknown locations and whether to use postcode/geocoding lookup. Do not expose exact private addresses unnecessarily. |
| Leave-page warning | `beforeunload` handlers exist in the customer design page and venue portal. | Keep the warning only for a genuinely dirty form with unsaved changes. Do not warn on navigation when nothing editable changed. Verify save, discard, cancel, route change and browser refresh paths. |
| Visualiser catalogue flow | Catalogue-linked visualiser matching and inline shopping components exist. | Reproduce the broken selection path, identify whether catalogue item IDs, selected IDs, image references or prompt payload were lost, then repair the smallest responsible layer. |
| Event/date model | Event plans and item-specific hire periods exist. | Confirm switching event changes only event-specific data; ensure chosen event is always visible and does not silently discard work. Preserve same-day delivery and day-before options. |
| Product budget | Current customer wording still includes “Supplier budget” in `MyWedding`. | Rename consistently to “Product budget” in form labels, saved state descriptions, help and budget status. Use the budget for products only; keep venue hire separate. |
| Catalogue layout | A product grid and listing detail components exist, while horizontal overflow is also intentionally used for category filters and mobile controls. | Remove sideways scrolling from product cards/results. Do not indiscriminately remove all horizontal scrolling if it is a usable, labelled mobile chip rail. Standardise a responsive product grid. |
| Legal/how it works | Privacy, terms and service-info pages exist; help/how-it-works content is in the app. | Audit legal coverage and update after product/workflow decisions. Refresh How it works last, once the real journeys and terminology are stable. |

## 4. Ordered build plan

Effort estimates are engineering effort, not calendar promises. They assume one developer familiar with the existing app, no external account access delays, and no new paid provider or legal-review work. “S” is roughly half to one day, “M” one to three days, and “L” three to five days. Run focused automated checks and relevant end-to-end flows at each step; do not wait until the final phase to discover regressions.

### Phase 0 — Establish the development baseline and exact repros
**Effort: S (0.5–1 day). Frontend + backend verification.**

1. Confirm checkout is `styledukprodprogress` on `main`, identify the deployed Vercel commit and confirm the development database reference. Record current clean/dirty Git state and preserve unrelated work.
2. Run the existing standard checks and capture the current failures, if any. Use the repository’s supported checks (`npm run check`) as the baseline, plus targeted browser checks at desktop and narrow mobile widths.
3. Make a small reproduction matrix for: support submission; missing admin entry; visualiser item selection; supplier location search; venue event setup; event switching; leave-page warning; catalogue product layout; basket clutter; staff product edit propagation.
4. Determine if a reported problem is in local code, a missing development migration, deployed configuration, missing test data, or an actual user-facing defect. Do not guess or apply a schema change before this check.
5. Add/adjust regression coverage for each confirmed issue before changing its implementation where practical.

**Completion checks:** baseline revision and environment are recorded; each broken issue has a reliable reproduction and identified owner layer; current checks are recorded.

### Phase 1 — Repair broken or misleading behaviour
**Effort: M–L (2–5 days). Frontend + backend/provider integration.**

#### 1A. Support delivery and staff visibility
1. Trace `POST /api/support` through `lib/support.ts`, the database write, confirmation response, staff query and admin UI.
2. Verify the same request is persisted and visible under Admin → Customer questions. Confirm staff query access is protected by the existing staff membership check and customer reads remain owner-scoped.
3. Add a staff notification only after the durable database write succeeds. Reuse the existing server-side email provider and queued/retry-safe notification pattern if configured. Send to the approved Styled support address, not an address supplied by a form field.
4. Record provider message/delivery state separately from request persistence. If sending fails, keep the request visible in admin, keep the reference number valid, and surface an operational retry/attention state for staff. Do not ask customers to submit duplicates.
5. Keep any customer receipt copy consistent with actual delivery behaviour. A successful form save must not claim that an email reached Outlook.
6. Submit a test from a real customer account in development; confirm one persisted record, one staff inbox row, matching reference, expected staff notification and safe failure behaviour. Remove test content after verification.

**Acceptance:** the admin inbox is the source of truth; email is a notification channel; duplicate submit/retry does not create duplicate requests; no support body or customer data leaks across accounts.

#### 1B. Restore catalogue item selection in the visualiser
1. Reproduce with an active development catalogue item and a venue image.
2. Follow the item identifier from catalogue card → selected item state → visualiser request → server product-match/prompt inputs → generated preview and “pieces from this look” list.
3. Repair the smallest broken interface or state mapping. Keep a selected product visible even if render generation fails, and provide a clear retry path.
4. Verify product ID and supplier ownership checks remain server-side; only published/eligible development catalogue items can be selected.
5. Test add/remove/replace, switching event, failed generation, mobile layout and saved-look reopening.

**Acceptance:** selected items are reflected in the visualiser request and its results consistently; adding to basket still uses the real catalogue record and current date/availability checks.

#### 1C. Remove false unsaved-change warnings
1. Review `beforeunload` handlers in the design page and venue portal.
2. Track dirty state only for editable form content not yet successfully saved. Persisted navigation or read-only pages must not install the warning.
3. Clear dirty state only after a confirmed save or explicit discard. Keep a warning when leaving genuinely unsaved supplier/venue edits.
4. Verify browser back, in-app navigation, tab close/refresh and save failure.

**Acceptance:** no warning on a clean/read-only page; real unsaved edits still receive a clear warning and are not silently lost.

### Phase 2 — Finish event setup, venue entry and location discovery
**Effort: M–L (3–6 days). Frontend + targeted Supabase/query work.**

#### 2A. Connect venue selection to event planning
1. Walk the customer path from Wedding plan → event setup → venue choice → Find venues → venue detail → request/selection → return to the same event.
2. Locate why the venue area in event setup appears empty. Reuse `VenueSearch`, venue detail, shortlist and the existing request flow rather than rebuilding venue records or booking APIs.
3. Clearly distinguish: “Wedding plan” holds this event’s date, guests, product budget and selected venue; “Find venues” discovers and sends a separate viewing/booking request. Selecting/saving a venue does not reserve it.
4. Let the user carry a venue selection into the current event and show its name in the plan. Keep the venue request status in My bookings, separate from the product basket/request.
5. Ensure venue booking date and event date are connected intentionally, with venue-specific durations handled by existing date rules. Do not infer a confirmed date from an open enquiry.
6. Check owner portal listing and staff review still behave as before.

**Acceptance:** from a new event, a customer can find a venue, understand what is saved versus requested, return to the same event and see the selection; venue operators can still draft, submit and manage their listing.

#### 2B. Repair supplier-location search
1. Inspect supplier profile schema, onboarding editor and any existing location fields. Confirm whether a location value is absent because it is not captured, not saved, or not read by search.
2. Define a minimal, consistent location record: public service area/place and postcode outward code or approved coordinates where available. Keep personal/business exact address private unless the supplier explicitly publishes it.
3. Ensure supplier profile editing/onboarding can add and update this information, with validation and useful examples.
4. Reuse existing location matching/search if it correctly supports the stored shape. Add a migration only if inspection proves a missing column/index/function; keep it additive and RLS-reviewed.
5. Ensure the event/visualiser picker displays human-readable place names, supports place/postcode input, handles no-match and missing supplier locations, and does not show fabricated distances.
6. Add tests for populated, missing, malformed and boundary-radius records; check venue-specific supplier policies continue to filter allowed suppliers.

**Decision to record before implementation:** whether discovery requires a third-party postcode/place autocomplete provider, or should initially use a simple place/postcode field and distance filter. If a new geocoding service is selected, record privacy, cost and key ownership first.

**Acceptance:** a verified supplier location can be saved, is returned by catalogue/venue search as expected, and no private address or invented distance is exposed.

#### 2C. Clarify event isolation and date defaults
1. Map event-owned data: event date/type, venue, guests, product budget, basket, per-item delivery/return dates, current visualiser context and event-specific requests.
2. Map account-wide data: profile, Saved items, Saved looks and support history. Boards are removed from the current experience; do not make event switching erase global saves.
3. When switching events, load that event’s saved state and identify the current event in the header/plan. Do not silently carry one event’s basket, venue or dates into another.
4. Add confirmation only if switching would actually discard unsaved edits. Preserve saved state when switching away and back.
5. Keep the delivery choice for delivery on the event day or the day before in event defaults. Allow the existing per-item date override to supersede it. Label it clearly as a requested delivery/access date, not a guaranteed supplier commitment.
6. Ensure venue periods and item hire/return periods remain separate, validated date ranges.

**Acceptance:** two events can hold different plans, venues, product selections and dates; switching away/back restores each; same-day and day-before delivery defaults are available and per-item exceptions work.

#### 2D. Rename the budget consistently
1. Replace “Supplier budget” with “Product budget” on the Wedding plan and all related help/content.
2. Clarify that it applies to catalogue products and does not include venue hire, delivery/set-up fees unless the supplier’s displayed price includes them, or unconfirmed quote changes. Confirm exact rules against current pricing calculations before adding copy.
3. Update empty, not-set, over-budget and saved-plan states.

**Acceptance:** no stale “Supplier budget” wording remains in customer UI/help; venue price and product budget are not combined accidentally.

### Phase 3 — Catalogue and product pages
**Effort: L (4–7 days). Primarily frontend; backend read/API only if missing.**

#### 3A. Make product discovery a standard responsive grid
1. Make the product result area a responsive grid with consistent image ratio, card height and readable hierarchy. No horizontal scrolling for the actual list of products.
2. Keep category chips as an accessible wrapping row or deliberately labelled mobile chip rail; the instruction to remove sideways scrolling applies to product results, not every compact filter control.
3. Move delivery-date/schedule controls out of the catalogue browse header and into Wedding plan/event setup. Keep a concise read-only date summary in browse if it materially informs availability, with an edit link back to the plan.
4. Keep the customer’s selected event visible and ensure date-aware availability still uses event and per-item dates.
5. Use progressive disclosure for secondary filters and information, without hiding price, unit, availability state or important supplier conditions.

**Acceptance:** products are discoverable in a normal shop grid on desktop/mobile; product cards never create page-level horizontal overflow; filters remain operable by keyboard/touch.

#### 3B. Make Supplier browsing match Filters
1. Reuse the Filters panel’s dimensions, spacing, close/escape behaviour, backdrop and focus handling for the Suppliers panel.
2. Standardise button heights, widths, labels and selected states.
3. Show supplier count and a compact supplier identity with logo/name, service area and product count where available. Do not imply coverage where none is recorded.
4. Test narrow screens, long supplier names, empty results and reset/clear behaviour.

#### 3C. Add full product detail pages and supplier profiles
1. Confirm a stable public product route and supplier profile route are available. Preserve existing links/URLs where possible.
2. Product cards should show only the fast decision details: photo, item name, supplier, price/unit, availability cue and one main action.
3. Product page should provide large image/gallery, item details/dimensions, hire/sale basis, per-unit price and included charges, supplier conditions, service area, requested dates/availability status, quantity and add-to-basket action. Show critical setup/delivery or damage terms only when verified and applicable.
4. Add an obvious return-to-category/search action that retains current filters when practical.
5. Supplier name links should open the public supplier profile. Profile shows approved public business details and published products only.
6. Do not show payment capture or guarantee availability. The basket/request flow remains manual confirmation.
7. Add accessibility states, no-photo state, unknown fee/price state and unavailable-date alternative state.

**Acceptance:** a customer can move from grid → product detail → change quantity/date → basket → supplier confirmation request → return to browsing; supplier page shows only published approved information.

### Phase 4 — Visualiser UX and prompt reliability
**Effort: L (4–8 days). Frontend + image API/prompt code.**

#### 4A. Put catalogue selection before generation
1. Redesign the top-level visualiser flow into a clear progression: choose/upload venue photo; choose catalogue pieces (and/or describe the desired overall style); review selected items; generate preview.
2. Make product selection the primary input, not a step hidden after a generated image. Keep the ability to explore a style without exact products, but label it as a general style preview.
3. Show chosen catalogue items in a visible selection summary with remove/change actions before generation. A user should know exactly which products were supplied to the prompt.
4. After generation, show the visual preview, product references used, and matching real catalogue cards below. Add-to-basket must operate on catalogue records, not items inferred only from pixels.
5. Preserve retry, error, limits, saved look, original/compare and image download behaviour. Event context and date-specific availability remain intact.

#### 4B. Improve item matching and prompt reliability
1. Build a prompt test set from available, permissioned supplier images and representative requests (specific product/model, category, style, room size, multiple events). Do not use supplier images outside recorded permission scope.
2. Inspect the prompt enhancer path for pre-filled descriptions. If users click “Improve my description,” it should improve the actual existing text, not silently ignore it; retain original and offer undo.
3. Ensure explicit catalogue product selection/naming outranks general style suggestions. Send the model normalized product identity, relevant visual features, scale/dimensions where verified, allowed reference images and clear keep/omit constraints.
4. Avoid claiming model training. Use prompt construction and permitted reference images; measure results with a repeatable human review rubric (presence, identity resemblance, count, proportions, room preservation, artifact rate).
5. Show the selected product IDs/references in the response metadata for deterministic downstream display. Do not infer exact scale from a generated image.
6. Keep a concise general notice that previews are illustrative and products/colours/proportions can differ. Remove Crescent Moon-specific demo language from normal listing display as requested.

**Acceptance:** selected products appear in the prompt payload, selected-product details are visible next to the generated result, failed generation does not erase selections, and prompt tests show measurable improvement without promises of exact likeness.

### Phase 5 — Remove clutter and improve navigation site-wide
**Effort: L (4–7 days). Frontend.**

Use the existing interface guidelines: one clear job per page, one concise introduction, essential information always visible, secondary explanation behind contextual help/expanders. Do not make text smaller simply to fit more content.

1. Establish shared rules for page title/intro, primary action, secondary actions, info disclosure, empty/error/loading states, button size and mobile spacing.
2. Remove duplicate explanatory paragraphs, repeated labels and decorative/duplicated controls. Keep price units, supplier conditions, availability changes, event context and required confirmation steps.
3. **Catalogue:** concise cards and filters; secondary details on product pages.
4. **Find venues:** one search/filter entry point; concise venue cards; detail-only amenities, capacities, packages, video and walkthrough information. Keep venue hiring separate from product shopping.
5. **Requests/My bookings:** separate product request from venue enquiry in labels/status grouping; show next action, current status and reference first; put history and explanation in a disclosure.
6. **Basket:** show selected items, quantities, dates and subtotal clearly. Remove redundant nested/expanding explanations, but retain important “request is not a confirmed booking/payment” context once, near the submission action. Keep deposit/estimate calculations accurate and label estimates correctly.
7. **Admin:** remove unused filler text/metrics and secondary explanatory copy. Give each section a clear task, status and next action. Do not remove operational warnings about failed email, unpublished content, permission or uncertain state.
8. Remove Boards tab/links/pages from customer navigation and workflows. Keep Saved items and Saved looks prominent and understandable. Update How it works later in Phase 8. Leave old data/database tables untouched until a separate retention decision.
9. Inspect desktop and 390px/360px mobile layouts for overflow, touch target, keyboard and dialog behaviours. Keep only purposeful scroll regions.

**Acceptance:** each page’s primary action is apparent; secondary help is available but not permanently expanded; there are no orphaned Boards links; mobile screens remain readable and navigable.

### Phase 6 — Admin dashboard operational review and end-to-end proof
**Effort: M–L (3–6 days). Frontend + backend permissions/data verification.**

1. Inventory Admin navigation and each screen’s purpose, permission boundary, data source and actual action. Remove or relabel unused “renew drafts”, “follow-up”, “sync flags”, “40 hours” or similar filler only after confirming they are not operational data.
2. Improve dashboard hierarchy: outstanding requests, support questions, listings awaiting review, delivery failures and actionable work. Keep operational status distinct from decorative totals.
3. Product management: add search, filters (supplier/category/publication status), sorting and a clear draft/review/published status. Confirm edit form validation and server authorization.
4. Fix popups/dialogs that escape the viewport: responsive max height, internal scrolling, sticky action row when useful, escape/focus return, and no horizontal overflow.
5. Review customer question inbox, support notification failures, supplier product review and venue review with staff-only access. Verify RLS/server guards, not just hidden navigation.
6. Perform the explicit catalogue propagation check: in a controlled development fixture, staff edits one product field, saves, reloads the admin record, then fetches the public catalogue and product detail. Confirm the published customer view reflects approved change and draft/unpublished edits remain private.
7. Confirm data/media deletion or withdrawal removes public access and that errors are visible. Avoid test records or real outbound messages lingering after the walkthrough.
8. Store staff credentials only in an approved password manager. Never add passwords or recovery secrets to this plan, repository or chat history.

**Acceptance:** every visible admin control maps to a real task; role boundaries are verified; product edits propagate only after intended publication; staff can see support submissions and notification delivery state.

### Phase 7 — Legal and commercial content review
**Effort: M (2–4 days internal) plus external legal review as needed. Frontend + policy/content.**

This phase is for identifying and implementing the agreed content, not representing that a generated policy is legal advice. Before editing legal statements, research current UK primary guidance and have a qualified adviser review the marketplace-specific terms.

1. Create a requirements matrix for: company/contact details; privacy notice and data retention/rights; cookies/analytics and consent if applicable; customer service terms; supplier agreement/onboarding terms; hire/sale product terms; delivery, setup, collection and late returns; cancellations/refunds; damage/loss/security deposits; supplier confirmation and contract party; venue enquiries/bookings; AI imagery and reference image rights; complaints/accessibility; marketplace commission and payment handling.
2. Identify the legal contracting party for product hire, venue hire and any Styled marketplace service. Current manual-confirmation flow must not imply Styled has authority to bind a supplier or venue unless agreed.
3. Verify the actual data collected, purpose, processors, email provider, Pinterest integration, retention and deletion behaviour against the app before writing the privacy notice.
4. Verify cookie/analytics behaviour in the deployed development app before saying a consent banner is or is not required. Do not add a consent UI without knowing what is set.
5. Make policies reachable from public footer and relevant request/checkout points; ensure headings/date/version are clear and links work on mobile.
6. Record commercial unknowns for Simon/other suppliers: price basis, deposits, damage evidence, cancellations, refund/charge authority, delivery/setup/collection and customer/supplier responsibilities. Do not invent a mandatory policy from one interview.

**Acceptance:** every policy statement matches actual app behaviour and agreed commercial roles; unknowns are explicitly resolved or marked as a pre-production gate; links and privacy disclosures are verified.

### Phase 8 — Rewrite “How it works” and help content last
**Effort: S–M (1–3 days). Frontend/content.**

1. Wait until Phases 1–7 settle routes, names, event behaviour, venue flow, product request process and visualiser steps.
2. Rewrite content by user role and current area: couple/event planning, venues, products/basket/requests, visualiser, Saved items/Saved looks, supplier workspace, venue workspace and staff.
3. Remove Boards instructions and any outdated references to removed screens, unbuilt payment or automatic availability.
4. Describe actual actions in order, with short steps, realistic statuses and direct links. Clarify venue discovery versus private Wedding plan and basket versus submitted request.
5. Put longer explanation in contextual help. Keep page itself short and consistent with current labels.

**Acceptance:** every help link lands on the relevant route/section; steps can be followed against the current development site; no help promises an unavailable feature.

### Phase 9 — Full walkthrough and Simon meeting readiness
**Effort: M (2–4 days). Cross-functional verification.**

1. Run the customer journey from account creation/recovery through event setup, venue discovery/request, product search/detail, delivery dates, saved item/look, visualiser generation, basket and supplier confirmation request.
2. Run the venue owner journey: application/access, listing draft, photos/tours, review submission, staff approval, public listing, enquiry and response/calendar.
3. Run supplier journey: join/access, profile location, product creation, photo/terms/availability input, staff review/publication, date-specific customer request, manual response and customer status.
4. Run staff journey: support receipt and notification, response, product edit/review/publication, venue review, request tracking, failed notification attention and permission withdrawal.
5. Check mobile and desktop at common widths, keyboard navigation, loading/error/empty states, deep links through sign-in and logged-out access. Confirm no obvious personal data or staff screens are exposed publicly.
6. Validate the test fixture is clearly fictional and is not a published real listing; remove all test support requests, orders and accounts created for the walkthrough.
7. Confirm development site points to Wedding Planner Dev, and no production repository/domain/database configuration changed.
8. Prepare a Simon walkthrough script separating: working prototype; questions for supplier confirmation; currently manual behaviour; future integrations; and production gates.
9. Record any remaining defects with severity, reproduction steps, owner, estimate and release impact. Fix blockers before declaring meeting-ready.

**Acceptance:** repeatable end-to-end journeys pass in development, known limitations are concrete and visible to staff, and no routine development change is released to styleduk.com.

## 5. Consolidated fix-to-phase map

| Fix-list item | Phase | Work type | Notes |
|---|---:|---|---|
| Support email and admin customer questions | 1A | Frontend + backend + provider | Persistent support inbox already exists; reliable staff email notification/receipt is the gap to investigate. |
| Venue section empty | 2A | Frontend integration | Venue marketplace and owner portal already exist; connect event setup to them. |
| Supplier location search | 2B | Frontend + Supabase/query | Location schema/search foundation exists; inspect saved values and the matching/display path first. |
| Chrome unsaved warning | 1C | Frontend | Gate warning on genuinely dirty editable state. |
| Catalogue item to visualiser | 1B | Frontend + image API | Trace selected IDs end to end before broad visualiser redesign. |
| Rename Supplier budget | 2D | Frontend/content | “Product budget”; keep venue cost separate. |
| Same-day/day-before delivery | 2C | Frontend + booking dates | Keep both defaults and per-item date overrides. |
| Events behave like separate accounts | 2C | Frontend + persistence | Separate event data; preserve account-wide saves. Clarify current event. |
| Less text/always-visible information | 5, then 8 | Frontend/content | Simplify first; rewrite help/how-it-works after all flows stabilize. |
| Catalogue grid/no product sideways scroll | 3A | Frontend | Keep category controls usable on mobile; product results themselves are a grid. |
| Remove delivery schedule controls from catalogue | 3A | Frontend | Event setup owns defaults; catalogue can show an edit-date link/availability summary. |
| Suppliers panel visual consistency | 3B | Frontend | Match Filters panel and normalise button sizes. |
| Supplier profile links | 3C | Frontend/routing | Link names from products and supplier panel to public approved profile. |
| Full product detail pages | 3C | Frontend + catalogue read path | Manual confirmation remains; no payment enablement. |
| Remove Crescent Moon-specific disclaimers | 4B | Frontend/data display | Generic AI preview accuracy guidance may remain; no supplier-specific demo label. |
| Visualiser heading and flow | 4A | Frontend | Choose products before generating; show chosen products. |
| Prompt reliability / prefilled description | 4B | Prompt/API + tests | Improve actual input text; use permissioned references and measurable tests. |
| Admin overall, product search, modal sizing, filler text | 6 | Frontend + backend | Preserve real operational warnings and permission checks. |
| Support in admin | 1A/6 | Backend + frontend | Existing inbox; verify visibility, status, notification. |
| Store staff password securely | 6 | Operational | Use approved password manager; never store in app/code/chat. |
| Privacy, terms, cookie, supplier/hire terms | 7 | Research + content + review | Confirm current UK guidance and actual business/legal roles. |
| Verify admin edits update customer site | 6 | End-to-end test | Explicit edit → save → public catalogue/detail proof. |
| Remove Boards, keep Saved items/looks | 5 | Frontend/content | Hide routes/navigation without destructive database deletion. |
| Final walkthrough | 9 | Cross-system | Customer, supplier, venue and staff journeys. |

## 6. Pre-build questions and decision owners

These are the only decisions that materially change implementation. Build work that does not depend on them can begin while answers are gathered.

1. **Location picker:** Should the first version use plain place/postcode entry and matching, or do you want address autocomplete/geocoding? Recommendation: repair existing fields/search first; add a paid/external geocoder only if the simple flow proves insufficient. **Owner:** Kamil/Dan.
2. **Support email behaviour:** Should every support request notify `support@styleduk.com`, and should the requester receive a confirmation email, or should the admin inbox remain the only guaranteed record with customer in-app status? Recommendation: notify staff after database save; add customer receipt only if provider delivery is configured and copy is accurate. **Owner:** Kamil/Dan.
3. **Venue selection semantics:** Should choosing a venue in Wedding plan merely save it, or also begin a separate enquiry? Recommendation: save selection only; require an explicit “Request viewing/booking” action for contact. **Owner:** Kamil/Dan.
4. **Product price scope:** The checklist mentions payment, but current product flow is request and manual confirmation. Confirm no payment collection is wanted in this readiness build. Recommendation: keep payment out until supplier contracts, refunds, deposits, damage and payout responsibility are agreed. **Owner:** Kamil/Dan plus developer/adviser.
5. **Simon meeting scope:** Should the development catalogue show Crescent Moon products in a realistic standard presentation while keeping booking disabled until Simon confirms the final prices, stock, delivery/setup, damage policy and image permissions? Recommendation: yes, with booking status controlled server-side and no false confirmed availability. **Owner:** Kamil/Dan/Simon.
6. **Legal review:** Who will review policy/terms wording before any public launch? Recommendation: use a qualified UK adviser for marketplace contracting, consumer hire, cancellation/damage/deposit and supplier terms. **Owner:** Kamil/Dan.

## 7. Dependencies and release gates

- Phase 1 support notifications depend on a verified development email provider/sender and durable failure tracking. A database save can still be completed independently.
- Phase 2 location work may depend on supplier-provided real locations. Test using labelled fictional fixtures until suppliers verify service areas.
- Phase 2 venue path depends on published/approved venue listing data; keep empty and draft states polished while real venues are pending.
- Phase 3 complete product detail pages depend on supplier-approved descriptions, photos, prices/units and terms. Build the reusable page with explicit empty/unknown states rather than invented content.
- Phase 4 realistic reference prompting depends on image permissions and usable product photos. Do not call it model training or promise accurate scale/identity.
- Phase 7 policy publication depends on actual business entity, contract parties, providers, data retention and agreed commercial terms.
- Phase 9 meeting-ready does not equal production-ready. Production also needs developer review, live schema review/migration, backup/restore evidence, security review, email/provider verification, monitoring, legal review, real supplier permissions/data, support operations and an explicit release decision.

## 8. Suggested implementation cadence

1. **First build block:** Phase 0 baseline, then Phase 1 broken behaviour. Avoid visual redesign before support, visualiser selection and false warnings are stable.
2. **Second build block:** Phase 2 event/venue/location/delivery integration. Keep separate event data and clear venue request semantics.
3. **Third build block:** Phase 3 catalogue/product architecture, then Phase 4 visualiser flow.
4. **Fourth build block:** Phase 5 clutter cleanup and Boards removal, then Phase 6 staff/admin end-to-end proof.
5. **Final content and walkthrough block:** Phase 7 legal review/content, Phase 8 How it works, and Phase 9 full walkthrough. Do not write help text ahead of stabilized flows.

## 9. Definition of “ready for the Simon meeting”

- No known broken support submission, selected-item visualiser flow or false leave-page warning.
- Event setup clearly distinguishes Wedding plan, venue discovery and product planning; event switching does not cross-contaminate plans.
- Venue section is connected to existing venue discovery and enquiry flows, with clear request status and no implied reservation.
- Product budget wording is consistent, supplier locations search/display correctly, and delivery date options are clear.
- Catalogue grid, supplier panel and product detail page are coherent on desktop and mobile.
- Visualiser starts from a venue image plus selected products, shows chosen products and uses honest, concise preview context.
- Boards are absent from customer navigation; Saved items and Saved looks remain usable.
- Staff can find support questions, inspect notification state, manage/search products and prove a published edit reached the customer catalogue.
- Legal and commercial questions are documented, not fabricated. “How it works” matches the final current UI.
- The meeting walkthrough can clearly state what is implemented, what is manual, what needs supplier confirmation and what remains a production gate.



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
