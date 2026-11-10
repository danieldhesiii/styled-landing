# Styled app action plan: Simon and Sarah Mae meeting findings

31 October update: [Persisted booking operations](booking-operations-build-2026-10-31.md) now adds real development quote/acceptance, review and operations records beside the fictional pilot. Earlier template-only descriptions below describe the original iteration. Staff access has since been enabled for the account selected by the user.

Updated: 30 October 2026
Scope: planning and development only. No live website, supplier publication, payment collection or outreach is authorised by this document.

## The decision

Build the first supplier pilot around **approved listings and manual, no-payment enquiries**, not access to suppliers' internal systems or instant checkout. Show supplier identity and service quality, respect packages and minimum orders, and make the visualiser use an explicitly controlled catalogue range.

The app already has request handling, supplier workspaces and venue supplier routes. Improve those foundations rather than build another portal or request centre.

## 1. What the conversations establish

These are machine transcripts with unlabelled speakers. The business requirements below distinguish supplier statements from the Styled team's proposals. Neither conversation is a signed commercial or publishing agreement.

| Evidence | What it means for Styled |
|---|---|
| Simon, 07:17–09:36: bespoke operations platform; refuses internal access because it contains client information; describes substantial chandelier stock | Internal-system access must not be an onboarding requirement. Treat stock scale as self-reported, not verified date availability or permission to invent capacities. |
| Simon, 09:36–12:36: welcomes enquiries; repeatedly objects to customer money being taken before he agrees to the job; accepts commission in principle | No reservation deposit, security deposit or other customer charge before supplier acceptance. Final customer agreement is also required. Fee percentage, basis and payment recipient remain unresolved. |
| Simon, 06:30–06:52 and 10:24: setup may be provided by Crescent Moon or another production/AV company; distinguishes dry hire | Capture fulfilment mode per request: supplier-installed or hire-only with an approved installer. Do not assume installation is mandatory or included for every item. |
| Simon, 13:01–13:41: proposes six popular products | Prepare a small private review range, not his entire catalogue. Simon still needs to identify the six and approve their details. |
| Simon, 15:35–18:05: asks about photos versus 3D scans and accuracy | Give a precise image/specification checklist. Start with existing photographs; do not ask him to commission scans before demonstrating a need. |
| Simon, 18:05–19:39: prefers WeTransfer; provisionally discusses Friday 13 November | Prepare the material request and confirm date/time. This plan does not send the email or create an appointment. |
| Sarah Mae, 02:30–03:46: set floral ranges, some bespoke colour changes, supplier setup, Scotland coverage with extra travel cost for some northern work | Model ranges/packages with controlled variations and quote-dependent travel. Do not mark all Scottish locations as free or automatically serviceable. |
| Sarah Mae, 03:46–04:46: Google Apps Script web app handles stock/bookings and blocks dates | Their system remains authoritative. Integration is optional and subject to a separate data-minimised assessment, not presumed access. |
| Sarah Mae, 04:46–05:06: pricing discussion is incomplete/unclear | Request the actual price list and package rules; do not infer fixed prices, fees or margins from the transcript. |
| Sarah Mae, 11:29–14:21: explored venue/product visualisation before, asks about possible licensing; Styled says not currently a separate offering | Demonstrate the supplier-specific use case, but keep licensing as a future discovery item, not a committed product or promised revenue stream. |
| Sarah Mae, 14:48–20:48: worries similar artificial florals become a cheapest-price comparison; asks how supplier selection works; requires minimum spend/order rules for mixed baskets | Show real photos, dimensions, quality, inclusions and setup service. Enforce minimums separately for each supplier. Make supplier-scoped visualisation understandable. Do not promise equal exposure without an implemented policy. |
| Sarah Mae, 21:32–23:23: supports a mock-up and second discussion; WeTransfer and 12/13 November mentioned | Prepare private range/package drafts and confirm the contact, transfer method and meeting slot. The contact's personal name is uncertain in the transcription. |

## 2. What is already built, and what still needs work

Code reviewed in the development checkout on 30 October. “Built” means a development feature, not proof that live configuration or a real supplier pilot is ready.

