# Styled usability improvements

Implemented from the 23 October usability audit. The customer website remains connected to Wedding Planner Dev (`qkyeitvwscrxbiwamxan`). The original production database was not changed.

## Customer experience

- Wedding plan opens with a short setup for new couples, including undecided dates, estimated guests and an unset supplier budget. Returning couples get an overview and focused edit sections. Optional venue photos have their own section.
- Saved details load before plan and board editing. Saves report success only after persistence; conflicts and failures remain visible. Saved-look changes retain the previous state on failure and disable repeated requests while saving.
- Studio destinations are URL driven. Browser Back and Forward work, supplier shopping links open the catalogue, and added selections are acknowledged. My bookings is directly available in the header on phones and desktops.
- Location and date controls collapse into summaries. Catalogue search, expandable filters and removable filter chips put products nearer the start of a phone screen.
- Product detail sheets distinguish supplied information from missing specifications, and illustrative imagery from supplier photography. Seeded ratings are not presented as verified reviews.
- Known unavailable stock and excess quantities are addressed on products and in the basket. Proceeding requires a successful check of the current quantities and delivery-to-wedding interval.
- Products and saved looks can be pinned directly to boards. Board selection includes catalogue-image previews. Boards include visual product selection and compact, explicit manual Google Photos/Pinterest import guidance.
- Board looks open by their owned render ID even if removed from favourites. Visualise has a short progression, labelled prompts, saving feedback and illustrative-image guidance.
- Catalogue loading or failure does not prevent opening the plan, boards or bookings. Shopping actions show loading/error states and offer retry.

## Venue, supplier and staff experience

- Viewing appointments have a separate date/time and confirmation state. Confirming a viewing never reserves a wedding date or conflicts with wedding-day stock checks.
- Customers can request a suggested alternative within the existing request. The venue must review it again. Existing replies are retained.
- Customer and venue messages remain in the request, with the next actor shown. Participants alone can read the conversation; unrelated customers, other venue teams and nonparticipant staff cannot read message bodies through this API.
- New versus already-listed venue onboarding is explicit. Listing readiness and review state are visible. Unsaved venue edits receive Save/Discard/Stay protection, with native dialog focus handling.
- Unpublished listing drafts and publicly accessible uploaded media are clearly distinguished before upload and while editing. Demo venues and blank video/3D-tour sections remain marked as previews.
- Supplier setup separates hidden/draft, total and publicly live products. Public profile links reflect actual publication.
- Calendar health distinguishes disconnected, never synced, current, stale and failed manual attempts, with last-success and retry guidance. A failed write cannot report a successful sync.
- The staff inbox includes applications, venue drafts, overdue supplier replies, stale calendars and customer venue requests/messages needing a response. The queue is read-only, staff gated, bounded and explicit about its sampling limits. Conversation bodies and private feed URLs are excluded.

## Account access and service clarity

- Public Log in and actual account registration replace the redundant email capture step.
- Password recovery, confirmation resend, safe callback destinations and supplier access recovery are available. Temporary supplier checks preserve valid account sessions.
- Guest transfers require short-lived server-issued ownership proof before login; a caller-selected anonymous account ID cannot trigger a transfer.
- Login, product, help and unsaved-change dialogs use native modal behaviour; visualiser prompts have associated labels. Help is audience appropriate and remains off the landing page.
- The homepage, basket, checkout and tracking use the same manual-request sequence. Estimates and illustrative deposits are distinguished from agreed charges. Support, privacy and service-information pages are linked from registration and the footer.
- The Dev auth site URL points to `https://styledukprodprogress.vercel.app`; the callback path is allow-listed for confirmation and recovery. Outbound recovery/confirmation email delivery still needs a real inbox acceptance check.

## Verification

- 87 automated tests passed, covering account redirects and ownership proof, shopping/quantity rules, request access, alternative dates, viewing-versus-booking behaviour, sync failures and staff queue projections.
- TypeScript validation passed. Both local production builds passed. The final deployed snapshot is also built by Vercel.
- The venue migration was applied to Dev. Transactional database tests passed and rolled back all synthetic fixtures. Validated request constraints, conversation RLS and service-only invoker functions were checked afterward.
- Browser checks covered real account login, restoration, plan saving, direct product-to-board persistence, compact phone layouts at an actual 390px content width and Back/Forward navigation. No horizontal overflow was observed on the checked customer screens.
- Staff queue queries were checked against Dev without changing records or granting staff access. Database security advisors reported no new request-thread policy/function warnings; existing project-level warnings remain outside this usability pass.
- No real booking, order, payment, supplier email or AI generation was triggered for testing. No passwords were reset. Disposable customer fixtures are removed after verification.

## Deliberate boundaries

Google Photos/Pinterest OAuth connections, payment processing, automatic 3D reconstruction and AI model/pipeline changes are not part of this pass. Product specifications remain explicitly unknown until supplied. Calendar failure history is not persisted separately. Business-upload media remains public storage; the interface now states this accurately. Legal/provider-specific policies and real-inbox delivery need business acceptance before public launch.
