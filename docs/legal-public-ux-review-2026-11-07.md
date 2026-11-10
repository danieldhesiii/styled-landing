# Phase 7 legal/service content and public UX handoff

Date: 7 November 2026. Internal staff record; not customer-facing policy.
Scope: development checkout `styledukprodprogress`, branch `main`, starting revision `555d5fc`. Initial checkout was clean; other agents subsequently made concurrent changes. No commits, deployment, publication, payment activation, database changes or live configuration changes made by this work.

## Status

Implemented the evidence-backed public content and UX changes. **Phase 7 production acceptance remains gated**: a complete privacy notice needs verified controller identity, approved lawful bases, retention and transfer disclosures; marketplace terms need commercial decisions and qualified legal review. The customer pages explain current behaviour without invented legal entities, fixed deposits, refund schedules, commissions or response promises. These pages are not evidence of legal sign-off.

Owned changes:
- `app/(site)/privacy/page.tsx`: data categories/purposes, providers, optional Pinterest, fonts, storage, deletion limitations, conditional rights and ICO complaint route.
- `app/(site)/terms/page.tsx`: request versus quote acceptance versus booking; distinct venue enquiries; contract-party checks; hire/sale, fulfilment and cancellation information; statutory rights; image permissions. Removed duplicated AI disclaimer.
- `app/(site)/service-info/page.tsx`: concise current journey, manual confirmation, support receipt versus email delivery, complaints and accessibility contact.
- `app/(site)/support/page.tsx`: privacy/service links and complaints/accessibility direction; no support business logic changed.
- `app/(site)/_components/InformationPage.tsx`: consistent date/version, headings, readable measure, wrapping, 44px navigation targets and section links.
- `app/(site)/page.tsx`: AI example label next to hero and service-information link below FAQs.
- `components/SiteFooter.tsx`: five clear links, consistent visible link styling; business entry links to the existing hub containing both business logins.

## Requirements and evidence matrix

