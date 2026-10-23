# Manual order review and consistent studio sections

## Customer flow

1. Basket holds unsubmitted choices. Saving a product or AI look does not add it to the basket.
2. Request supplier confirmation opens the request form. Submit request for manual review creates a requested order, not a payment or a confirmed booking.
3. My orders is a normal studio section at `/design?tab=orders`. It shows submitted requests and their confirmation status. The basket remains separate.
4. Saved looks is a normal studio section at `/design?tab=looks`, including direct links and active navigation. Opening a saved look selects the visualiser.
5. Shop this look scrolls to the catalogue pieces immediately below the visualiser. Add, quantity, remove and save work there without changing the section. Browse the full catalogue switches to catalogue browsing.

## Manual confirmation by email

- New requests are visible in the existing staff order dashboard and trigger a staff review email when sending is configured.
- Each supplier receives their own products and delivery/event dates. The email asks them to reply with confirmation, or their nearest available dates/alternatives. A portal login is optional for replying.
- Sender: `Styled <support@styleduk.com>`. Reply-to: `support@styleduk.com`. These values are configured in Vercel Production and Preview.
- Staff review replies in the support inbox and record decisions/messages through the existing admin tools. Changing the customer-facing message sends an update, including proposed alternative dates, when email is configured.
- No automated alternative-date suggestions are invented. No inbound email parser or automatic booking acceptance was added. Stock integrations and supplier automation remain later decisions.
- Existing stock checks and notice-period checks remain safeguards; they do not turn a request into a confirmed booking.

## Email activation boundary

Brevo is supported through its transactional email API, using the existing account. `BREVO_API_KEY` is server-only. Resend remains supported for an already-configured deployment. Without a provider key, the order is saved and email delivery returns false; a staff-review notification outcome is recorded in the internal order history. Customer-facing messages do not expose configuration details.

The live Vercel project did not have either email-provider key at verification time. Adding the sender/reply addresses does not enable delivery by itself. Connect the Brevo API key and verify the sender before testing live delivery. Never place the key in frontend variables, source code or chat.

API reference: [Brevo transactional email](https://developers.brevo.com/reference/send-transac-email).

## Venue context follow-up

An existing partner venue retains its listing identity/photos instead of being treated as a newly uploaded venue. When staff have recorded a confirmed location, selecting the venue automatically uses that location for discovery. Otherwise postcode entry remains available. Private custom venue edits detach the listing context.

## Verification

All 18 automated tests passed, and the production build passed. Browser checks verified full Saved looks and My orders sections, refresh/deep-link preservation, account-menu navigation from checkout, inline add-to-basket without a tab change, full-catalogue navigation and 390px layout without overflow. The disposable customer and private render were removed after verification.

Notification tests replace the outbound transport: no real supplier/staff email is sent. They cover missing configuration, Brevo sender/reply formatting, recipient isolation, delivery/event dates and requests for alternatives. Customer browser verification uses a private seeded render, not paid generation or a submitted order. Staff privilege creation was not attempted after its earlier automatic-review rejection.
