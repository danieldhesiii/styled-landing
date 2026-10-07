import { NextResponse } from "next/server";
import { requireVendor } from "@/lib/server/vendor";

export const dynamic = "force-dynamic";

// GET /api/vendor/products: this supplier's own catalogue.
export async function GET(req: Request) {
  const auth = await requireVendor(req);
  if (!auth.ok) return auth.response;
  const { admin, supplierId } = auth;

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

  return NextResponse.json({
    ok: true,
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
    })),
  });
}
