# The vendor model — how Styled actually works with suppliers

A plain-English guide to the business model, how availability and fulfilment work,
how vendors "connect" to us (the honest answer), and how to sell it to them. Written
to help us *develop* the model, not just describe it.

---

## 1. The one-paragraph version

Styled is a **commission marketplace**, not a shop that holds stock. Couples design
their wedding in the visualiser, then place **one order** made of items from several
suppliers. We **split that order per supplier**, each supplier **confirms** they can
do it for the date, the couple pays a **deposit** to lock it in, and we **coordinate
delivery**. We earn a **commission** on what sells. The supplier puts in **almost
nothing** — no listing fees, no software to install, no upfront cost — and only ever
deals with a booking that's already a real, designed, deposit-backed order.

The single most important idea: **we do not need to plug into the vendor's stock
system for this to work.** Physical hire stock on a specific Saturday is contended,
so the whole industry runs on *"request → confirm"*, not *"click → instantly
fulfilled"*. We've already built exactly that.

---

## 2. Why "the customer just orders and it's fulfilled" isn't how hire works

With Amazon, stock is abundant and fungible — any unit ships. With **wedding hire**,
the same 40 gold chairs can only be in one place on one Saturday, and the supplier
might be holding them for another couple who hasn't paid yet. So every serious event
marketplace works as **reserve-then-confirm**, with money released/secured around the
event, not instant checkout. Our research backs this up: event-rental marketplaces
have the customer request, the vendor prepare, and payment release **after** the
event, minus commission. ([Ablysoft][1], [Journey][2])

That's why our order flow is **requested → confirmed → deposit paid**, and why a
supplier confirming is a real step. It's not a limitation — it's the correct model.

---

## 3. The business model (who does what, where the money goes)

| | **Styled does** | **The vendor does** |
|---|---|---|
| Listing | Build the catalogue listing, photos, styling | Supply photos/prices once (or we do it from their site) |
| Demand | Visualiser, marketing, the whole couple experience | Nothing |
| Customer | All couple comms, one point of contact | Nothing — never chases the couple |
| Booking | Take the order, split per supplier, collect deposit | **Confirm** they can do the date |
| Fulfilment | Coordinate delivery windows to the venue | Deliver/set up their items (as they already do) |
| Money | Collect, take commission, pay the vendor | Get paid their share, no fees |

**Commission, not subscription.** We take a % of each booking. Our current default is
**12%**, which sits inside the normal band — event-rental marketplaces run **5–15%**,
and wedding vendor commissions are **typically 10–15%** (some go far higher).
([Ablysoft][1], [LaLista][3]) This matters for the pitch: we're **at or below**
market, and unlike The Knot (~$125–1,000+/mo) or Thumbtack (pay-per-lead ~$10–130 an
enquiry), the vendor pays **nothing to list and nothing per lead** — only a share of
money they actually earn. ([Sharetribe][4])

**Deposit secures the date.** The couple pays ~25% deposit once suppliers confirm;
the balance is due later. The deposit is what makes a "confirmed" order real and
protects the supplier's held date.

---

## 4. How we check availability (without touching their systems)

We already run a **capacity model** in the database, and it's enough to launch:

- Each product has a **capacity** = how many units the supplier can do on any one day
  (e.g. 120 chairs). Blank = **made to order / not stock-limited**.
- For a given wedding date, **available = capacity − what live orders already
  reserved**, after any **blocked dates** (holidays, maintenance, a date they're out
  on another job).
- The couple only ever gets a clean yes/no for their date; two couples can't both take
  the last units because the order transaction locks and re-checks.

So "checking stock" = **our own capacity number minus our own bookings**, not a live
query into the vendor's warehouse. The vendor's only job is to **keep that number
roughly right** and **confirm the occasional order**. This is the deliberately
low-friction path marketplaces use to onboard suppliers fast. ([Getcarro][5])

The vendor's final **confirm** is the safety net: even if our number is slightly off,
nothing is promised to a couple until the supplier says yes.

---

## 5. How a vendor "links" to us — four tiers, start at the bottom

The honest answer to *"how do vendors link to our page?"*: **most of them don't link a
system at all.** They connect to us the way they already work — by replying to a
booking. We offer increasing levels of automation, and almost everyone starts at Tier
0–1.

