import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/server/staff";
import { todayUtc } from "@/lib/availability";

export const dynamic = "force-dynamic";

// GET /api/admin/availability: every product and supplier with its capacity and
// how many blocked/adjusted days are coming up. Includes switched-off products,
// so staff can turn them back on.
export async function GET(req: Request) {
  const auth = await requireStaff(req);
  if (!auth.ok) return auth.response;
  const { admin } = auth;
  const today = todayUtc();

  const [{ data: products, error }, { data: suppliers }, { data: overrides }] = await Promise.all([
    admin
      .from("products")
      .select("id, name, category, capacity, active, unit, qty_rule, supplier_id, suppliers(name, area)")
      .order("sort_order"),
    admin.from("suppliers").select("id, name, area, active").order("name"),
    admin.from("availability_overrides").select("product_id, supplier_id").gte("day", today),
  ]);
  if (error) {
    console.error("[admin/availability]", error);
    return NextResponse.json({ ok: false, error: "Couldn't load products." }, { status: 500 });
  }

  const productCount = new Map<string, number>();
  const supplierCount = new Map<string, number>();
  for (const o of overrides ?? []) {
    if (o.product_id) productCount.set(o.product_id, (productCount.get(o.product_id) ?? 0) + 1);
    if (o.supplier_id) supplierCount.set(o.supplier_id, (supplierCount.get(o.supplier_id) ?? 0) + 1);
  }

  return NextResponse.json({
    ok: true,
    products: (products ?? []).map((p) => {
      const s = p.suppliers as unknown as { name: string; area: string } | null;
      return {
        id: p.id,
        name: p.name,
        category: p.category,
        unit: p.unit,
        capacity: p.capacity,
        active: p.active,
        supplierId: p.supplier_id,
        supplier: s?.name ?? "",
        area: s?.area ?? "",
        upcomingOverrides: productCount.get(p.id) ?? 0,
      };
    }),
    suppliers: (suppliers ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      area: s.area,
      active: s.active,
      upcomingBlocks: supplierCount.get(s.id) ?? 0,
    })),
  });
}