| Area | Existing foundation | Required improvement |
|---|---|---|
| Requests | Basket submission creates a requested order; supplier line responses and staff review exist | Make supplier availability response, final full quote, customer acceptance and booking confirmation distinct. Add quote revisions/expiry and partial-response handling. |
| Supplier portal | Overview, Requests, Products, Availability and Business setup | Make email/staff-assisted confirmation a first-class path; do not require use of a second stock system. Track recipient, delivery outcome, reply and next action. |
| Service rules | `lib/supplier-workspace.ts` stores minimum order and descriptive delivery/setup/deposit guidance | Descriptive policy fields do not calculate fees or establish an end-to-end minimum-spend rule. Enforce agreed rules on the server and expose unknown charges clearly. |
| Pricing | `lib/server/quote.ts` validates catalogue lines, prices them and applies supplier commission | Current line subtotal is not an all-inclusive installed-service quote. Add explicit transport, setup, collection, VAT treatment and quote-only costs. Existing default commission/deposit calculations are not supplier agreements. |
| Availability | Styled capacity checks, blocks, full item hire dates and manual responses | External bookings, crew and shared stock are not known automatically. Add manual-check status, last verification and preparation/return buffers. Do not label unknown capacity as guaranteed availability or made-to-order. |
| Visualiser | Product reference images, chosen item IDs, linked catalogue pieces, venue scope | `composeOrderableLook` is venue-scoped but has no explicit supplier allowlist. Chosen items alone do not restrict auto-filled pieces. Implement supplier scope server-side, including refinements and substitutions. |
| Venue rules | Own-network, approved-partner and wider-catalogue routes | Any supplier choice must intersect the venue route. Choosing a supplier must never bypass a venue's restrictions. |
| Drafts/assets | Hidden products and product photo upload exist | Add a reviewable supplier preview, permission/approval record and multiple reference photos per real product. Confirm how approved fields can change without silently publishing unreviewed edits. |
| Demo venues | Fictional customer/team practice flows exist | These are simulations, not proof that real supplier payments, pricing or notifications work. Use a separate permissioned supplier dry run. |

Relevant code: `app/api/orders/route.ts`, `app/api/generate/route.ts`, `lib/server/look.ts`, `lib/server/quote.ts`, `lib/quote.ts`, `lib/supplier-workspace.ts`.

## Development progress: request-tracking template

The [pilot workspace](supplier-pilot-workspace-2026-10-30.md) now demonstrates a no-payment request, individual supplier checks and fees, a full versioned quote, customer acceptance, admin review, approval checklist and return/damage review with fictional data only. The existing visualiser now enforces supplier scope alongside venue restrictions, and browser/server pricing enforce configured supplier minimums separately. Basket wording distinguishes item subtotal from unquoted services/security.

The [request tracker](request-tracker-prototype-2026-10-30.md) now saves shared staff assignment, follow-up and private notes in existing order history. Actual supplier replies/order decisions remain in order management. Real quote persistence, customer acceptance, verified notification delivery, contractual/payment operations and publication of actual supplier ranges are still gated. Templates demonstrate proposed behavior; they do not complete the real booking system.

## 3. Priority action queue

### P0. Before the next supplier review

#### A1. Confirm scope and request the right material

Owner: Daniel for follow-up coordination; Kamil for product preparation. Proposed ownership, to confirm internally.

- Simon: ask him to name the six best sellers, supply descriptions, dimensions/weight, real images, compatible accessories, hire-only versus installed options, prices/quote rules and service area.
- Sarah Mae: agree two or three representative ranges/packages, included quantities/components, permitted colour variants, minimum spend/quantity, genuine product/setup photos and delivery/setup pricing rules.
- Both: ask for current booking terms, deposit/damage arrangements, listing approver, request recipient/backup and realistic reply target. Do not imply those were settled on the call.
- Confirm permission for private previews and separately agree public listing and AI reference uses, including photographer/client rights. Images being publicly visible is not permission to reuse them.
- Use the agreed transfer method after verifying the practical upload route. Simon explicitly prefers WeTransfer; confirm Sarah Mae's preference because that part of the recording is less clear. Do not promise an upload facility that has not been set up.
- Keep files privately stored, labelled by supplier/product and linked to approved catalogue records. No customer lists or booking-system credentials are needed.

Done when: named starting range, usable material, outstanding questions and a review slot are recorded. Confirm Simon's provisional 13 November slot and Sarah Mae's proposed 12/13 November slot and time; neither is booked by this plan.

#### A2. Make the no-payment request flow unambiguous

Owner: development + operations.

Proposed workflow, mapped onto existing order handling rather than a separate app:

