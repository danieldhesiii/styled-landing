# Usability and venue review update

Development only, 28 October 2026. This update does not release to styleduk.com or change the live database.

## Clear entry points

The public header prioritises finding venues, suppliers, business access, login and starting a plan. The business page distinguishes venue owners from product suppliers, with separate onboarding and login actions. Venue login and Supplier login also appear in the footer. Existing linked accounts have My venue workspace and My supplier workspace in the account menu.

## Customer navigation

The studio has five main destinations: Wedding plan, Browse, Boards & saved, Visualise and My bookings. Browse groups catalogue products and venue discovery, keeping venue-specific supplier routes intact. Boards keeps its own page, with Saved items and Saved looks as adjacent collection tabs. Existing route URLs continue to work. Mobile uses five clearly labelled destinations, including bookings. Duplicate booking controls, saved headings and board shortcuts have been removed. The Google Photos and Pinterest instructions remain visible as requested; integrations have not been invented or changed.

## Venue workspace

The portal opens with an Overview, listing status and next actions rather than a long editing form. Draft, Awaiting review, Changes requested, Unpublished changes and Published have distinct explanations. Staff feedback appears directly in the venue workspace. Saving a draft retains feedback; resubmitting clears the old feedback and returns the listing to review. Mobile uses a section selector; desktop retains section tabs. Listings, supplier choices, booking enquiries and calendar controls remain separate.

## Staff review

/admin/venues is a review inbox with counts, search, Awaiting review, Changes requested and All venues. The selected submission has a readable venue summary, photograph, supplier route, local sourcing settings and expandable practical details. Raw JSON is no longer the review interface. Staff can approve and publish or request changes with a required explanation. Review decisions include the submission revision; stale decisions are refused. Published editing, team access, calendar, photographs and packages are optional sections rather than competing with the review action.

Staff can link a venue team using an existing confirmed account email rather than copying user IDs. The server performs the lookup and retains staff-only authorisation; it does not create accounts or send invitations. Linked account emails are visible only to staff in team management.

## Notifications and data

Submission, changes-requested and publication alerts use the existing email provider when configured. They are best effort; the in-app status and feedback are authoritative. Without a configured sending key, no automatic email delivery is promised. Alerts contain an update and workspace link, not customer booking data or a contract.

Feedback is private metadata on the existing venue draft payload. Public venue parsing strips it during publication. Existing row-level security, staff checks, venue memberships and public catalogue rules are retained. No new schema or permissions are required.

## Verification

All 143 automated tests pass. Automated tests validate feedback bounds, status labels, revision-scoped review writes, stale publication refusal, verified account email lookup, feedback preservation and resubmission. Existing supplier, booking date, catalogue, auth and venue routing tests remain included.

Browser checks use a disposable development venue and synthetic account, with email explicitly disabled. The full workflow covers submitted draft, staff feedback, owner editing, resubmission, staff approval and published status. Navigation, saved collections and narrow phone layouts are checked. Test-only staff access, venue, draft and account are removed after testing. No real supplier messages, bookings, payments or paid image generation are created.
