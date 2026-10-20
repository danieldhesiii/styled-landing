import { NextResponse } from "next/server";
import { requireVendor } from "@/lib/server/vendor";
import { loadAvailability, type RawAvailability } from "@/lib/server/availability";
import { usableDate } from "@/lib/server/look";

export const dynamic = "force-dynamic";

// GET /api/vendor/products?date=YYYY-MM-DD: this supplier's own catalogue, with what
// is free on that day (default: today). Availability comes from the same database
// function the shop and the studio use, so what the vendor sees is what couples get.
export async function GET(req: Request) {
  const auth = await requireVendor(req);
  if (!auth.ok) return auth.response;
  const { admin, supplierId } = auth;

  const url = new URL(req.url);
  const day = usableDate(url.searchParams.get("date")) ?? new Date().toISOString().slice(0, 10);

  const { data, error } = await admin
    .from("products")
    .select("id, name, category, unit, unit_price_pence, qty_rule, capacity, lead_time_days, active")
    .eq("supplier_id", supplierId)
    .order("category")
    .order("sort_order");
  if (error) {
    console.error("[vendor/products] load failed:", error);
    return NextResponse.json({ ok: false, error: "Couldn't load your products." }, { status: 500 });
  }

  let avail = new Map<string, RawAvailability>();
  try {
    avail = await loadAvailability(admin, (data ?? []).map((p) => p.id), day);
  } catch (e) {
    console.error("[vendor/products] availability failed:", e);
  }

  return NextResponse.json({
    ok: true,
    date: day,
    products: (data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      unit: p.unit,
      unitPricePence: p.unit_price_pence,
      qtyRule: p.qty_rule,
      capacity: p.capacity,
      leadTimeDays: p.lead_time_days,
      active: p.active,
      day: avail.has(p.id)
        ? {
            // null = no stock limit (made to order); 0 effective = blocked that day
            effectiveCapacity: avail.get(p.id)!.effectiveCapacity,
            booked: avail.get(p.id)!.reserved,
            held: avail.get(p.id)!.held, // in couples' baskets right now, not yet ordered
            available: avail.get(p.id)!.available,
          }
        : null,
    })),
  });
}
