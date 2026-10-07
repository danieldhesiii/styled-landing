import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/server/env";
import { clientIpHash } from "@/lib/server/limits";
import { priceBasket, publicQuote } from "@/lib/server/quote";
import { itemsBookedTooLate, loadOrderView, validateOrderFields } from "@/lib/server/orders";
import { checkQuantities } from "@/lib/server/availability";
import { notifySuppliersOfOrder } from "@/lib/server/notify";

// POST /api/orders
//
// Places an order request: the couple's details plus a basket. The browser's
// totals are never trusted. We re-price everything from the live catalogue,
// check availability and notice periods, and write the order and all its lines
// in a single database transaction. Prices are snapshotted onto the lines, so
// later catalogue edits never change a placed order.
//
// Body: { basket: [{ itemId, quantity, seenUnitPricePence? }], coupleName, email,
//         phone?, weddingDate?, venueLabel?, styleId?, guestCount?, notes?,
//         idempotencyKey? }
//
// Sending the same idempotencyKey again (a double click, a retry after a dropped
// connection) returns the original order instead of creating another.
//
// No payment is taken here yet: the order starts as "requested" and a stylist
// confirms each supplier for the date.

function fail(status: number, error: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: false, error, ...extra }, { status });
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { user, supabase } = auth;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail(400, "Invalid request body.");
  }
  if (!body || typeof body !== "object") return fail(400, "Invalid request body.");

  const parsed = validateOrderFields(body);
  if (!parsed.ok) return fail(parsed.status, parsed.error);
  const f = parsed.fields;

  const admin = createAdminClient();

  // A retry or double-click of an order that already went through: hand back that
  // order, whatever else has changed since (limits, stock, prices). Checked again
  // before any "no" is returned below, because the original request may have been
  // written a moment after we first looked.
  const replayExisting = async () => {
    if (!f.idempotencyKey) return null;
    const { data: existing } = await admin
      .from("orders")
      .select("id")
      .eq("owner_id", user.id)
      .eq("idempotency_key", f.idempotencyKey)
      .maybeSingle();
    if (!existing) return null;
    const order = await loadOrderView(supabase, existing.id as string);
    return NextResponse.json({ ok: true, repeated: true, order }, { status: 200 });
  };
  {
    const again = await replayExisting();
    if (again) return again;
  }

  // Each order creates work for a stylist, so cap them per guest and per network.
  const ipHash = clientIpHash(req);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: mine } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id)
    .gte("created_at", since);
  if ((mine ?? 0) >= env.maxOrdersPerDay) {
    const again = await replayExisting();
    if (again) return again;
    return fail(429, "You've placed several orders today. Please wait, or contact us if you need more.");
  }
  const { count: network } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("client_ip_hash", ipHash)
    .gte("created_at", since);
  if ((network ?? 0) >= env.maxOrdersPerIpPerDay) {
    const again = await replayExisting();
    if (again) return again;
    return fail(429, "There have been a lot of orders from your network today. Please try again tomorrow.");
  }

  // Price the basket from the live catalogue.
  let priced;
  try {
    priced = await priceBasket(body.basket);
  } catch (err) {
    console.error("[orders] pricing failed:", err);
    return fail(500, "Couldn't price your order. Please try again.");
  }
  if (!priced.ok) return fail(priced.status, priced.error, priced.extra);

  const tooSoon = itemsBookedTooLate(f.weddingDate, [...priced.items.values()].filter((i) => priced.lines.some((l) => l.itemId === i.id)));
  if (tooSoon.length > 0) {
    return fail(422, "Some items need more notice than you have before your wedding date.", { tooSoon });
  }

  // Is everything actually free on their wedding date? (The database re-checks this
  // under a lock when the order is written, so this is for a clear early answer.)
  const soldOutView = (rows: { itemId: string; requested?: number; availableUnits?: number | null }[]) =>
    rows.map((r) => ({
      itemId: r.itemId,
      name: priced.items.get(r.itemId)?.name ?? r.itemId,
      requested: r.requested ?? priced.lines.find((l) => l.itemId === r.itemId)?.quantity ?? null,
      availableUnits: r.availableUnits ?? 0,
    }));
  if (f.weddingDate) {
    try {
      const checks = await checkQuantities(
        admin,
        priced.quote.lines.map((l) => ({ itemId: l.item.id, quantity: l.quantity })),
        f.weddingDate
      );
      const short = [...checks].filter(([, a]) => a.status === "unavailable");
      if (short.length > 0) {
        const again = await replayExisting();
        if (again) return again;
        return fail(409, "Some items aren't available on your wedding date.", {
          soldOut: soldOutView(short.map(([itemId, a]) => ({ itemId, availableUnits: a.availableUnits }))),
        });
      }
    } catch (err) {
      console.error("[orders] availability check failed:", err);
      return fail(500, "Couldn't check availability. Please try again.");
    }
  }

  // Link the order to the couple's latest design, so a stylist can see the renders.
  const { data: brief } = await supabase
    .from("briefs")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { quote } = priced;
  const { data: orderId, error } = await admin.rpc("create_order", {
    p_owner: user.id,
    p_order: {
      brief_id: brief?.id ?? null,
      couple_name: f.coupleName,
      email: f.email,
      phone: f.phone,
      wedding_date: f.weddingDate,
      venue_label: f.venueLabel,
      style_id: f.styleId,
      guest_count: f.guestCount,
      subtotal_pence: quote.subtotalPence,
      commission_pence: quote.commissionPence,
      deposit_pence: quote.depositPence,
      notes: f.notes,
      idempotency_key: f.idempotencyKey,
      client_ip_hash: ipHash,
    },
    p_lines: quote.lines.map((l) => ({
      product_id: l.item.id,
      supplier_id: priced.items.get(l.item.id)!.supplierId,
      product_name: l.item.name,
      supplier_name: l.item.supplier,
      unit: l.item.unit,
      unit_price_pence: l.unitPricePence,
      quantity: l.quantity,
      line_total_pence: l.lineTotalPence,
    })),
  });

  if (error?.message === "unavailable") {
    // Someone else took the last units between our check and the write. (Or, if the
    // couple double-clicked, it was their own first request that took them.)
    const again = await replayExisting();
    if (again) return again;
    let rows: { itemId: string; requested: number; available: number }[] = [];
    try {
      rows = JSON.parse(error.details ?? "[]");
    } catch {
      // fall through with no detail
    }
    return fail(409, "Some items aren't available on your wedding date.", {
      soldOut: soldOutView(rows.map((r) => ({ itemId: r.itemId, requested: r.requested, availableUnits: r.available }))),
    });
  }

  if (error || !orderId) {
    // Two identical requests racing: the database's unique key let one through.
    if (error?.code === "23505") {
      const again = await replayExisting();
      if (again) return again;
    }
    console.error("[orders] create_order failed:", error);
    return fail(500, "Couldn't place your order. Please try again.");
  }

  // Tell each supplier they have items to confirm. Best effort and only on a
  // genuinely new order (replays return earlier), so a couple is never emailed
  // about, nor a supplier double-notified for, the same order twice.
  await notifySuppliersOfOrder(admin, orderId as string);

  const order = await loadOrderView(supabase, orderId as string);
  return NextResponse.json({ ok: true, repeated: false, order, quote: publicQuote(quote) }, { status: 201 });
}

// GET /api/orders: the signed-in guest's own orders, newest first (for the
// "your orders" page). Row level security means only theirs are visible.
export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { user, supabase } = auth;

  // Filtered explicitly: staff accounts can read every order through row level
  // security, and "your orders" must still mean the signed-in person's own.
  const { data: rows } = await supabase
    .from("orders")
    .select("id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);
  const orders = [];
  for (const r of rows ?? []) {
    const view = await loadOrderView(supabase, r.id as string);
    if (view) orders.push(view);
  }
  return NextResponse.json({ ok: true, orders });
}
