import { NextResponse } from "next/server";
import { logOrderEvent, requireStaff } from "@/lib/server/staff";
import { UUID, cleanText, loadAdminOrder } from "@/lib/server/admin-orders";
import { STAFF_SETTABLE, blockingLines, canTransition, type OrderStatus } from "@/lib/server/order-workflow";
import { checkQuantities } from "@/lib/server/availability";

export const dynamic = "force-dynamic";

const fail = (status: number, error: string, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ ok: false, error, ...extra }, { status });

// GET /api/admin/orders/[id]: the full order for the stylist.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff(req);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!UUID.test(id)) return fail(404, "Order not found.");

  const detail = await loadAdminOrder(auth.admin, id);
  if (!detail) return fail(404, "Order not found.");
  return NextResponse.json({ ok: true, ...detail });
}

// PATCH /api/admin/orders/[id]
//   { status?: "confirmed" | "declined" | "cancelled",
//     coupleMessage?: string | null,   // shown to the couple on their order page
//     staffNotes?: string | null,      // internal only
//     force?: boolean }                // confirm even though capacity has since been reduced
//
// Confirming needs every supplier line confirmed. Declining needs a message to
// the couple saying why. The update only applies if the order is still in the
// status the stylist was looking at, so two stylists can't overwrite each other.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff(req);
  if (!auth.ok) return auth.response;
  const { admin, actor } = auth;
  const { id } = await params;
  if (!UUID.test(id)) return fail(404, "Order not found.");

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail(400, "Invalid request body.");
  }

  const coupleMessage = cleanText(body.coupleMessage, 1000);
  const staffNotes = cleanText(body.staffNotes, 2000);
  const status = body.status as OrderStatus | undefined;
  if (status !== undefined && !STAFF_SETTABLE.includes(status)) return fail(400, "That status can't be set by hand.");
  if (status === undefined && coupleMessage === undefined && staffNotes === undefined) {
    return fail(400, "Nothing to change.");
  }

  const { data: order } = await admin.from("orders").select("id, status, wedding_date").eq("id", id).maybeSingle();
  if (!order) return fail(404, "Order not found.");
  const from = order.status as OrderStatus;

  const patch: Record<string, unknown> = {};
  const events: { type: string; detail: Record<string, unknown> }[] = [];

  if (status !== undefined) {
    if (!canTransition(from, status)) return fail(409, `An order that is ${from.replace("_", " ")} can't be marked ${status}.`);

    if (status === "declined" && !coupleMessage) {
      return fail(400, "Please write a short message to the couple saying why.");
    }

    if (status === "confirmed") {
      const { data: lines } = await admin.from("order_lines").select("id, product_id, product_name, supplier_name, quantity, supplier_status").eq("order_id", id);
      const blocking = blockingLines(lines ?? []);
      if (blocking.length > 0) {
        return fail(409, "Every supplier needs to confirm before the order can be confirmed.", {
          blocking: blocking.map((l) => ({ lineId: l.id, name: l.product_name, supplier: l.supplier_name, status: l.supplier_status })),
        });
      }
      // Stock may have been reduced since the order came in.
      if (order.wedding_date && body.force !== true) {
        const wanted = (lines ?? []).filter((l) => l.product_id).map((l) => ({ itemId: l.product_id as string, quantity: l.quantity as number }));
        const checks = await checkQuantities(admin, wanted, order.wedding_date as string, id);
        const conflicts = (lines ?? [])
          .filter((l) => l.product_id && checks.get(l.product_id as string)?.status === "unavailable")
          .map((l) => ({ lineId: l.id, name: l.product_name, availableUnits: checks.get(l.product_id as string)?.availableUnits ?? 0, requested: l.quantity }));
        if (conflicts.length > 0) {
          return fail(409, "Availability has changed since this order came in. Review it, or confirm anyway.", { conflicts });
        }
      }
    }

    patch.status = status;
    patch.decided_at = new Date().toISOString();
    patch.decided_by = actor.id;
    if (coupleMessage !== undefined) patch.couple_message = coupleMessage;
    events.push({ type: `status_${status}`, detail: { from, ...(coupleMessage ? { message: coupleMessage } : {}), ...(body.force === true ? { forced: true } : {}) } });
  } else if (coupleMessage !== undefined) {
    patch.couple_message = coupleMessage;
    events.push({ type: "message_to_couple", detail: { message: coupleMessage } });
  }

  if (staffNotes !== undefined) {
    patch.staff_notes = staffNotes;
    events.push({ type: "staff_notes_updated", detail: { length: staffNotes?.length ?? 0 } });
  }

  const { data: updated, error } = await admin
    .from("orders")
    .update(patch)
    .eq("id", id)
    .eq("status", from) // only if nobody else has moved it meanwhile
    .select("id");
  if (error) {
    console.error("[admin/orders PATCH]", error);
    return fail(500, "Couldn't update the order.");
  }
  if (!updated || updated.length === 0) {
    return fail(409, "This order was changed by someone else. Reload and try again.");
  }

  for (const e of events) await logOrderEvent(admin, id, actor, e.type, e.detail);

  return NextResponse.json({ ok: true, ...(await loadAdminOrder(admin, id)) });
}
