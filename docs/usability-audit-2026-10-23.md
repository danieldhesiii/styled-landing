# Styled website usability audit

Date: 23 October 2026

Reviewed version: `9b50cc7`, with the current live site at https://styledukprodprogress.vercel.app/.

## Main assessment

The site has a coherent visual identity and the right main ingredients. The next gain will come from shorter journeys, dependable saving and consistent explanations of requests, confirmation and payment. Adding more navigation or more explanatory paragraphs would increase the current burden on new users.

Keep the current warm palette, serif headings, standalone Boards and Visualise destinations, separate business workspaces, and the removal of How it works from the landing page. Keep manual supplier and venue confirmation while the operating model is being tested. AI model selection and generation-pipeline changes remain out of scope.

## Review coverage and limits

Live desktop review covered the homepage, Wedding plan, Boards, Saved, Visualise, venue search, supplier directory and a supplier profile, the business entry page, the initial venue workspace and supplier login. Mobile review used a 390px viewport for the customer plan and catalogue. Current source was also reviewed for checkout, tracking, authentication, saving, venue requests, owner management, supplier stock/calendar tools and staff administration.

No orders, requests, emails, payments, uploads, account changes or business records were submitted. The authenticated account had no linked venue listing or supplier workspace access, so populated operator tools and staff administration were assessed from source. Failures such as interrupted saving, delayed restoration and calendar-sync outages were not injected into the live site. These are source-supported risks, not claims that failures were reproduced. This is a usability review, not a security, legal or performance certification.

## What is already working well

- Wedding plan, Find venues and My bookings now have different purposes.
- The venue workspace has its own header rather than customer shopping navigation.
- Catalogue and venue discovery have useful filters; public and studio venue searches share a component.
- My bookings groups supplier orders and venue requests without merging their underlying confirmation processes.
- Boards remain private and can prepare inspiration for the visualiser without immediately generating an image.
- Catalogue pieces can appear beneath a generated look so customers do not have to leave it to shop.
- Demo venues are explicitly labelled, cannot be booked and expose the intended video/walkthrough placement.
- Venue confirmation text generally explains that a request does not reserve a date.
- The existing staff order inbox already supports status filters, search and supplier progress. Improve this workflow rather than replacing it.

## Priority 1: trust and dependable core journeys

### 1. Use one accurate explanation of buying and booking

**Finding:** The live homepage promises buying every piece, a single deposit, delivery and one checkout. Supplier profiles describe illustrative prices and images. The working checkout submits a request for manual confirmation and does not collect payment. Tracking then presents Deposit and Balance due six weeks before without consistently retaining the illustrative wording.

**Change:** Use one sequence everywhere: build a selection, submit a request, receive supplier confirmation and a final quote, then agree payment and delivery. Pending, declined and cancelled requests should not imply an agreed payment obligation. Avoid promising an exact visual match or universal delivery until those details are established.

**Done when:** Homepage, product pages, basket, submission confirmation and My bookings explain the same process. Estimates, delivery/collection costs, deposits and agreed charges are visibly different.

Evidence: [homepage](</Users/kamil/Desktop/styledukprodprogress/app/(site)/page.tsx:31>), [checkout](/Users/kamil/Desktop/styledukprodprogress/components/design/CheckoutStep.tsx:289), [tracking totals](/Users/kamil/Desktop/styledukprodprogress/components/order/OrderStatusCard.tsx:178).

### 2. Make the first Wedding plan a short setup, then an editable overview

**Finding:** Wedding plan is correctly the default destination, but it is a long form for both new and returning users. At 390px wide, the reviewed plan was approximately 3,382px tall and Save wedding plan started approximately 3,103px below the page top. Starter values such as 80 guests and a £6,000 budget can look like established personal details.

**Change:** On the first visit, ask for date or undecided, estimated guests, supplier budget or not sure, and venue status. Keep photos optional. Afterwards show a compact overview with Edit actions for each group and one relevant next step. Clearly identify starter estimates. Keep Wedding plan editable from the first navigation tab.