| Tier | What the vendor connects | Who it's for | Effort for them | Status |
|---|---|---|---|---|
| **0 — We run it for them** | Nothing. We hold their catalogue + a capacity number. They just **confirm each order** (portal or, later, a one-tap email/text). | The spreadsheet-and-diary supplier (most small UK wedding vendors) | ~0 | ✅ built (portal) |
| **1 — Self-serve portal** | They log into **/portal**, set prices, set capacity, block dates, confirm orders. | Vendors who want control | A few min/week | ✅ built |
| **2 — Calendar feed (iCal)** | They paste an **iCal link** from Google Calendar / Booqable / Current RMS; their blocked dates sync to us automatically. | Vendors already using a calendar or rental software | One-time paste | 🔜 to build |
| **3 — Full API sync** | We read live availability from their **rental software's API** (Booqable, Current RMS both have REST APIs + iCal). | Bigger vendors with real systems, at scale | One-time setup | 🔮 later |

Key research point: the rental tools better-equipped vendors use — **Booqable** (REST
API v4 with an availabilities endpoint + iCal export + Zapier) and **Current RMS**
(API + iCal links) — **already expose availability we could read**. ([Booqable
API][6], [Current RMS API][7]) So Tier 2/3 is realistic *when we need it* — but we do
**not** need it to launch, and we should not make it a condition of joining.

**Design rule:** never block onboarding on integration. A vendor can be live with Tier
0 in minutes; they graduate to 2/3 only if it helps them.

---

## 6. The end-to-end order flow (what actually happens)

1. **Couple designs & orders** — one basket, several suppliers, priced from our live
   catalogue.
2. **We split the order per supplier** — standard marketplace behaviour: each supplier
   gets only their lines. ([cMinds][8])
3. **We notify each supplier** — today they see it in **/portal**; next we add an
   **email/SMS with a one-tap confirm/decline** (the industry-standard "email + portal
   link" pattern). ([cMinds][8], [Dropday][9])
4. **Supplier confirms** their lines (or declines — then those units free up).
5. **Order becomes "confirmed"** once every supplier is in; the couple pays the
   **deposit** to secure it.
6. **We coordinate delivery** windows to the venue; the couple deals only with us.
7. **After the wedding**, items are returned as normal and **we pay the supplier their
   share** (we keep commission). Escrow-style "release after the event" is the norm.
   ([Ablysoft][1])

Steps 1–5 are **built**. Steps 3 (auto-notify) and 7 (payouts) are the main gaps — see
§8.

---

## 7. Why the vendor "doesn't do anything and doesn't lose out"

This is the sales spine. Every claim here is something the model actually delivers:

- **No cost to join.** No listing fee, no subscription, no per-lead charge. We only
  earn when they do. (Contrast The Knot/Thumbtack, who charge regardless of results.)
  ([Sharetribe][4])
- **No new software.** They don't have to install, learn, or migrate anything. Tier 0
  is "we built your listing; just confirm bookings."
- **No risk.** They confirm each order, so they're never committed to a date they
  can't do. Nothing is sold out from under them.
- **No customer admin.** We handle the couple end-to-end; the vendor never markets,
  quotes, or chases.
- **Incremental revenue.** These are bookings they wouldn't otherwise get, from couples
  who've already *designed their wedding around the vendor's pieces* — unusually warm,
  high-intent demand.
- **A free shop window.** They get a public profile page (`/suppliers/<id>`) showing
  their work to every couple on the platform — useful even outside a booking.

The one honest trade: **commission on what sells.** Framed correctly that's not a loss,
it's "pay only for results, at or below market rate."

---

## 8. What we still need to build for this to run at scale

In rough priority:

1. **Order notifications** — ✅ *built (email)*: each supplier is emailed automatically
   when a new order includes their items, with the lines to confirm and a portal link
   (sent to their contact email + any portal logins; via Resend, logged if no provider
   is set). Still to add: SMS, and one-tap confirm straight from the email.
2. **Payouts & statements** — track what each supplier is owed per order, commission
   kept, and pay out (Stripe Connect is the usual tool). Needed before real money
   flows.
3. **Deposit/balance payments** — wire up Stripe for the couple's deposit and balance
   (the schema already has a `stripe_payment_intent_id` slot).
4. **iCal import (Tier 2)** — let a vendor paste a calendar link so blocked dates sync.
5. **Vendor availability controls in the portal** — block dates / set per-date capacity
   themselves (staff can already do this; expose it to vendors).
6. **API integrations (Tier 3)** — Booqable/Current RMS, only once a vendor needs it.

---

## 9. How to actually get the first vendors on board (playbook)

- **Target the right first 10–15.** Small/medium UK wedding hire & décor businesses in
  our launch area (London/Essex/Herts) who rely on Instagram + word of mouth and have
  *no* slick booking site. They gain the most and resist the least.
- **Do the work for them.** Build their listing and profile from their website/Instagram
  *before* the pitch, so you show them a finished page, not a form. (This is literally
  what the admin onboarding + public profile were built for.)
- **Lead with the page, not the platform.** "Here's your page on Styled, couples are
  designing weddings around your pieces — want the bookings? It's free to be on, we
  take [12]% only when you get paid."
- **Make "yes" one click.** They confirm a test order in the portal in 30 seconds. No
  onboarding call needed.
- **Found-member framing.** Offer the first cohort a lower commission or "founding
  supplier" badge to seed supply before demand is proven (classic two-sided
  cold-start).
