# Staff, support, order and basket text simplification — 7 November 2026

Completed in the shared development checkout. No commits, deployments, provider sends, database work, API changes or environment changes were made for this sweep. Other agents’ changes were preserved.

## Result

Keep the current state and next action short. Use one critical notice near the relevant action; put supporting mechanics, background and audit history into native disclosures. Keep meaningful prices, fees, dates, supplier conditions, consent, blockers, uncertainty warnings and errors available at the decision point. Do not reduce type to make prose fit.

The staff guide now opens with tools and task choices rather than a long handbook. Checkout no longer repeats the manual-review and payment explanation in its header, help, nested form panel and totals. The basket keeps the item subtotal, separately quoted fees and a single request warning visible. Request/support panels lead with a short state; provider IDs and history are secondary. Operational warnings were shortened, not removed.

## Inventory and decisions

Every file under the requested component/route ownership, plus the two basket/checkout components and support library, was reviewed. Unchanged data/label-only screens and wrapper routes are included below. Venue and pilot components delegated by these routes remain with their respective agents.

| File | Outcome | Audit decision |
| --- | --- | --- |
| `app/admin/(panel)/accounts/page.tsx` | Reviewed; retained | Retained: data-led heading, search, concise empty state and errors. |
| `app/admin/(panel)/availability/page.tsx` | Simplified | Short capacity intro and stock-hold description; retained dates, capacity actions, affected-order warnings and errors. |
| `app/admin/(panel)/guide/page.tsx` | Simplified | Replaced long always-open handbook with ten task disclosures and direct tool links. Preserved business rules, legacy status meaning, staff-only commission/default, invitation approval, publication review, prices and notification limits; removed obsolete unconditional email promises. |
| `app/admin/(panel)/layout.tsx` | Reviewed; retained | Reviewed server access boundary; no copy or authorization changes. |
| `app/admin/(panel)/locations/page.tsx` | Simplified | Short business-confirmed/private-postcode/coverage notice; retained privacy and unconfirmed-fee/slot meaning. |
| `app/admin/(panel)/operations/page.tsx` | Simplified | Short service setup states and next actions; kept disabled-email and unverified-callback warnings. No configuration logic changed. |
| `app/admin/(panel)/orders/[id]/page.tsx` | Simplified | Short next step, availability/acceptance instruction and estimate caveat. History behind disclosure; customer messages, staff notes, decisions, totals and errors retained. |
| `app/admin/(panel)/page.tsx` | Reviewed; retained | Retained: operational queue, search/status filters and factual order summaries. |
| `app/admin/(panel)/pilot/page.tsx` | Reviewed; retained | Wrapper retained. Delegated components/pilot/PilotWorkspace is outside this ownership; no cross-agent edit. |
| `app/admin/(panel)/requests/page.tsx` | Reviewed; retained | Wrapper; simplified owned RequestTracker. |
| `app/admin/(panel)/suppliers/[id]/page.tsx` | Reviewed; retained | Retained: product search/status/actions, supplier fields, approved-email invitation consent, stock notes and errors. Shared editor/review text simplified in their owned components. |
| `app/admin/(panel)/suppliers/crescent-moon-preview/page.tsx` | Simplified | Supplier background/lead times and approval checklist behind disclosures. Short price-on-request/approval copy; private-preview notice, specifications, pricing breakdown and deposits retained. |
| `app/admin/(panel)/suppliers/page.tsx` | Reviewed; retained | Retained: supplier count, create action, form labels, list and errors. |
| `app/admin/(panel)/support/page.tsx` | Reviewed; retained | Short inbox heading; copy simplified in SupportRequests. |
| `app/admin/(panel)/vendors/page.tsx` | Reviewed; retained | Retained: application states, business-submitted content, contact details, decisions and concise empty state. |
| `app/admin/(panel)/venue-notifications/page.tsx` | Reviewed; retained | Wrapper; simplified owned VenueNotificationQueue. |
| `app/admin/(panel)/venues/[id]/enquiries/page.tsx` | Reviewed; retained | Wrapper retained. Delegated components/venues enquiry content belongs to the venue agent. |
| `app/admin/(panel)/venues/page.tsx` | Reviewed; retained | Wrapper retained. Delegated components/venues content belongs to the venue agent. |
| `app/admin/layout.tsx` | Reviewed; retained | Reviewed layout; no explanatory copy to simplify. |
| `app/admin/login/page.tsx` | Reviewed; retained | Redirect-only route; unchanged. |
| `components/admin/AdminNav.tsx` | Reviewed; retained | Retained: concise section selector and sign-out action. |
| `components/admin/AttentionQueue.tsx` | Reviewed; retained | Retained: short task intro, direct support action, existing attention-rules disclosure and visible source/error warnings. |
| `components/admin/ProductEditDialog.tsx` | Simplified | Short publication consequence remains beside Save; existing-request price protection retained. |
| `components/admin/RequestTracker.tsx` | Simplified | Shortened current/example notices, tracker intro, follow-up notes and empty-state action. Fictional/reset scope, truncation and unverified delivery remain visible. |
| `components/admin/StatusPill.tsx` | Reviewed; retained | Retained operational status labels. |
| `components/booking/BookingOperations.tsx` | Simplified | Shortened repetitive instructions across quote, supplier reply, logistics, arrangements, claims and notifications. Quote-issue mechanics behind disclosure. Forms, costs, consent, expiry, invalidation, acceptance/cancellation consequences and errors retained. Existing small labels promoted to text-sm. |
| `components/booking/NotificationQueue.tsx` | Simplified | Short sending state. Scheduler explanation behind disclosure; uncertainty warning, failure details, recipient delivery states and processing controls retained. |
| `components/booking/PilotReadiness.tsx` | Simplified | Short trial/evidence guidance. Supplier background and worksheet explanation behind disclosures; sender scope, checks, agreements and private-save meaning retained. |
| `components/booking/RequestAttention.tsx` | Simplified | Short stock-hold/review instruction. Kept seven-day threshold, expiry/closure consequences and truncation warnings. |
| `components/booking/SupplierRangeReview.tsx` | Simplified | Short review/publication copy. Permission-withdrawal consequences remain visible; retained-image detail behind disclosure. Existing consent controls, review state, approval action and audit records retained. |
| `components/booking/VenueNotificationQueue.tsx` | Simplified | Short sending state and uncertain-send warning; retry mechanics behind disclosure. Errors, states, attempts and provider delivery reports retained. |
| `components/design/BasketPanel.tsx` | Simplified | Short help label. Fees remain visible beside the subtotal and one no-reservation/no-payment notice beside the action. Increased small price, quantity and stock-warning text; all dates, quantities, minimums, totals and blockers retained. |
| `components/design/CheckoutStep.tsx` | Simplified | Removed repeated manual-review/no-payment paragraphs. Kept one critical submission notice, separate fee/deposit estimate caveat, named event, dates and availability errors. Short saved receipt and lead-time help. |
| `components/order/MyBookings.tsx` | Simplified | One-line confirmation boundary above supplier/venue tabs. |
| `components/order/MyOrders.tsx` | Simplified | Shortened empty state to the basket action; existing refresh, browse and error controls retained. |
| `components/order/OrderStatusCard.tsx` | Simplified | Short state and next action; concise estimate warning. Prices, dates, supplier decisions and customer messages retained; small status labels enlarged. |
| `components/support/SupportContent.tsx` | Simplified | Short question intro and saved-reference receipt; account requirement and sensitive-data warning remain. Preserved booking-change warning and email fallback actions. |
| `components/support/SupportProvider.tsx` | Reviewed; retained | Retained: short support title/intro and close control. |
| `components/support/SupportRequests.tsx` | Simplified | Shortened inbox/reply instructions. Queue state, provider state, errors and retry limits stay visible; raw provider message ID moved into a disclosure. |
| `lib/support.ts` | Simplified | Shortened the seven quick answers only; draft validation, email destination and mailto generation untouched. |

