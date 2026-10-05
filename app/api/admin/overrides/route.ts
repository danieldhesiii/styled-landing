import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/server/staff";
import { UUID, cleanText } from "@/lib/server/admin-orders";
import { isValidDay, todayUtc } from "@/lib/availability";

const fail = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status });
const LIVE = ["requested", "confirmed", "deposit_paid"];

// POST /api/admin/overrides
//   { productId | supplierId, day, blocked, unitsAvailable?, note? }
//
// Block a day for one product or a whole supplier, or change how many units are
// available on one day (blocked: false + unitsAvailable). Replaces any earlier
// setting for the same day. Returns the orders already on that day that this
// touches, so the stylist can deal with them.
export async function POST(req: Request) {
  const auth = await requireStaff(req);
  if (!auth.ok) return auth.response;
  const { admin, actor } = auth;

  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return fail(400, "Invalid request body.");
  }

  const productId = typeof b.productId === "string" ? b.productId : null;
  const supplierId = typeof b.supplierId === "string" ? b.supplierId : null;
  if ((productId === null) === (supplierId === null)) return fail(400, "Choose either a product or a supplier.");
  if (supplierId && !UUID.test(supplierId)) return fail(400, "Invalid supplier.");
  if (!isValidDay(b.day)) return fail(400, "Please choose a valid date.");
  if (b.day < todayUtc()) return fail(400, "That date is in the past.");
  const blocked = b.blocked !== false;
  let unitsAvailable: number | null = null;
  if (!blocked) {
    if (supplierId) return fail(400, "Suppliers can only be blocked, not given a unit count.");
    if (typeof b.unitsAvailable !== "number" || !Number.isInteger(b.unitsAvailable) || b.unitsAvailable < 0 || b.unitsAvailable > 100000) {
      return fail(400, "Enter how many units are available that day (a whole number).");
    }
    unitsAvailable = b.unitsAvailable;
  }
  const note = cleanText(b.note, 300) ?? null;

  // The target must exist.
  if (productId) {
    const { data } = await admin.from("products").select("id").eq("id", productId).maybeSingle();
    if (!data) return fail(404, "Product not found.");
  } else {
    const { data } = await admin.from("suppliers").select("id").eq("id", supplierId).maybeSingle();
    if (!data) return fail(404, "Supplier not found.");
  }

  // One setting per target per day: replace any existing one.
  const target = productId ? { product_id: productId } : { supplier_id: supplierId };
  await admin.from("availability_overrides").delete().match({ ...target, day: b.day });
  const { data: created, error } = await admin
    .from("availability_overrides")
    .insert({ ...target, day: b.day, blocked, units_available: unitsAvailable, note, created_by: actor.id })
    .select("id")
    .single();
  if (error || !created) {
    console.error("[admin/overrides POST]", error);
    return fail(500, "Couldn't save that.");
  }

  // Who's already booked on that day for what was just changed?
  let productIds: string[] = productId ? [productId] : [];
  if (supplierId) {
    const { data: ps } = await admin.from("products").select("id").eq("supplier_id", supplierId);
    productIds = (ps ?? []).map((p) => p.id as string);
  }
  const { data: lines } = productIds.length
    ? await admin
        .from("order_lines")
        .select("orders!inner(id, reference, status, couple_name, wedding_date)")
        .in("product_id", productIds)
        .neq("supplier_status", "declined")
        .eq("orders.wedding_date", b.day)
        .in("orders.status", LIVE)
    : { data: [] };
  const seen = new Map<string, { id: string; reference: string; status: string; coupleName: string }>();
  for (const l of lines ?? []) {
    const o = (l as unknown as { orders: { id: string; reference: string; status: string; couple_name: string } }).orders;
    seen.set(o.id, { id: o.id, reference: o.reference, status: o.status, coupleName: o.couple_name });
  }

  return NextResponse.json({ ok: true, id: created.id, affectedOrders: [...seen.values()] }, { status: 201 });
}
