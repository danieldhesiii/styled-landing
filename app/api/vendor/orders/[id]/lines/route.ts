import { NextResponse } from "next/server";
import { requireVendor } from "@/lib/server/vendor";
import { logOrderEvent } from "@/lib/server/staff";
import { UUID, cleanText } from "@/lib/server/admin-orders";
import { lineEditable, type LineStatus, type OrderStatus } from "@/lib/server/order-workflow";

const fail = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status });

// PATCH /api/vendor/orders/[id]/lines
//   { lineIds: string[], supplierStatus: "pending" | "confirmed" | "declined", note?: string | null }
//
// A supplier records their own decision on their own items — the same field a
// stylist would otherwise set for them. Scoped hard to this vendor's supplier_id,
// and only while the order is still being reviewed. Staff still make the final
// call on the whole order.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireVendor(req);
  if (!auth.ok) return auth.response;
  const { admin, supplierId, actor } = auth;
  const { id } = await params;
  if (!UUID.test(id)) return fail(404, "Order not found.");

  let body: { lineIds?: unknown; supplierStatus?: unknown; note?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail(400, "Invalid request body.");
  }

  const status = body.supplierStatus as LineStatus;
  if (!["pending", "confirmed", "declined"].includes(status)) return fail(400, "Unknown status.");
  const lineIds = Array.isArray(body.lineIds) ? [...new Set(body.lineIds)] : [];
  if (lineIds.length === 0 || lineIds.length > 100 || !lineIds.every((x) => typeof x === "string" && UUID.test(x))) {
    return fail(400, "Choose at least one item.");
  }
  const note = cleanText(body.note, 1000);

  const { data: order } = await admin.from("orders").select("id, status").eq("id", id).maybeSingle();
  if (!order) return fail(404, "Order not found.");
  if (!lineEditable(order.status as OrderStatus)) {
    return fail(409, `This order is ${String(order.status).replace("_", " ")}, so it can no longer be changed.`);
  }

  // Only this supplier's own lines on this order can be touched.
  const { data: lines } = await admin
    .from("order_lines")
    .select("id, product_name")
    .eq("order_id", id)
    .eq("supplier_id", supplierId)
    .in("id", lineIds as string[]);
  if (!lines || lines.length !== lineIds.length) return fail(404, "Some of those items aren't yours on this order.");

  const { error } = await admin
    .from("order_lines")
    .update({
      supplier_status: status,
      supplier_decided_at: status === "pending" ? null : new Date().toISOString(),
      ...(note !== undefined ? { supplier_note: note } : {}),
    })
    .in("id", lineIds as string[])
    .eq("order_id", id)
    .eq("supplier_id", supplierId);
  if (error) {
    console.error("[vendor/lines PATCH]", error);
    return fail(500, "Couldn't update those items.");
  }

  // Logged against the order so staff see the supplier acted themselves.
  await logOrderEvent(admin, id, actor, status === "pending" ? "line_reset" : `line_${status}`, {
    by: "supplier",
    lines: lines.map((l) => ({ id: l.id, name: l.product_name })),
    ...(note ? { note } : {}),
  });

  return NextResponse.json({ ok: true });
}
