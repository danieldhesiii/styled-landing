# Staff area and availability

## Getting staff access

There is no sign-up on the website. A developer creates staff accounts:

```
npm run staff:add -- someone@example.com            # creates the account if needed, prints a password ONCE
npm run staff:add -- someone@example.com --reset    # sets a new password
npm run staff:remove -- someone@example.com         # removes staff access (keeps the account)
```

Staff sign in at `/admin/login`. Access is checked on every page and every
`/api/admin/*` request: you must be a real signed-in user listed in the `staff`
table. Guest (anonymous) sessions can never be staff. Removing someone takes
effect on their next request.

## What staff can do

**Orders (`/admin`)** is an inbox of every order, oldest-waiting first, with
search (name, email or reference `STY-XXXXXXXX`) and tabs by status.

**An order (`/admin/orders/[id]`)**
- See the couple, their date and venue, the room they designed, and each
  supplier's items with a live availability check for the wedding date.
- Record what each supplier said, per item or per supplier: **confirm**,
  **decline** (with an internal reason) or **reset**.
- **Confirm the order** once every supplier has confirmed. Confirming warns if
  stock has been reduced since the order came in; staff can confirm anyway.
- **Decline** (a message to the couple saying why is required) or **cancel**.
- **Message to the couple** appears on their order page (it is not an email).
  **Internal notes** are staff-only.
- Every change is recorded in the order's history with who and when.

Order states: `requested` -> `confirmed` | `declined` | `cancelled`;
`confirmed` -> `cancelled`. Declined and cancelled are final. `deposit_paid` is
reserved for the payment flow and can't be set by hand. Two staff acting at the
same moment can't overwrite each other: the second is told the order changed.

**Availability (`/admin/availability`)**: per product, set capacity, show/hide
it in the shop, block days or reduce units on a day, block a whole supplier for a
day, and see what's booked on each date. Blocking a day that already has orders
lists them so staff can deal with them (existing orders are not changed
automatically).

## How availability works

One database function, `product_availability(products, day)`, is the only
definition. The shop, checkout, the order itself and the staff screens all use it.

- **Capacity** = units a supplier can provide on one day (chairs in stock, arches
  owned). Empty = not limited by stock (made to order).
- A day is **blocked** (0 available) if the product or its supplier is blocked.
  A day can also carry a reduced unit count.
- **Reserved** = units on other orders for that wedding date that are requested,
  confirmed or paid, unless the supplier declined that item. Declined or cancelled
  orders release their units immediately.
- **Available** = capacity for the day minus reserved.

Couples see "Available", "Limited" (taking it would leave less than the same
amount again), "Not available", or "Made to order" once they pick a wedding
date. Exact stock is only shown when it's running low. Orders re-check under a
database lock, so two couples cannot both take the last unit.

An order without a wedding date skips the check (the stylist asks for the date).

> **The starting capacities are placeholders.** They were derived from the old
> stock labels (e.g. 600 chairs, 2 arches). Replace them with each supplier's real
> numbers in `/admin/availability`. Re-running `npm run seed:catalogue` leaves
> capacity and show/hide untouched on existing products.

## Order tracking for couples (`/order`)

Shows a couple's orders (same browser) or looks one up by reference + email
(rate limited, and all wrong guesses get the same answer). It shows the status,
each supplier's confirmation, and any message from their stylist.

## Not built yet

- Emails to couples and to staff (status changes are only visible on `/order`).
- Payments (the deposit button is still a placeholder).
- Editing an order's items after it's placed, or reopening a declined order.
- Live supplier stock feeds (capacity is entered by hand).
- Two-factor sign-in for staff, and password reset (use `--reset`).