**Done when:** A new couple can understand and complete the basic setup without reading a multi-screen form. A returning couple can change one detail without scrolling through unrelated sections.

Evidence: live mobile review; [Wedding plan form](/Users/kamil/Desktop/styledukprodprogress/components/wedding/MyWedding.tsx:54).

### 3. Protect edits during loading and make saving trustworthy

**Finding:** Plan inputs are editable before saved details finish loading; the later restoration can overwrite edits. Saved-look actions optimistically change the display while database errors are not handled. Venue owners can switch listings without an unsaved-change safeguard.

**Change:** Load saved data before enabling editing, or preserve fields changed during loading. Show Saving, Saved and Could not save with a retry action. Roll back unsuccessful saved-look updates. Add Save / Discard / Stay protection when changing a venue or leaving an edited form. Consider autosaving valid plan groups after restoration, while keeping listing submission an explicit action.

**Done when:** Slow or failed requests never silently replace edits or report a failed save as successful. Draft submission and ordinary saving remain separate.

Evidence: [plan loading/edit controls](/Users/kamil/Desktop/styledukprodprogress/components/wedding/MyWedding.tsx:108), [workspace restoration](/Users/kamil/Desktop/styledukprodprogress/app/design/page.tsx:257), [saved looks](/Users/kamil/Desktop/styledukprodprogress/app/design/page.tsx:390), [venue switching](/Users/kamil/Desktop/styledukprodprogress/components/venues/VenuePortal.tsx:214).

### 4. Separate venue viewing appointments from wedding availability

**Finding:** A viewing uses the same date-availability rules as a wedding booking. The API rejects booked/blocked wedding dates for both request types. There is no structured viewing appointment time or separate confirmed-viewing status.

**Change:** Let viewing requests ask for a preferred day/time and let the venue confirm manually. Wedding booking requests should continue to use wedding-date checks. A confirmed viewing must not reserve the wedding date.

**Done when:** A venue can arrange a suitable viewing independently of its wedding calendar, and customers can distinguish a viewing appointment from a confirmed wedding booking.

Evidence: [enquiry availability checks](/Users/kamil/Desktop/styledukprodprogress/app/api/venue-enquiries/route.ts:69), [request actions](/Users/kamil/Desktop/styledukprodprogress/components/venues/VenueRequestCard.tsx:126).

### 5. Provide a clear way back into an account

**Finding:** Customer and supplier forms have no visible forgotten-password or confirmation-resend path. The supplier form signs the user out after any failed supplier-access check, including a service failure. The public header has no direct Log in entry. Its account invitation captures an email address before redirecting to the actual account flow.

**Change:** Add Log in, password recovery, confirmation resend and access-help actions. Distinguish incorrect credentials, missing supplier access and temporary service problems. Make Create account open actual registration, or label email capture honestly and avoid asking for the same email twice. Remove Cancel any time unless there is a relevant subscription.

**Done when:** A returning user can recover access without guessing which form to use or losing a valid session because a service check failed.

Evidence: [customer login](/Users/kamil/Desktop/styledukprodprogress/app/login/page.tsx:177), [supplier access check](/Users/kamil/Desktop/styledukprodprogress/app/portal/login/page.tsx:19), [email capture](/Users/kamil/Desktop/styledukprodprogress/components/CtaEmailForm.tsx:24).

## Priority 2: easier everyday use

### 6. Put products in view sooner on mobile

The mobile catalogue opens with planning context, a large location panel, category controls, search and filters before products. Collapse location into a compact summary once set; use one clear search row and an expandable filter sheet. Keep applied filters visible as removable chips. Product cards should appear near the start of the page rather than after a wall of controls. Preserve existing filtering capabilities.

Evidence: live mobile review; [location controls](/Users/kamil/Desktop/styledukprodprogress/components/wedding/LocationFilter.tsx:99), [catalogue controls](/Users/kamil/Desktop/styledukprodprogress/components/design/ProductBrowser.tsx:240).

