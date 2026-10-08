# Pilot runbook — running the first real orders

A concrete checklist to take Styled from "built" to "a real couple booked a real
vendor." Pairs with [vendor-model.md](./vendor-model.md) (the why) — this is the how.

The software is ready to run a pilot today. The work below is **configuration and
outreach**, not building.

---

## What a pilot proves

1. **Demand**: couples upload a venue, generate a render they love, and try to order.
2. **Supply**: a real vendor confirms a booking with near-zero effort.
3. **Loop**: an order goes design → order → confirm → deposit → fulfil, end to end.

Keep it tiny: **2–3 real vendors, a handful of couples.** You're looking for signal,
not scale.

---

## Pre-flight — turn these on (one-time, in Vercel env)

| Env var | Why | Without it |
|---|---|---|
| `OPENAI_API_KEY` | Real AI renders (the hook) | Couples see an illustrative placeholder, not their venue |
| `RESEND_API_KEY` | Send supplier/couple emails | Emails are just logged — nobody's actually notified |
| `NOTIFY_FROM_EMAIL` | The "from" address | — (must be a **domain you've verified in Resend**, or emails only reach your own inbox) |
| `NEXT_PUBLIC_SITE_URL` | Correct links in emails + OG shares | Links/OG may point at the wrong host |

Also create a staff login for yourself if you haven't: `npm run staff:add -- you@email.com`.

**Check renders first.** Before anything else, open `/design`, upload a real venue
photo, and generate. If the output isn't convincing, that's the thing to fix — it's
the whole pitch. Everything else is plumbing that already works.

---

## Step 1 — Replace the demo catalogue with real vendors

> ⚠️ The 12 suppliers / 36 products currently live are **fictional seed data**
> (Bloomwell Florals, County Furniture Hire, etc.). Before a real pilot, **switch the
> demo suppliers off** so couples only ever see real, bookable vendors.

For each seed supplier you're not using: **Admin → Suppliers → open it → untick
"Active."** That hides all their products in one move (nothing is deleted — you can
turn them back on for demos).

Then add your real vendors:
- **If they applied** via `/vendors`: **Admin → Vendors → Accept → "Set up as supplier →"** (prefilled).
- **Otherwise**: **Admin → Suppliers → Add supplier.**
- Fill in **real** name, area, logo, and **commission %** (or leave blank for the 12% default).
- Open the supplier and **Add product** for each real piece: category, price, unit,
  quantity rule, **units-per-day capacity** (blank = made to order), lead time, styles.

Do this *for* the vendor from their website/Instagram — show them a finished page, not a form.

---

## Step 2 — Give each vendor a portal login

**Admin → Suppliers → [supplier] → Portal logins → Create login** with their email.
A new account shows a **one-time password** — pass it on securely; they sign in at
`/portal/login` and can confirm their own orders and manage their products.

(You can skip this at first and relay orders to them yourself — the self-serve portal
is a convenience, not a requirement.)

---

## Step 3 — Run a test order end to end (as a couple)

1. Open `/design` in a normal browser (a fresh guest), **add a wedding date**, pick real
   products, and place an order through "Reserve this design."
2. **Supplier notification** — the vendor gets an email (and sees it in `/portal`) with
   the items to confirm. *(If no email arrives, check `RESEND_API_KEY` + a verified
   sender; the order itself still works.)*
3. **Vendor confirms** their lines in `/portal` (or you set them in Admin → the order).
4. **You confirm the whole order** — Admin → Orders → open it → Confirm (needs every
   supplier line confirmed). The couple gets a **confirmation email** with your message.
5. **Deposit** — take the 25% deposit **manually** for now (invoice / bank transfer).
   There's no automated card payment yet; wire Stripe once the loop is proven.
6. **Coordinate delivery** with the vendor as you would normally.

That's the whole model, working, with only the deposit done by hand.

---

## Step 4 — What to watch (did it work?)

- **Demand**: of couples who open `/design`, how many generate a render? Add to basket?
  Reach "Reserve"? That funnel is the product-market-fit signal.
- **Render love**: do they react to the render? (Ask them.)
- **Vendor effort**: how fast/easily did the vendor confirm? Any friction?
- **Order integrity**: did availability, totals, and the deposit figure look right?

---

## Known gaps during the pilot (and the workaround)

| Gap | Workaround for the pilot |
|---|---|
| No automated payments | Invoice the deposit manually |
| Emails need a verified Resend domain | Verify your domain, or relay to vendors/couples by hand |
| No vendor payouts/statements yet | Reconcile and pay vendors manually (low volume) |
| Demo suppliers are fictional | Switch them **off** (Step 1) so only real vendors show |
| Delivery/returns are offline | Vendors deliver their own items, as they already do |

None of these block a pilot — they're the backlog that makes it *scale* (see
vendor-model.md §8).

---

## If something looks wrong

- **Renders are placeholders** → `OPENAI_API_KEY` isn't set in Vercel.
- **No emails** → `RESEND_API_KEY`/sender not set, or the domain isn't verified in Resend.
- **A real vendor's items aren't showing** → the supplier or the product is switched off,
  or the product has no capacity *and* you expected a stock limit.
- **A couple can't order a date** → capacity is used up or the date is blocked
  (Admin → Availability).

---

*Bottom line: to prove the concept you don't need to build more — you need real
renders confirmed, a couple of real vendors on, and one real order walked through the
loop above.*