Selection -> Request received -> Supplier review -> Full quote ready -> Customer accepts current quote -> Agreed contract/payment steps -> Booking confirmed.

- No charge or payment request before supplier approval of the job. Never describe a submitted basket as a reservation.
- Supplier “available” is not the same as a final quote or a confirmed customer booking.
- Record quote version, included items/quantities, full dates, service mode, fees, expiry and approval identity/time. Changes require reconfirmation before payment.
- For mixed suppliers, show each response and a single summary. Do not silently pay or book approved parts while other parts remain undecided. Default: resolve the request before payment; any split booking needs explicit customer agreement and separate status/terms.
- Do not take generic calculated deposits as payable amounts. Confirm actual deposit and balance terms for each supplier.
- Keep payment collection disabled for the pilot until the recipient, contractual roles, refund responsibility and charge authorisation are agreed and implemented.

Acceptance: request submission and supplier response cannot trigger a charge; a changed quote cannot use an earlier acceptance; the customer can see what remains unconfirmed. These are build requirements, not claims that a payment state machine already exists.

#### A3. Offer manual approval without internal-system access

Owner: development + operations.

- Supplier onboarding choice: “I check my own system; send me requests” or “I manage availability on Styled.” Integration is a separate opt-in future choice.
- Simon starts on manual checks. Do not request access to his operations platform again as a condition of listing.
- Sarah Mae can use the existing Apps Script tool and respond manually. Ask separately whether a limited availability-only export would be useful later; no permissions are presumed.
- Keep the current staff-assisted email workflow. A supplier can reply by email; staff records the decision and supporting reference. Supplier login is optional for this route.
- Show staff whether notification delivery succeeded and whether a reply is outstanding. No response means pending, never acceptance; agree reminders and escalation with each supplier.
- All customer contact information is shared only as needed for the agreed request and privacy process. No exposing one supplier's customer/order data to another.

Acceptance: both suppliers can complete a dry run without importing their private bookings or maintaining duplicate calendars; missing email delivery creates a visible staff task rather than a false “supplier notified” claim.

#### A4. Implement supplier-controlled visualisation scope and preview

Owner: development.

- Clear choices inside the existing visualiser: selected supplier/range, or a mixed-supplier look. No new top-level navigation tab.
- Enforce scope on the server at product selection, auto-fill, regeneration, saved-look reopening and substitutions. Reject or remove out-of-scope IDs with an explanation; do not trust a browser filter.
- Always intersect supplier scope with venue restrictions and known coverage constraints. Unknown logistics should require a check, not a positive availability claim.
- Product cards beneath images show supplier, genuine photo, dimensions and price/quote status. Distinguish selected reference products from suggested alternatives and unverified visual details.
- Use reference images first. The inspected code passes product images to generation; this is not evidence of a supplier-specific trained/fine-tuned model. Correct pitch/demo copy accordingly.
- Do not promise exact reproduction, guaranteed even exposure or installation feasibility. Evaluate product likeness with the supplier before showing a real range publicly.

Acceptance: a Sarah-Mae-only look cannot auto-fill another florist; a Simon-only look cannot substitute another lighting supplier; a restricted venue cannot be escaped by either selection. No paid generation or training spend until separately authorised.

### P1. Before accepting real supplier bookings

#### A5. Treat packages and minimum orders as rules, not descriptive notes

Owner: development; Sarah Mae validates the example configuration.

- Define a package by included components and quantities. Do not assume a photograph is one separately hireable SKU.
- Support variants that consume the same stock pool without double-counting availability. Identify incompatible or required add-ons. Initially, staff/manual checks may enforce dependencies if automation is not ready; label the limitation.
- Minimum spend belongs to each supplier and possibly a particular range or service area. Agree whether it includes delivery, setup or VAT.
- Show “£X more required with this supplier” and useful products from that supplier. Another supplier's basket subtotal cannot satisfy the minimum.
- Apply agreed rules on both request/quote endpoints and the UI, including edited quantities, removed items and mixed baskets. If an exception can be requested, make it explicit and manually approved.

Acceptance: removing half a package does not leave an apparently valid package; a mixed basket cannot bypass a supplier minimum by calling the API directly. For quote-only packages, show requirements and route to a quote rather than inventing a valid payable total.

#### A6. Add a full service quote and meaningful logistics

Owner: development + each supplier's approver.