### 7. Make phone navigation easier to read and booking status easier to reach

The phone footer currently has six destinations using 10px text. My bookings is omitted and reached through the account menu or plan links. Keep Boards and Visualise distinct, but improve label readability and provide a prominent, consistently placed My bookings shortcut. Avoid solving this with another permanent navigation row. Shorten repeated explanatory copy and increase the contrast of secondary text where needed.

Evidence: live mobile measurement; [studio navigation](/Users/kamil/Desktop/styledukprodprogress/components/design/StudioNavigation.tsx:72).

### 8. Make browser history and links behave as expected

Studio changes use replaceState, while route parameters are read only on mount. Back and Forward therefore do not provide a normal journey through studio destinations. Supplier product links omit tab=catalogue and currently lead into the default Wedding plan even though the intent was shopping.

Use URL-driven navigation with a working history trail. Supplier links should open the relevant catalogue context, show the chosen product and acknowledge an add-to-basket action. Preserve the basket, plan and search state.

Evidence: [studio navigation state](/Users/kamil/Desktop/styledukprodprogress/app/design/page.tsx:55), [supplier shopping links](</Users/kamil/Desktop/styledukprodprogress/app/(site)/suppliers/[id]/page.tsx:120>).

### 9. Make product details sufficient for a hire decision

Supplier product cards are currently sparse. Add a detail sheet with dimensions, material/colour, pack or hire unit, included items, minimum quantities, hire duration, delivery/collection arrangements and relevant damage/deposit information once supplied. Use a consistent product-photo format and label example imagery and unverified reviews appropriately. Do not imply seeded showcase data is verified supplier evidence.

The immediate improvement is a useful detail view and a clear request process; a fully automated inventory system can wait for supplier research.

Evidence: live supplier profile; [catalogue card](/Users/kamil/Desktop/styledukprodprogress/components/design/ProductBrowser.tsx:530), [seed catalogue](/Users/kamil/Desktop/styledukprodprogress/lib/catalogue.ts:35).

### 10. Explain availability problems before checkout

Product cards still allow adding known-unavailable items, and the basket can proceed before checkout blocks submission. Explain the problem where it appears: insufficient quantity, unavailable date, notice period or delivery coverage. Offer a smaller available quantity, a different date or alternatives. Unconfirmed stock must remain visibly provisional.

Evidence: [product availability and actions](/Users/kamil/Desktop/styledukprodprogress/components/design/ProductBrowser.tsx:561), [basket continuation](/Users/kamil/Desktop/styledukprodprogress/components/design/BasketPanel.tsx:207), [checkout blocking](/Users/kamil/Desktop/styledukprodprogress/components/design/CheckoutStep.tsx:369).

### 11. Make Boards visual and make Saved a simple shortlist

Keep Boards as its own destination. Saved should mean favourites; Boards should mean organised ideas for a ceremony, reception or style. Offer Add to board directly from a product or saved look, an image-led board picker and a prominent first-pin action. Avoid a long product-name dropdown as the main way to build a visual board.

A board currently retains a look preview after that look is unsaved, but opening it in the visualiser requires it still to be in savedLooks. Resolve board looks by their render ID independently of favourite status.

Evidence: live Boards/Saved review; [board actions](/Users/kamil/Desktop/styledukprodprogress/components/wedding/Boards.tsx:263), [opening a board look](/Users/kamil/Desktop/styledukprodprogress/app/design/page.tsx:827).

### 12. Keep inspiration imports honest and the visualiser staged

Google Photos and Pinterest currently expose manual guidance/link workflows rather than a completed account connection. Keep that distinction clear before a user clicks. In the visualiser, show a short progression: choose a venue photo, describe the look or choose board inspiration, generate, then review/save/shop. Consolidate overlapping photo/room controls and provide clear labels for the main prompt and change-request fields. Keep the existing shop-below-the-image behaviour.

