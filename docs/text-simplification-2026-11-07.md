# Website text simplification — 7 November 2026

## Scope and approach

Scanned all 159 existing TSX files under `app/` and `components/` for visible JSX paragraphs and summaries, including public pages, studio, customer requests, authentication, supplier/venue workspaces and staff screens. The initial extraction identified 70 paragraphs with at least 32 static words. Dynamic text and content arrays were also inspected in the owned areas. This is a source audit, not a claim that every screen was visited in a browser.

Edits in this sweep are limited to `app/(site)`, `components/venues` except `VenuePortal.tsx`, and `components/vendor`. Public header/footer were reviewed and already had short labels, so no change was needed. Noether owns VenuePortal's guard changes. Other agents are editing studio, authentication, supplier route pages, staff pages and shared help. Their concurrent changes and existing documentation were preserved.

No fonts, headline scales, palette, business rules, API behaviour or policies were redesigned. Small utility/help text in the owned pages was raised from 10–12px to the existing 14px `text-sm` size. Form inputs retain the existing mobile 16px rule. No commits, deployment, publication, payment activation or Next build performed.

## Findings and completed changes

| Area | Finding | Completed treatment |
| --- | --- | --- |
| Landing | Hero, features and final CTA repeatedly explained the same request/inspiration caveats. | Shortened introductions, feature descriptions and final CTA. Retained the adjacent AI example notice, no-payment/manual-confirmation trust band, FAQ details and service link. |
| Public business hub | Long descriptions repeated onboarding and portal explanations. | One-line venue/product summaries and short preview actions; retained links to both workspaces and access support. |
| Supplier application | Join page embedded the standalone application page, producing two primary headings and repeated introduction text. | Extracted `components/vendor/VendorApplication.tsx`; standalone route keeps H1, embedded application uses H2. Form submission and fields unchanged. Shortened introduction; existing fee/commission information stays visible. |
| Supplier discovery/profile | Directory and profile CTA repeated the full request sequence and delivery caveats. | Short introductions and next actions. Kept quote/availability and no-payment information; supplier-entered service terms, prices and deposit details remain accessible in full. |
| Venue directory/search | Introduction, empty state, saved venue prompt and bottom notice repeated reservation guidance. | Short search invitation, actionable empty states and one concise saved-venue notice. Date confirmation caveat and device-only shortlist label remain visible. |
| Venue detail/enquiry | Repeated booking instructions above the form, sidebar and sign-in prompt. | Short next actions and sign-in message. Confirmation/no-payment notice remains beside submit. Request success, pricing/inclusions, venue terms and date errors remain visible. |
| Venue onboarding | Checklist, supplier modes and review steps dominated the first view. | Native expandable “What you’ll need” and “Supplier options and listing review”; application/contact actions and commercial arrangements statement stay outside the disclosures. |
| Venue supplier journey/settings | Repeated explanations of catalogue modes, external systems and linking. | Short mode descriptions and next actions. External booking/no-sync warning remains next to its link; public-only details, approval requirements and separate supplier access remain clear. |
| Routing preview | Long simulation instructions repeated the no-save warning. | Concise preview label, shorter steps and expandable local-sourcing explanation. Settings still state they are not saved or published. |
| Demo venues/bookings | Repeated full disclaimers before, during and after practice actions. | Clear practice-only notices and short next actions. Fictional pricing, no reservation/payment, refresh reset and search-filter limitations remain disclosed. |
| Tours/media | Empty placeholders repeated that media had not been added. | One empty-state message; shorter tour/viewing prompts. Host disclosure and alternative viewing route retained. |
| Supplier setup/product editor | Long explanations after controls repeated the workflow. | Short private-draft/review messages and postcode help; retained price-preservation, privacy, lookup-provider, permissions and delivery-confirmation information. |
| Mobile utility text | 10–12px metadata, help, status and business navigation labels. | Existing 14px size used throughout owned non-policy pages/components. Supplier logo/badge can wrap on narrow screens. Heading families, sizes and colours unchanged. |
| Public order/support | Verbose introductory and lookup/help instructions. | Short status/lookup instructions and complaint/access prompt. Error output, account handling, support privacy and service links retained. |

Full privacy and terms pages, their date/version and legal disclosures are unchanged. Full service information remains the detailed reference. No contractual warning, dynamic supplier condition, price, fee, cancellation restriction, date validation or error was intentionally put behind a new disclosure. New disclosures contain secondary onboarding/sourcing guidance only.

## Whole-site findings handed to other owners

The initial source scan also flagged long staff-guide explanations of notifications/availability, supplier import and calendar help, supplier range permission notices, studio checkout/AI guidance, order estimate warnings and Pinterest help. Other agents are simplifying those areas concurrently. Permission withdrawal, calendar-feed limitations, payment/quote notices and consumer information must remain available rather than be deleted for word count. No edits were made here to those owners' files.

Existing staff-only request-tracker and pilot preview routes were inspected: they redirect to protected admin routes and have no public explanatory text to simplify. Public product/detail and policy routes were inspected; dynamic product facts and full policies were retained.

## Checks and limits

- TypeScript `npx tsc --noEmit`: passed after the main edit pass; final repeat recorded below.
- Focused existing venue/supplier tests: **36 passed, 0 failed** (`venue-workflow`, `venue-review`, `venue-suppliers`, `demo-venue-booking`, `supplier-workspace`).
- New `tests/public-text-simplification.test.cjs`: **3 passed, 0 failed**. Server rendering verifies one primary heading for standalone/embedded applications, visible fee information, native onboarding disclosures, and confirmation/no-payment notice beside enquiry submission.
- Owned-path `git diff --check`: passed.
- Full suite snapshot during concurrent integration: **378 tests, 371 passed, 7 failed**. Failures were in catalogue-product-UX and visualiser-selection tests covering concurrently edited design components. No failure was in the owned venue/supplier checks. Parent owns final integrated tests and build; this snapshot is not reported as a clean full-suite pass.
- Readability/layout checks here are source and server-render checks: reviewed wrapping, responsive grids, existing mobile input rule and 14px helper text. No new browser walkthrough or screenshots claimed. Parent reports native browser `noWindows` after reviewing the current product and cannot complete broader UI checks. Actual narrow-screen overflow, keyboard interactions and disclosure behaviour still require browser verification when available.
- `VenuePortal.tsx` changes visible in the shared diff belong to Noether; this sweep did not modify that file. Existing action-plan/build-record documentation was not overwritten.
- Final TypeScript repeat: **passed**, exit 0. No Next build started.
