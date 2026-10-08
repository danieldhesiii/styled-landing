# Vendor stock & availability — the practical reality

How a vendor actually gets on the page, and how their stock stays accurate and
bookable for the right dates. This is the practical companion to
[vendor-model.md](./vendor-model.md) (the business model) — read this when the
question is *"but how does the stock bit really work day to day?"*

---

## The one thing to get straight: two separate jobs

| | **Catalogue** | **Availability** |
|---|---|---|
| What it is | The items a vendor offers: name, photo, price, unit | Whether they can supply *N of an item on a given date* |
| How often | **Once** (set up at onboarding, edited rarely) | **Ongoing** (as dates get booked) |
| Effort | A one-time data entry we do *for* them | Mostly automatic; a little upkeep for dates booked elsewhere |

Most people conflate these. "Getting vendors on with their stock" is really: do the
catalogue once, then keep availability honest. The second is the hard part, so most
of this doc is about it.

---

## How availability actually works (already built)

We do **not** track real-time warehouse inventory. We use a simpler model that fits
how wedding hire actually works, and it's already live in the app:

- **Capacity** — one number per product: *how many can you supply on any one day?*
  (e.g. "100 gold chairs", "I can do 3 arches a weekend"). This is a number a vendor
  knows off the top of their head. Blank = **made to order** (not stock-limited).
- **Reserved** — the app **automatically** subtracts what live orders have already
  taken for a given date. Vendors never decrement stock by hand.
- **Available on a date** = capacity − reserved, after any blocks. The shop and
  checkout read exactly this, so Styled can never oversell a vendor for a date.
- **The confirm step** — even after all that, the vendor confirms each order. Nothing
  is promised to a couple until they say yes. This is the safety net.

So "checking stock" = *our own capacity number minus our own bookings* — not a live
query into the vendor's systems.

---

## Getting them on the page (the practical onboarding)

**We do the catalogue for them.** The pitch is "here's your page, already built" — not
"fill in this form." In practice:

1. Pull their items, photos and prices from their **website / Instagram**.
2. Enter each product in **Admin → Suppliers → Add product**: category, price, unit,
   quantity rule, and a **capacity** (their rough daily max), lead time, styles.
3. Set their **logo** and **commission %**; switch them **active**.
4. That's ~5–10 minutes per vendor. They just **review and approve**.

What we ask the vendor for is tiny: a price list (or confirm ours), permission to use
their photos, and a rough capacity per item. No inventory system, no SKUs, no software.

---

## Keeping stock updated — what actually has to happen

Here's the reassuring part and the honest part.

**Reassuring:** a vendor does **not** update stock per booking. When a couple orders,
the app reserves those units for that date automatically. When an order is declined or
cancelled, they free up automatically. The vendor does nothing.

**The one real upkeep job:** reflecting bookings they take **outside Styled**. A vendor
is also selling via Instagram, their own site, and word of mouth. If they book a
Saturday elsewhere, Styled doesn't know — unless they tell us. Keeping that in sync is
the whole ballgame, and there are four ways to handle it (lightest first):

1. **The confirm step (built).** Even if our numbers are stale, the vendor confirms each
   order, so a clash is caught before the couple is promised. Zero upkeep — but it means
   a bit of back-and-forth per order.
2. **Capacity buffers.** Set capacity *below* their true max (own 100 chairs → list 70),
   leaving headroom for off-Styled bookings. One-time, blunt, but effective.
3. **Self-block dates** — the vendor marks "I'm already booked / away" on specific dates
   so the shop won't offer them. Precise, low effort, no software needed.
4. **Calendar sync (iCal).** The vendor pastes a link from the calendar they already use
   (Google Calendar, Booqable, Current RMS). Their existing bookings block Styled dates
   **automatically** — the true "set and forget." Best for vendors who already keep a
   calendar.

The base capacity itself only changes when they actually buy more kit or retire some —
rare, and a 10-second edit in the portal.

---

## The real risk, named: cross-channel double-booking

The genuine failure mode isn't our software — it's a vendor booking the same Saturday on
Instagram and on Styled and not reconciling. Our defences, in order:

- **Confirm-on-order** catches it every time before the couple is committed (built).
- **Buffers** make it unlikely in the first place (built — just set capacity low).
- **Self-block / calendar sync** removes the clash at the source (the next things to
  build — see below).

Framed for the vendor, this is a *feature*: "you approve every booking, so you're never
on the hook for a date you can't do."

---

## What's built vs. the gap

**Built today:**
- Capacity per product; made-to-order items. ✅
- Automatic reservation from live orders; never oversells a date. ✅
- Date **blocks and per-date unit overrides** — for a product or a whole supplier —
  managed by staff in **Admin → Availability**. ✅
- The confirm step (staff and the vendor portal). ✅
- Vendor portal: vendors set their own **price, capacity, and on/off**. ✅

- Vendors can **self-block dates** in the portal (`/portal/availability`) — mark days
  they're booked elsewhere or away so couples can't request them then. ✅
- Vendors can **sync a calendar** (iCal link from Google Calendar / Booqable /
  Current RMS). Their busy days block automatically, re-synced daily (Vercel Cron) and
  on demand. The "set and forget" option. ✅ *(new)*

**The gap (what's not there yet):**
- Vendor self-service is **supplier-level** (block/sync whole days). Per-**product**
  limits on a specific date are still a staff job in Admin → Availability.
- iCal **recurring events** (RRULE) aren't expanded — only their first occurrence is
  blocked. One-off bookings (the common case) sync fully; the confirm step is the
  backstop.

**Config:** auto-sync runs daily if `CRON_SECRET` is set in Vercel (see `.env.example`);
without it, vendors still sync on demand from the portal.

---

## A day in the life — how one Saturday stays accurate

1. We onboard **Willow & Co**: "Moongate Arch", £320, capacity **2** (they own two).
2. A couple books **1** arch for **15 Aug** on Styled → available for that date drops to
   **1**, automatically.
3. Willow books their **other** arch for 15 Aug via Instagram. They either:
   - **block/adjust** 15 Aug in the portal (→ available becomes 0), or
   - do nothing, and simply **decline** if a second Styled request comes in.
4. Another couple tries to book an arch for 15 Aug:
   - if Willow updated availability → the shop shows it unavailable (no clash), or
   - if not → the order is taken as a *request*, and Willow **declines** it — the couple
     is told, nothing was promised.
5. For 16 Aug (nothing booked), both arches remain available as normal.

With a **capacity buffer** (list 1 instead of 2) or **iCal sync**, step 3 takes care of
itself and step 4's decline never happens.

---

## Recommended rollout

1. **Launch now:** capacity + a sensible **buffer** + **confirm-on-order**. This works
   today with *zero* ongoing vendor effort beyond tapping "confirm."
2. **Soon:** vendor **self-block dates** in the portal — for vendors who want precision
   without the confirm back-and-forth.
3. **Then:** **iCal sync** for vendors who already run a calendar or rental software —
   the lowest-effort, most accurate option, and a strong selling point for bigger vendors.

You do **not** need real-time inventory integration to launch. You need a capacity
number, a buffer, and the confirm step — all of which exist. The rest is polish that
reduces friction as you scale.