Evidence: live visualiser and Boards review; [import controls](/Users/kamil/Desktop/styledukprodprogress/components/wedding/BoardImports.tsx:53), [prompt inputs](/Users/kamil/Desktop/styledukprodprogress/components/design/RenderStage.tsx:955).

### 13. Make an empty venue collection different from no search matches

The live directory has no published venue results and displays No venues match these plans yet even without filtering. Say the collection is being prepared when no real venues are published; use No matches only when an existing collection has been filtered out. Reduce empty search controls when there is no collection to search. Keep the three clearly labelled demos available as previews rather than search results.

Evidence: live venue search; [shared search](/Users/kamil/Desktop/styledukprodprogress/components/venues/VenueSearch.tsx).

### 14. Let a customer continue a venue request

Suggested alternative dates currently require another request. Add date-specific follow-up actions that preserve the venue, date and viewing/booking intent. Longer term, support replies in the existing request so the history stays together. Show last update, current status and the next person expected to act.

Evidence: [customer venue follow-up](/Users/kamil/Desktop/styledukprodprogress/components/venues/MyVenueRequests.tsx:150).

### 15. Improve new and existing venue-owner onboarding

An operator with no account-linked venues sees Create private listing immediately. Offer two starting actions: Add a new venue and My venue is already listed. Link the second to an access-help process rather than encouraging duplicate listings. Once created, show a short checklist and a clear draft / submitted / changes requested / published status. Prefer upload and preview controls to technical URL fields; keep optional video and walkthrough fields secondary.

Evidence: live empty workspace; [creation prompt](/Users/kamil/Desktop/styledukprodprogress/components/venues/VenuePortal.tsx:238).

### 16. Clarify what is private before venue publication

The listing draft is described as private, but uploaded venue assets immediately receive public URLs. Clearly distinguish an unpublished listing from publicly accessible uploaded media. If pre-approval media must be private, use private draft storage and publish approved assets later. Do not imply the current implementation does both.

Evidence: [draft wording](/Users/kamil/Desktop/styledukprodprogress/components/venues/VenuePortal.tsx:320), [public asset URL](/Users/kamil/Desktop/styledukprodprogress/app/api/venue-portal/assets/route.ts:35).

### 17. Make supplier readiness and synchronisation observable

Separate setup completion from publicly available products. A product count and an acknowledged checklist item do not prove a supplier profile is live. Show products awaiting review, live products and a public-profile link. For external calendars, show the last successful sync, stale/error status and retry guidance rather than relying on a general daily-sync promise. Actual scheduled execution was not verified in this review.

Evidence: [setup checklist](/Users/kamil/Desktop/styledukprodprogress/components/vendor/OnboardingChecklist.tsx:58), [public profile availability](/Users/kamil/Desktop/styledukprodprogress/lib/server/suppliers.ts:54), [calendar UI](</Users/kamil/Desktop/styledukprodprogress/app/portal/(app)/availability/page.tsx:140>).

## Priority 3: accessibility, recovery and operational polish

### 18. Keep independent parts of the workspace usable during a failure

The catalogue provider withholds the entire customer workspace until loading succeeds. A catalogue outage therefore also blocks the plan and bookings. Keep the navigation shell available and isolate errors to dependent sections. Add purposeful loading states, retry actions and last-saved feedback instead of exposing defaults as if they were restored data.

Evidence: [catalogue provider](/Users/kamil/Desktop/styledukprodprogress/components/catalogue/CatalogueProvider.tsx:57), [design layout](/Users/kamil/Desktop/styledukprodprogress/app/design/layout.tsx:8).

### 19. Finish keyboard and screen-reader support

The login overlay needs an accessible heading association and reliable focus containment/return. The main visualiser textareas need programmatically associated labels. Check menu dismissal, keyboard navigation, focus visibility and text contrast across all roles. The existing native help-dialog approach provides a useful pattern. These specific source issues are confirmed; a full assistive-technology audit remains to be done.

