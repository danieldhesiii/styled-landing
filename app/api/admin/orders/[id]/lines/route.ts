import { NextResponse } from "next/server";
import { logOrderEvent, requireStaff } from "@/lib/server/staff";
import { UUID, cleanText, loadAdminOrder } from "@/lib/server/admin-orders";
import { lineEditable, type LineStatus, type OrderStatus } from "@/lib/server/order-workflow";

const fail = (status: number, error: string, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ ok: false, error, ...extra }, { status });

// PATCH /api/admin/orders/[id]/lines
//   { lineIds: string[], supplierStatus: "pending" | "confirmed" | "declined", note?: string | null }
//
// Record what a supplier said about one or more items. Several ids at once is
// how "this supplier confirmed everything" works. Only while the order is still
// being reviewed. A declined line stops holding stock for that date.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff(req);
  if (!auth.ok) return auth.response;
  const { admin, actor } = auth;
  const { id } = await params;
  if (!UUID.test(id)) return fail(404, "Order not found.");

  let body: { lineIds?: unknown; supplierStatus?: unknown; note?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail(400, "Invalid request body.");
  }

  const status = body.supplierStatus as LineStatus;
  if (!["pending", "confirmed", "declined"].includes(status)) return fail(400, "Unknown supplier status.");
  const lineIds = Array.isArray(body.lineIds) ? [...new Set(body.lineIds)] : [];
  if (lineIds.length === 0 || lineIds.length > 100 || !lineIds.every((x) => typeof x === "string" && UUID.test(x))) {
    return fail(400, "Choose at least one item.");
  }
  const note = cleanText(body.note, 1000);

  const { data: order } = await admin.from("orders").select("id, status").eq("id", id).maybeSingle();
  if (!order) return fail(404, "Order not found.");
  if (!lineEditable(order.status as OrderStatus)) {
    return fail(409, `This order is ${String(order.status).replace("_", " ")}, so its suppliers can't be changed.`);
  }

  const { data: lines } = await admin
    .from("order_lines")
    .select("id, product_name, supplier_name")
    .eq("order_id", id)
    .in("id", lineIds as string[]);
  if (!lines || lines.length !== lineIds.length) return fail(404, "Some of those items aren't on this order.");

  const { error } = await admin
    .from("order_lines")
    .update({
      supplier_status: status,
      supplier_decided_at: status === "pending" ? null : new Date().toISOString(),
      ...(note !== undefined ? { supplier_note: note } : {}),
    })
    .in("id", lineIds as string[])
    .eq("order_id", id);
  if (error) {
    console.error("[admin/lines PATCH]", error);
    return fail(500, "Couldn't update those items.");
  }

  await logOrderEvent(admin, id, actor, status === "pending" ? "line_reset" : `line_${status}`, {
    lines: lines.map((l) => ({ id: l.id, name: l.product_name, supplier: l.supplier_name })),
    ...(note ? { note } : {}),
  });

  return NextResponse.json({ ok: true, ...(await loadAdminOrder(admin, id)) });
}
