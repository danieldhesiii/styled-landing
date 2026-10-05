import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadCatalogue } from "@/lib/server/catalogue";
import { loadAvailability } from "@/lib/server/availability";
import { classifyAvailability, isValidDay, todayUtc } from "@/lib/availability";
import { suggestedQty } from "@/lib/quote";

export const dynamic = "force-dynamic";

// GET /api/availability?date=YYYY-MM-DD&guests=80
//
// What's free on a wedding date, for every product in the shop, measured against
// the quantity a couple of that size would normally order (per guest, per table
// and so on). Used for the badges in the shop. Exact stock numbers are only
// revealed when stock is running low.
export async function GET(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const date = url.searchParams.get("date");
  const guests = Math.min(1000, Math.max(1, Math.round(Number(url.searchParams.get("guests")) || 80)));
  if (!isValidDay(date)) return NextResponse.json({ ok: false, error: "Please send a date as YYYY-MM-DD." }, { status: 400 });
  if (date < todayUtc()) return NextResponse.json({ ok: false, error: "That date is in the past." }, { status: 400 });

  try {
    const catalogue = await loadCatalogue();
    const raw = await loadAvailability(createAdminClient(), catalogue.map((i) => i.id), date);
    const items: Record<string, ReturnType<typeof classifyAvailability>> = {};
    for (const item of catalogue) {
      const a = raw.get(item.id);
      if (a) items[item.id] = classifyAvailability(a, suggestedQty(item, guests));
    }
    return NextResponse.json({ ok: true, date, guests, items });
  } catch (err) {
    console.error("[availability]", err);
    return NextResponse.json({ ok: false, error: "Couldn't check availability." }, { status: 500 });
  }
}