Evidence: [login dialog](/Users/kamil/Desktop/styledukprodprogress/components/auth/AuthDialog.tsx:94), [visualiser inputs](/Users/kamil/Desktop/styledukprodprogress/components/design/RenderStage.tsx:955).

### 20. Improve help and support without putting guides back on the homepage

Keep task-specific help in the account and business workspaces. Prioritise topics for the current audience rather than presenting all customer and operator topics at equal weight. Add visible support and working privacy/service-terms destinations, especially from registration. Explain the next step on error and empty screens. Keep business recruitment within the business area or a discreet public entry, rather than adding large recruitment panels to customer browsing.

Evidence: [help-topic grid](/Users/kamil/Desktop/styledukprodprogress/components/design/HowItWorks.tsx:107), [registration terms wording](/Users/kamil/Desktop/styledukprodprogress/app/login/page.tsx:235), [footer](/Users/kamil/Desktop/styledukprodprogress/components/SiteFooter.tsx).

### 21. Give the manual operations team an actionable daily queue

Build on the staff inbox: make overdue supplier replies, unreviewed listings, customer questions and stale availability easy to spot. Keep customer, venue and supplier status wording aligned. Show who needs to act and when the item was last updated. For calendars, use distinct wording for a whole-day venue booking, a viewing appointment and a supplier stock block. Do not add heavy automation until the pilot identifies repeatable manual work.

Evidence: [existing staff inbox](</Users/kamil/Desktop/styledukprodprogress/app/admin/(panel)/page.tsx:25>), [admin navigation](/Users/kamil/Desktop/styledukprodprogress/components/admin/AdminNav.tsx).

## Recommended implementation order

1. **Trust and reliability:** align request/payment wording, repair save feedback and loading protection, add account recovery, repair supplier-to-catalogue destinations.
2. **First-time and mobile flow:** short Wedding plan setup followed by an editable overview; compact catalogue/location controls; readable navigation and a clear booking shortcut.
3. **Pilot venue operations:** separate viewing requests from wedding dates; add alternative-date follow-up; clarify existing-listing access and draft-media privacy.
4. **Everyday planning:** product detail sheets, direct Add to board actions, board-look consistency and a staged visualiser interface.
5. **Operational polish:** publication checklists, sync health, isolated loading failures, keyboard testing and staff follow-up queues.

No new payment processor, AI image pipeline or complex supplier inventory integration is required for the first two passes.

## Verification for the next pass

- First-time couple: create account, set a date or leave it undecided, save a basic plan, browse relevant products and understand the request step.
- Returning couple: edit a single plan group, reload, use Back/Forward and find the same saved state and correct destination.
- Slow/failing network: edits are not overwritten and failed saves do not display Saved.
- Supplier profile: a shopping action lands on the right catalogue/product, with an acknowledgement and sensible quantity.
- Mobile: plan and catalogue tasks work at 390px without horizontal overflow; products and save actions are easy to reach; bookings remain discoverable.
- Venue customer: request a viewing separately from a wedding date and follow an alternative without recreating the entire conversation.
- Operator: add or gain access to a listing, understand media visibility, save a draft and see review/publication status.
- Supplier: recover login, distinguish setup from publication, confirm/decline items and identify stale calendar data.
- Keyboard-only: reach all principal controls, use dialogs and menus, identify visualiser inputs and return focus predictably.

## Additional source-review caveat

The older guest/login dialog and standalone login implement different account-transfer behaviour, while customer workspace restoration runs on mount. This should be reconciled if guest studio access or in-place account switching is supported. The current middleware protects /design for real accounts, so this review does not claim ordinary new customer sign-in currently reproduces a guest-work transfer failure.

## Implementation follow-up

The improvements from this audit were implemented in the subsequent pass. See [implementation and verification notes](./usability-improvements-2026-10-23.md) for delivered changes, checks and remaining external-service boundaries. The findings above describe the reviewed snapshot, not the revised site's current behaviour.