| Requirement | Verified implementation / public treatment | Unresolved gate and accountable role |
| --- | --- | --- |
| Company/controller/contact identity | Existing support address retained. Removed unsupported assertion that a particular company operates the application. No company number, address or legal entity fabricated. | Business owner + adviser: supply legal/trading name, address, company/registration/VAT details where applicable, controller identity and privacy contact responsibility. Add required disclosures before public release. |
| Purposes and lawful bases | Account/event/request/support/media purposes traced to application routes and persistence. Public copy lists actual uses. | Controller + privacy adviser: approve purpose-by-purpose Article 6 bases, legitimate-interest assessments where used, consent withdrawal and any sensitive-data handling. Do not infer a contractual basis from account creation. Public notice remains incomplete until this is done. |
| Data rights and complaints | Conditional access, correction, deletion, restriction, objection, portability, consent withdrawal; usual one-month legal period; direct ICO complaints link. | Staff owner: document identity checks, response tracking, exemptions/extensions and rights-request escalation. Confirm any required DPO/representative details. |
| Retention and deletion | Browser clearing/sign-out/Pinterest disconnect do not erase server records. No fixed retention period or immediate backup erasure promised. No general account-deletion endpoint found in inspected code. | Controller + engineering: approve periods/criteria for accounts, abandoned guest data, plans/media, orders/quotes, support, logs, tokens and backups; implement and test deletion/anonymisation, legal holds and provider backup expiry. Support-on-request is not a complete retention schedule. |
| Processors and transfers | Supabase auth/database/storage, Vercel hosting, Google Fonts; OpenAI default with configurable endpoint; Resend preferred, Brevo fallback configuration. | Controller + engineering: confirm deployed providers, auth SMTP separately, contracts/subprocessors, regions, international transfers and safeguards/copy access. A configurable endpoint is not evidence of the deployed AI provider or its training/retention policy. |
| Cookies/storage/consent | Auth session cookies, design local storage, venue shortlist storage, Pinterest state (10 minutes) and encrypted token (up to one hour). No banner added or exemption claim made. | Engineering + privacy adviser: inventory actual deployed cookies/storage/network before and after sign-in, Pinterest and media; include hosting-injected analytics, external media and fonts; classify under current PECR, gate optional access and provide withdrawal where needed. Source inspection alone cannot establish banner requirements. |
| Customer planning/request terms | Saving, previewing and submitting do not reserve stock or collect money; manual supplier checks; quote acceptance asks for separate booking confirmation. | Business owner + adviser: approve Styled's own service terms and exact contract-formation point, including status/email copy in other agents' ownership. |
| Contract party and supplier agreement | Existing booking handover supports undecided/supplier/Styled contract party; public pages require written identification rather than asserting Styled is always agent or principal. | Business owner + suppliers + adviser: decide contract party separately for product hire, sales, venue hire and platform services; authority to bind, responsibilities, supplier onboarding agreement and customer disclosure. |
| Hire/sale and fulfilment | Public copy tells users to check units, specifications, hire period, delivery/setup/collection, access and deadlines. | Commercial owner + supplier: agree price/tax basis, lead times, delivery areas/costs, setup, collections, customer duties and late returns per product/service. No supplier location, availability or fee invented. |
| Cancellations/refunds | Cancellation request records review, not automatic cancellation/refund. Consumer rights preserved; no blanket cooling-off exclusion or non-refundable deposit. | Adviser + commercial owner: assess sale, hire and date-specific services separately; settle mandatory information, cancellation form where applicable, refunds, changes and fair cancellation charges. Specific-date exceptions are not a universal wedding exemption. |
| Deposits/damage/security | Public page distinguishes estimates, reservation deposits and refundable security; asks users to check written terms. | Commercial owner + supplier + adviser: agree amounts, payment/return dates, evidence/inspection, damage/loss disputes, deductions and refund authority. |
| Venue enquiries/bookings | Viewing appointments do not reserve event dates; venue and product requests remain separate; demo venues cannot be booked. | Commercial owner + venue: agree inclusions, restrictions, final contract, cancellation and responsibility for third-party products. |
| AI and reference rights | Clear illustrative-image wording; no exact-match or stock guarantee; permission needed for uploads and AI use. Pinterest read access and image reuse are independently controlled. | Business owner + adviser: confirm image licences/consents and evidence for public/AI supplier assets; verify deployed Pinterest approvals/flags; check previews/embeds after Boards removal by other agent. |
| Complaints/accessibility | Support and service pages offer email without login, complaint context and requests for help/alternative formats. Existing keyboard focus and skip link retained. | Staff owner: assign complaint handling/escalation, applicable ADR information and accessibility requests; no response SLA or conformance certification invented. |
| Commission/payment handling | Pages consistently say no online payment in request service. No commission percentage or automatic charge created. | Business owner + adviser: settle commission, invoicing, money recipient, refunds/charge authority and regulatory implications before payment work. |
| Request-point policy links | Public footer and support page link to privacy/service terms. | Parent/customer-flow owner: verify privacy and terms at product request, venue enquiry, quote acceptance and sign-up after concurrent changes. Those surfaces are outside this owned patch. |

## Implementation evidence inspected

- `app/layout.tsx`: Google Fonts stylesheet and preconnects.
- `lib/supabase/middleware.ts`, `lib/supabase/server.ts`, `components/session/GuestSession.tsx`: sessions and guest capabilities (do not assume every public visitor gets a guest account).
- `app/design/page.tsx`, `components/venues/VenueShortlist.tsx`: browser drafts and shortlist storage.
- `app/api/support/route.ts`, `components/support/SupportContent.tsx`: verified-account submission, durable reference, owner-scoped history. Notification delivery is being changed by a different agent; receipt language deliberately does not depend on that result.
- `lib/server/image-model.ts`, `app/api/improve-prompt/route.ts`, `lib/server/env.ts`: images/prompts sent to configurable OpenAI-compatible endpoint, default OpenAI.
- `lib/server/notify.ts`, `lib/email-provider.ts`: supported email providers; code support does not prove deployed configuration.
- `lib/server/pinterest-import.ts`, `app/api/pinterest/route.ts`, `app/api/pinterest/callback/route.ts`: read scopes, encrypted browser cookies, approval gates, separate image-reuse flag and cookie expiry.
- `components/wedding/PinterestPreview.tsx`, `lib/pinterest.ts`: optional third-party preview requests, distinct from API authorisation.
- `app/api/client-errors/route.ts`, `lib/server/limits.ts`: error records and hashed network rate limits.
- `components/booking/BookingOperations.tsx`: quote acceptance does not collect money or automatically confirm supplier booking; offline handover records contract-party and commercial agreements.