- **Then let the profile sell itself.** Once a few are live, "your competitor is on
  Styled" does the recruiting.

---

## 10. Open decisions for us (the things only you can decide)

1. **Commission rate & tiers.** 12% default is market-sane; do we discount founders, or
   vary by category? (Per-supplier commission is already supported.)
2. **Who carries stock risk?** Our model = vendor confirms, so **vendor** does. Keep it
   that way (lowest risk for us, and honest for them).
3. **Delivery & logistics.** Do suppliers deliver their own items (simplest, assumed
   here), or do we aggregate delivery? This is the biggest operational question beyond
   software.
4. **Exclusivity / pricing parity.** Do we require their Styled price to match their
   own? Affects trust on both sides.
5. **Payments.** Deposit now / balance later is designed in — confirm the split and
   when the supplier gets paid (before vs after the event).
6. **Quality bar.** Who curates? The vendor application → review flow is built; decide
   the acceptance criteria.

---

## 11. So, do *you* have to develop all this?

Not to get started. What's **already built**: the catalogue, the capacity/availability
engine, the couple ordering flow, the per-supplier order split, the vendor review &
onboarding, public supplier profiles, and the **self-serve portal** where suppliers
confirm orders and manage products. That's enough to **run a pilot with a handful of
hand-held vendors today** (Tier 0/1), taking orders and confirming them manually.

To go from pilot to real money and scale, the build list is **§8** — notifications,
payouts, and payments first; calendar/API integrations only as vendors ask. None of it
blocks getting the first vendors on; it makes the model *run itself* as volume grows.

---

### Sources
[1]: https://blog.ablysoft.com/start-a-party-rental-marketplace/ "Guide to Start a Party Rental Marketplace — Ablysoft"
[2]: https://www.journeyh.io/blog/how-to-build-a-party-rental-marketplace "How to Build a Party Rental Marketplace — Journey"
[3]: https://www.lalista.com/articles/wedding-commission-explained "What is wedding commission and how does it work? — LaLista"
[4]: https://www.sharetribe.com/create/how-to-build-marketplace-for-wedding-services/ "How to build a wedding services marketplace — Sharetribe"
[5]: https://getcarro.com/blog/how-to-manage-inventory-on-a-marketplace "How to Manage Inventory on a Marketplace — Carro"
[6]: https://developers.booqable.com/ "Booqable API v4 documentation"
[7]: https://api.current-rms.com/doc "Current RMS API documentation"
[8]: https://www.cminds.com/magento-extensions/marketplace-dropship-notification-module-magento-2/ "Marketplace Dropship Notification Module — cMinds"
[9]: https://get.dropday.io/order-automation/dropship-orders-by-email "Automated Dropship Orders by Email — Dropday"

- [Ablysoft — Start a Party Rental Marketplace](https://blog.ablysoft.com/start-a-party-rental-marketplace/)
- [Journey — Build a Party Rental Marketplace](https://www.journeyh.io/blog/how-to-build-a-party-rental-marketplace)
- [LaLista — Wedding commission explained](https://www.lalista.com/articles/wedding-commission-explained)
- [Sharetribe — Wedding services marketplace guide](https://www.sharetribe.com/create/how-to-build-marketplace-for-wedding-services/)
- [Carro — Managing inventory on a marketplace](https://getcarro.com/blog/how-to-manage-inventory-on-a-marketplace)
- [Booqable API v4 docs](https://developers.booqable.com/)
- [Current RMS API docs](https://api.current-rms.com/doc)
- [cMinds — Marketplace dropship notifications](https://www.cminds.com/magento-extensions/marketplace-dropship-notification-module-magento-2/)
- [Dropday — Dropship orders by email](https://get.dropday.io/order-automation/dropship-orders-by-email)
