import { NextResponse } from "next/server";
import { requireVendor } from "@/lib/server/vendor";
import { cleanText } from "@/lib/server/admin-orders";
import { isValidDay, todayUtc } from "@/lib/availability";

export const dynamic = "force-dynamic";

const fail = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status });
const LIVE = ["requested", "confirmed", "deposit_paid"];

// GET /api/vendor/availability: the supplier's upcoming blocked dates, with how
// many live orders each already has.
export async function GET(req: Request) {
  const auth = await requireVendor(req);
  if (!auth.ok) return auth.response;
  const { admin, supplierId } = auth;
  const today = todayUtc();

  const { data: blocks } = await admin
    .from("availability_overrides")
    .select("id, day, note, source")
    .eq("supplier_id", supplierId)
    .eq("blocked", true)
    .gte("day", today)
    .order("day");

  const { data: supplier } = await admin.from("suppliers").select("ical_url, ical_synced_at").eq("id", supplierId).maybeSingle();

  // Live orders per upcoming day for this supplier's products, to show alongside.
  const { data: products } = await admin.from("products").select("id").eq("supplier_id", supplierId);
  const productIds = (products ?? []).map((p) => p.id as string);
  const ordersByDay = new Map<string, number>();
  if (productIds.length > 0) {
    const { data: lines } = await admin
      .from("order_lines")
      .select("orders!inner(id, wedding_date, status)")
      .in("product_id", productIds)
      .neq("supplier_status", "declined")
      .gte("orders.wedding_date", today)
      .in("orders.status", LIVE);
    const seen = new Set<string>();
    for (const l of lines ?? []) {
      const o = (l as unknown as { orders: { id: string; wedding_date: string } }).orders;
      const key = `${o.id}:${o.wedding_date}`;
      if (seen.has(key)) continue;
      seen.add(key);
      ordersByDay.set(o.wedding_date, (ordersByDay.get(o.wedding_date) ?? 0) + 1);
    }
  }

  return NextResponse.json({
    ok: true,
    blocks: (blocks ?? []).map((b) => ({
      id: b.id,
      day: b.day,
      note: b.note,
      source: b.source ?? "manual",
      liveOrders: ordersByDay.get(b.day as string) ?? 0,
    })),
    ical: { url: supplier?.ical_url ?? null, syncedAt: supplier?.ical_synced_at ?? null },
  });
}

// POST /api/vendor/availability  { day, note? }
// Block a whole day for this supplier so couples can't request them then. One
// block per day; a new one replaces any earlier block for that day.
export async function POST(req: Request) {
  const auth = await requireVendor(req);
  if (!auth.ok) return auth.response;
  const { admin, supplierId, actor } = auth;

  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return fail(400, "Invalid request body.");
  }

  if (!isValidDay(b.day)) return fail(400, "Please choose a valid date.");
  if ((b.day as string) < todayUtc()) return fail(400, "That date is in the past.");
  const note = cleanText(b.note, 300) ?? null;

  // One supplier block per day: replace any existing one.
  await admin.from("availability_overrides").delete().eq("supplier_id", supplierId).eq("day", b.day);
  const { data: created, error } = await admin
    .from("availability_overrides")
    .insert({ supplier_id: supplierId, day: b.day, blocked: true, note, created_by: actor.id })
    .select("id")
    .single();
  if (error || !created) {
    console.error("[vendor/availability POST]", error);
    return fail(500, "Couldn't block that date.");
  }

  // How many live orders are already on that day (blocking won't cancel them).
  const { data: products } = await admin.from("products").select("id").eq("supplier_id", supplierId);
  const productIds = (products ?? []).map((p) => p.id as string);
  let liveOrders = 0;
  if (productIds.length > 0) {
    const { data: lines } = await admin
      .from("order_lines")
      .select("orders!inner(id, status, wedding_date)")
      .in("product_id", productIds)
      .neq("supplier_status", "declined")
      .eq("orders.wedding_date", b.day)
      .in("orders.status", LIVE);
    liveOrders = new Set((lines ?? []).map((l) => (l as unknown as { orders: { id: string } }).orders.id)).size;
  }

  return NextResponse.json({ ok: true, id: created.id, liveOrders }, { status: 201 });
}