- Store service mode per supplier/request: supplier setup, approved third-party setup, or permitted customer collection/hire-only.
- Separate product hire, delivery, setup, collection, additional hire days, site visit and any other agreed fees. Record inclusion/exclusion and VAT treatment. A refundable security deposit is separate from hire and from a reservation deposit.
- Unknown fees display “to be quoted”, not £0 or a misleading all-inclusive total. Prevent duplicate delivery charges when several products travel together; allow separate trips where required.
- Reuse existing event and per-item hire dates. Add relevant access/setup/removal windows and dispatch/return buffers; do not create another competing wedding-date form.
- For Scotland, capture Sarah Mae's actual priced coverage/exceptions. For Crescent Moon, obtain real delivery rules; no nationwide flat-rate assumption.
- Capture installation/site information only when needed. A supplier must assess suitability; generated images do not approve hanging points, power or outdoor use.

Acceptance: Friday setup/Saturday wedding/Sunday collection can be quoted correctly; two suppliers have separate transport charges; a venue access change causes review before a revised quote can be accepted.

#### A7. Show why a supplier is different and explain recommendations

Owner: product/design + development.

- Improve existing supplier/product pages with close-up real photos, materials, dimensions, package contents, setup service and relevant examples. Do not make AI imagery the sole basis for comparing similar florals.
- Keep supplier-only browsing obvious and preserve the customer's selection during visualisation.
- Explain “shown because…” using actual factors: chosen supplier, venue permissions, style relevance, known location/service coverage and any recorded availability constraints.
- Do not default every decision to the cheapest unit price. If testing rotation among equally eligible items, measure exposure first; do not claim implemented equal probabilities or guaranteed supplier traffic.
- Separate sponsored placement, if ever introduced, from organic recommendations and disclose it. It is not a pilot commitment.

Acceptance: a customer can understand differences between similar ranges without generating an image, and can tell why an item was suggested. No unsupported sustainability or availability claims.

#### A8. Agree operating responsibilities and damage handling

Owner: founders with appropriate legal/payment advice before real transactions.

- Agree who contracts, invoices, receives money, fulfils, communicates and handles cancellations, complaints and damage. Do not treat “middleman” wording as a settled legal/payment model.
- Commission was discussed in principle. Sarah Mae heard a 10–15% proposal; Simon accepted the idea, not a fixed percentage or collection method. Confirm per-supplier rate, calculation basis, VAT/transport/labour treatment, attribution, payment trigger and refunds. Do not impose a default 12%, 12.5% or 15% from older planning notes.
- For the initial pilot, propose supplier-managed refundable security deposits and claims where consistent with the chosen contracting model. This is an option to agree, not a system already built or a conclusion accepted on these calls.
- Damage process requirements: recorded condition at handover/return, evidence, charge explanation, customer response/dispute path and refund handling. Supplier allegations must not automatically debit a customer.
- Agree any saved-card consent, holds, deposits and claim authority before implementation. All money collection remains after supplier approval, and saved cards do not guarantee recovery.

Acceptance: written responsibilities and approved terms are on file; supplier and customer understand the difference between a booking deposit and refundable security; no late or damage charge is invented by the app.

### P2. After a successful manual pilot

- Explore a data-minimised availability export with Sarah Mae only if they want it. Assess their Apps Script arrangement before deciding an API, sheet or calendar is appropriate.
- Add shared-component stock pools, crew/vehicle capacity and buffers to automated checks only as needed. A calendar's busy days do not automatically represent per-product quantities.
- Do not pursue Simon's private system integration unless he independently changes his preference and explicitly agrees a limited scope.
- Consider product scans/3D assets only after reference-photo tests show a need and Simon approves cost, rights and format. Do not commission scans now.
- Record demand for a supplier-specific licensed visualiser, but do not build or promise a separate product before validating demand, costs and support needs.
- Add payment automation and fee reconciliation only after contract roles, approvals, disputes and security-deposit operations are settled.

## 4. The supplier-specific second-meeting demo

### Simon

1. Show six private draft products he has actually selected and permissioned.
2. Show genuine photos/specifications beside an illustrative supplier-only preview; no claim of scans or training.
3. Select several chandeliers, a venue and the full hire period. Choose installed versus hire-only.
4. Submit a request without payment. Show exactly what email/staff record he receives and how he can accept, decline, quote or request site information.
5. Demonstrate that another installer is a choice subject to his approval, not a customer guarantee.
6. Return a complete example quote, show customer acceptance, then explain the agreed future payment steps. Use no real charge.
7. Have Simon approve or request changes to the draft range and the process. Confirm material gaps, fee terms and the next owner/date.

