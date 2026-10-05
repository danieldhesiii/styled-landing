import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateBasket } from "@/lib/server/quote";
import { checkQuantities } from "@/lib/server/availability";
import { isValidDay, todayUtc } from "@/lib/availability";

export const dynamic = "force-dynamic";

// POST /api/availability/check  { date, basket: [{ itemId, quantity }] }
//
// Is everything in this basket free on this date, at these quantities? Used by
// checkout before an order is placed. The order itself re-checks under a lock.
export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  let body: { date?: unknown; basket?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }
  if (!isValidDay(body.date)) return NextResponse.json({ ok: false, error: "Please send a date as YYYY-MM-DD." }, { status: 400 });
  if (body.date < todayUtc()) return NextResponse.json({ ok: false, error: "That date is in the past." }, { status: 400 });
  const basket = validateBasket(body.basket);
  if (!basket.ok) return NextResponse.json({ ok: false, error: basket.error }, { status: basket.status });

  try {
    const checks = await checkQuantities(createAdminClient(), basket.lines, body.date);
    return NextResponse.json({
      ok: true,
      date: body.date,
      lines: Object.fromEntries(checks),
      allAvailable: [...checks.values()].every((a) => a.status !== "unavailable"),
    });
  } catch (err) {
    console.error("[availability/check]", err);
    return NextResponse.json({ ok: false, error: "Couldn't check availability." }, { status: 500 });
  }
}