## Meaning preserved

- Basket/checkout: quantities, unit and supplier totals, budget/minimum shortfalls, date controls, availability blockers, estimate/fee/deposit caveats, no reservation/payment on request, and error/retry actions.
- Customer requests: reference, event and hire dates, supplier decisions, Styled messages, estimate distinction, quote acceptance and agreed payment arrangements.
- Staff support: saved reference/status, customer-visible reply scope, no automatic reply-email claim, queue/provider state, uncertain/exhausted send warnings, safe retry and all errors.
- Staff booking: supplier checks and fees, VAT confirmation, quote expiry and consent, fresh-check/invalidation effects, offline contract/payment responsibilities, cancellation review, claim amount/evidence and no automatic refund/charge.
- Range review: private uploads, fresh approval for material edits, separate public/AI permissions, withdrawal consequences, unchanged recorded prices, declarations and approval history.

## Verification and limits

- Shared full test run: **391 passed, 0 failed, 0 skipped**. Earlier pass during the sweep: 383 passed; the suite grew through concurrent agents’ work.
- `npx tsc --noEmit`: passed.
- Changed owned TS/TSX files: syntax parsing passed (22 files).
- `git diff --check`: passed.
- No new implementation-mirroring tests were added for copy-only work. Existing support, shopping, booking, notification and publication checks exercised the shared code.
- Native browser has no available window. **No authenticated browser, desktop/mobile layout, keyboard, or hosted UI pass is claimed.** These remain for parent integration verification.
- Parent owns the final build. No build or deployment was initiated by this sweep.

Native details/summary elements keep secondary text keyboard accessible without new scripting. Review the changed basket price/quantity labels and expanded staff forms at 360/390px during parent UI verification; several existing tiny labels were increased to text-sm rather than reduced.
