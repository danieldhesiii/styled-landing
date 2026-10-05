import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/server/staff";
import { todayUtc } from "@/lib/availability";

export const dynamic = "force-dynamic";

const fail = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status });
const LIVE = ["requested", "confirmed", "deposit_paid"];

// GET /api/admin/products/[id]: one product's capacity, its blocked/adjusted days
// (and its supplier's), and what's booked on each upcoming date.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff(req);
  if (!auth.ok) return auth.response;
  const { admin } = auth;
  const { id } = await params;
  const today = todayUtc();

  const { data: product } = await admin
    .from("products")
    .select("id, name, category, unit, qty_rule, capacity, active, supplier_id, suppliers(name, area)")
    .eq("id", id)
    .maybeSingle();
  if (!product) return fail(404, "Product not found.");

  const [{ data: overrides }, { data: supplierOverrides }, { data: lines }] = await Promise.all([
    admin.from("availability_overrides").select("id, day, blocked, units_available, note, created_at").eq("product_id", id).gte("day", today).order("day"),
    admin.from("availability_overrides").select("id, day, blocked, note, created_at").eq("supplier_id", product.supplier_id).gte("day", today).order("day"),
    admin
      .from("order_lines")
      .select("quantity, supplier_status, orders!inner(id, reference, status, wedding_date, couple_name)")
      .eq("product_id", id)
      .neq("supplier_status", "declined")
      .gte("orders.wedding_date", today)
      .in("orders.status", LIVE),
  ]);

  // Group what's booked by wedding date.
  const byDay = new Map<string, { day: string; units: number; orders: { id: string; reference: string; status: string; coupleName: string; quantity: number }[] }>();
  for (const l of lines ?? []) {
    const o = l.orders as unknown as { id: string; reference: string; status: string; wedding_date: string; couple_name: string };
    const row = byDay.get(o.wedding_date) ?? { day: o.wedding_date, units: 0, orders: [] };
    row.units += l.quantity as number;
    row.orders.push({ id: o.id, reference: o.reference, status: o.status, coupleName: o.couple_name, quantity: l.quantity as number });
    byDay.set(o.wedding_date, row);
  }

  const s = product.suppliers as unknown as { name: string; area: string } | null;
  return NextResponse.json({
    ok: true,
    product: {
      id: product.id,
      name: product.name,
      category: product.category,
      unit: product.unit,
      capacity: product.capacity,
      active: product.active,
      supplierId: product.supplier_id,
      supplier: s?.name ?? "",
      area: s?.area ?? "",
    },
    overrides: (overrides ?? []).map((o) => ({ id: o.id, day: o.day, blocked: o.blocked, unitsAvailable: o.units_available, note: o.note })),
    supplierOverrides: (supplierOverrides ?? []).map((o) => ({ id: o.id, day: o.day, note: o.note })),
    bookings: [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day)),
  });
}

// PATCH /api/admin/products/[id]  { capacity?: number | null, active?: boolean }
// capacity: units this supplier can provide per day; null = not limited by stock.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff(req);
  if (!auth.ok) return auth.response;
  const { id } = await params;

  let body: { capacity?: unknown; active?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail(400, "Invalid request body.");
  }

  const patch: Record<string, unknown> = {};
  if (body.capacity !== undefined) {
    const c = body.capacity;
    if (c !== null && (typeof c !== "number" || !Number.isInteger(c) || c < 0 || c > 100000)) {
      return fail(400, "Capacity must be a whole number from 0 to 100,000, or left empty for no limit.");
    }
    patch.capacity = c;
  }
  if (body.active !== undefined) {
    if (typeof body.active !== "boolean") return fail(400, "active must be true or false.");
    patch.active = body.active;
  }
  if (Object.keys(patch).length === 0) return fail(400, "Nothing to change.");

  const { data, error } = await auth.admin.from("products").update(patch).eq("id", id).select("id, capacity, active");
  if (error) {
    console.error("[admin/products PATCH]", error);
    return fail(500, "Couldn't update the product.");
  }
  if (!data || data.length === 0) return fail(404, "Product not found.");
  return NextResponse.json({ ok: true, product: data[0] });
}