### Sarah Mae

1. Confirm the contact's name and role; do not rely on the transcript's inconsistent names.
2. Show a small coherent floral range/package with actual included quantities and agreed variants.
3. Compare real product quality, dimensions and setup inclusions; explain price context without ranking solely by the lowest price.
4. Demonstrate supplier-only and mixed looks. Make clear that neither equal exposure nor exact AI reproduction is guaranteed.
5. Build a mixed basket, then show minimum spend separately for each supplier. Demonstrate an under-minimum and a quote-only case.
6. Enter a Scottish venue and separate delivery/setup/collection dates; use verified travel rules or mark the fee unquoted.
7. Submit without payment, check against their own stock system manually, return the full quote and show acceptance.
8. Confirm range scope, minimums, delivery charges, image permission, approval contact and remaining terms.

Only demonstrate completed functionality as working. Use a clearly labelled prototype for anything still planned. Fictional demos are not proof of a live supplier integration.

## 5. Release gates and test cases

Before a supplier range is published or real bookings are accepted:

- [ ] Supplier has approved the specific images, descriptions, uses and range; no assumption based on a friendly call.
- [ ] Private previews and unpublished products cannot leak through public catalogue APIs or share links.
- [ ] No customer charge before supplier approval and customer agreement to the current complete quote.
- [ ] Unknown stock and unquoted fees are not shown as confirmed availability or zero cost.
- [ ] Per-supplier minimums and package rules survive basket edits, mixed suppliers and direct API calls.
- [ ] Supplier and venue scope are enforced for generate, refine, substitute and saved-look reuse.
- [ ] Alternate dates/quantities and partial supplier replies cannot create an unintended booking.
- [ ] Missing email configuration/failure is visible to staff; a real permissioned delivery test is completed before reliance on alerts.
- [ ] External-system privacy is respected; one supplier cannot access another's requests, contacts or stock.
- [ ] Required technical/site checks and all extra charges have a named approver.
- [ ] Damage, deposit, cancellation, refunds and commission responsibilities are documented rather than inferred.
- [ ] Desktop and mobile customer/supplier/staff dry runs completed with clearly marked test data and no real payment.
- [ ] Development-only release verified; moving anything to styleduk.com still requires the user's explicit release instruction.

## 6. What remains unanswered

Neither meeting established precise stock quantities per listing, shared-stock dependencies, full buffers, detailed delivery tariffs, crew capacity, all minimum spends, final VAT/prices, damage evidence rules, deposit/balance terms or agreed commission. Do not fill those gaps with assumptions.

Confirm whether the follow-ups are in fact 12/13 November 2026, the time and channel, and who at Sarah Mae should attend. Simon asked for time until midweek to select material; do not convert that into a guaranteed delivery deadline.

The earlier action plan also refers to a separate discussion with Dan, a family contact, “Nook” and a proposed contract cost. Those points are not established by the two supplied transcripts. Keep them as unverified background, not requirements, spending approvals or claims of legal review.

## 7. Immediate sequence

1. Founders review this plan and prepare the two material requests and proposed meeting slots. Sending or scheduling requires an explicit instruction; nothing has been sent by this update.
2. Development tackles A2/A3 using the existing requests workflow, then A4 and the two private supplier previews.
3. Add A5/A6 before demonstrating a complete priced booking; keep unbuilt parts clearly labelled.
4. Use each second meeting to close the recorded information/contract gaps and approve the preview, not to restart a general discovery call.
5. Run the no-payment end-to-end dry run, resolve failures, then decide whether a restricted real pilot is ready. Keep all work off the live domain until release is requested.

## Source record

- Simon_Crescent_Moon_Meeting.md, recorded 30 October 2026, 19:47. Evidence timestamps above refer to this file.
- SarahMae_Flowers_First_Meeting.md, 24:12. Recording date not independently stated in the file; do not replace it with the earlier preparation brief's assumed meeting date.
- Existing Wedding_Marketplace_Action_Plan.txt and the development checkout's production, supplier-workspace, manual-order, venue-routing and stock documents.

Transcript statements about “training” and “even chances” are recorded claims, not verification of implemented behaviour. The initial code review found reference-image use without supplier scope. Development now adds server-enforced supplier and venue scope. Supplier-specific image likeness and model capabilities still need separate validation with permissioned assets.