## Current UK primary sources researched through web tool

Checked 7 November 2026. ICO direct page fetches sometimes returned 403; indexed ICO guidance and official documents supplied the relevant passages. No third-party summaries used as authority.

- [ICO: Right to be informed](https://cy.ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-be-informed/) — notice identity, purpose/basis, recipients, transfers, retention and rights. Missing evidence remains a release gate rather than a guessed disclosure.
- [ICO: rights supporting notes, January 2026](https://ico.org.uk/media2/u3tjtppo/module-9-people-s-rights-part-2.pdf) — conditional rights and usual one-month response period, subject to applicable checks/exceptions.
- [ICO: storage and access guidance](https://cy.ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/) and [29 April 2026 finalisation](https://cy.ico.org.uk/about-the-ico/media-centre/news-and-blogs/2026/04/final-storage-and-access-technologies-guidance-published/) — current PECR treatment extends beyond cookies; exceptions changed following the Data (Use and Access) Act. No blanket “all analytics requires consent” or “no banner required” claim.
- [GOV.UK: distance selling](https://www.gov.uk/online-and-distance-selling-for-businesses) — trader details, complete prices, fulfilment and cancellation/deposit information before agreement, with saveable contract information. Applicability must be reviewed by contract type.
- [Consumer Contracts Regulations 2013, Part 3](https://www.legislation.gov.uk/uksi/2013/3134/part/3/made), regulation 28(1)(h) — specific-date accommodation/catering/leisure exceptions require service-specific review, not blanket exclusion for wedding products.
- [CMA: unfair contract terms guidance, updated 22 July 2026](https://www.gov.uk/government/publications/unfair-contract-terms-cma37) and [writing a fair contract](https://www.gov.uk/guidance/writing-a-fair-contract-for-customers) — transparent terms, fair deposits/cancellation charges, no broad consumer-rights disclaimer.
- [GOV.UK: Equality Act guidance, updated 22 May 2026](https://www.gov.uk/guidance/equality-act-2010-guidance) — accessibility context; no claim of public-sector accessibility certification. Northern Ireland applicability requires separate review if relevant.

## Validation and public audit

- Baseline `npm test`: **332/332 passed** (before other agents' additions).
- Parent reports integrated snapshot **360 tests pass and TypeScript passes**; parent owns final build. This agent did not run Next build.
- Initial TypeScript attempt overlapped local Next startup and reported disappearing `.next/types` files (TS6053). This is a generated-output race, not treated as a clean pass; use parent's final integrated check.
- Local `/privacy` returned HTTP 200. Browser rendered the page at desktop (1280px) and narrow mobile (320px). At 320px, document width 305px was within the viewport; at desktop document width 1265px was within viewport. Privacy jump anchors all resolved. Clicking Your rights placed the target at 80px below the sticky header ending at 73px. Date, headings, navigation and support/ICO links appeared in accessibility output.
- Browser navigation became unreliable/timeouts while switching to terms. **Full public walkthrough, keyboard-only end-to-end, deployed cookies/storage inventory and all public routes remain unverified**; parent also reports extension timeouts. No full-site accessibility/compliance claim.
- Existing global focus styling, reduced-motion treatment, skip link and sticky-header anchor offset were inspected. Changed public links have visible underlines, wrapping and at least 44px height for navigation/actions.
- No customer support message, external email, account creation, quote acceptance, payment or listing publication was performed during checks.
- Final focused suite: **24/24 passed** (`support`, `pinterest-import`, `help-routing`). Static server rendering of all four information/support pages passed single-H1, canonical URL, local route and same-page anchor checks. Owned-file `git diff --check` passed.
- Preview server stopped after QA so it will not compete with the parent's final build. Server logs also show `/terms` HTTP 200, but this is not counted as completed browser interaction verification.
