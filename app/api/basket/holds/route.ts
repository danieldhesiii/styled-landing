import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateBasket } from "@/lib/server/quote";
import { checkQuantities, setBasketHolds, HOLD_TTL_SECONDS } from "@/lib/server/availability";
import { isValidDay, todayUtc } from "@/lib/availability";

export const dynamic = "force-dynamic";

// PUT /api/basket/holds  { date, basket: [{ itemId, quantity }] }
//
// Holds what's in the couple's basket for their wedding date, so nobody else can
// take it while it's there, and says whether each line is available (same shape
// as /api/availability/check). The studio calls this whenever the basket or date
// changes and every minute while it's open; each call replaces the previous
// holds, so removing an item or changing the date releases it at once, and a
// basket that stops calling lets its holds lapse (see set_basket_holds).
//
// A line that doesn't fit (sold out, or in someone else's basket) comes back
// "unavailable"; it holds whatever part of it is free. No date, a past date or an
// empty basket just releases everything.
export async function PUT(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { user } = auth;
  // Holds take stock away from other couples, so only real accounts can make them
  // (anonymous sessions are free to create).
  if (user.is_anonymous) {
    return NextResponse.json({ ok: false, error: "Sign in to hold items in your basket." }, { status: 401 });
  }

  let body: { date?: unknown; basket?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: allowed } = await admin.rpc("hit_rate_limit", {
    p_key: `basket-holds:${user.id}`,
    p_limit: 300,
    p_window_seconds: 600,
  });
  if (allowed === false) {
    return NextResponse.json({ ok: false, error: "Too many updates. Please wait a moment." }, { status: 429 });
  }

  const empty = !Array.isArray(body.basket) || body.basket.length === 0;
  const day = isValidDay(body.date) && body.date >= todayUtc() ? body.date : null;
  if (empty || !day) {
    try {
      await setBasketHolds(admin, user.id, null, []);
    } catch (err) {
      console.error("[basket/holds] release failed:", err);
      return NextResponse.json({ ok: false, error: "Couldn't update your basket." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, date: day, lines: {}, allAvailable: true, heldUntil: null });
  }

  const basket = validateBasket(body.basket);
  if (!basket.ok) return NextResponse.json({ ok: false, error: basket.error }, { status: basket.status });

  try {
    await setBasketHolds(admin, user.id, day, basket.lines);
    const checks = await checkQuantities(admin, basket.lines, day, { ownerId: user.id });
    return NextResponse.json({
      ok: true,
      date: day,
      lines: Object.fromEntries(checks),
      allAvailable: [...checks.values()].every((a) => a.status !== "unavailable"),
      heldUntil: new Date(Date.now() + HOLD_TTL_SECONDS * 1000).toISOString(),
    });
  } catch (err) {
    console.error("[basket/holds]", err);
    return NextResponse.json({ ok: false, error: "Couldn't check availability." }, { status: 500 });
  }
}

