import { NextResponse } from "next/server";
import { requireVendor } from "@/lib/server/vendor";
import { lineEditable, type OrderStatus } from "@/lib/server/order-workflow";
import { supplierBookingTasks } from "@/lib/supplier-booking-task";

export const dynamic = "force-dynamic";

// GET /api/vendor/orders: the orders that include this supplier's products,
// newest wedding date first, with only this supplier's lines. Deliberately
// narrow: a vendor sees what they need to fulfil (items, quantity, date, venue
// area) and never other suppliers' lines, prices to the couple, or commission.
export async function GET(req: Request) {
  const auth = await requireVendor(req);
  if (!auth.ok) return auth.response;
  const { admin, supplierId } = auth;

  // This supplier's lines, with the parts of the order they're allowed to see.
  const { data: lines, error } = await admin
    .from("order_lines")
    .select("id, order_id, product_name, unit, quantity, supplier_status, supplier_note, needed_date, return_date, orders!inner(reference, status, wedding_date, venue_label, created_at)")
    .eq("supplier_id", supplierId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[vendor/orders] load failed:", error);
    return NextResponse.json({ ok: false, error: "Couldn't load your orders." }, { status: 500 });
  }

  // Group lines under their order.
  const byOrder = new Map<string, {
    orderId: string; reference: string; status: string; weddingDate: string | null; deliveryDate: string | null; venue: string | null;
    actionable: boolean; lines: { id: string; name: string; unit: string | null; quantity: number; status: string; note: string | null; neededDate: string | null; returnDate: string | null }[];
  }>();
  for (const l of lines ?? []) {
    const o = l.orders as unknown as { reference: string; status: string; wedding_date: string | null; venue_label: string | null };
    const entry = byOrder.get(l.order_id as string) ?? {
      orderId: l.order_id as string,
      reference: o.reference,
      status: o.status,
      weddingDate: o.wedding_date,
      // Legacy order-level hint; authoritative dates are on each line.
      deliveryDate: (l.needed_date as string | null) ?? o.wedding_date,
      venue: o.venue_label,
      actionable: lineEditable(o.status as OrderStatus),
      lines: [],
    };
    entry.lines.push({
      id: l.id as string,
      name: l.product_name as string,
      unit: l.unit as string | null,
      quantity: l.quantity as number,
      status: l.supplier_status as string,
      note: l.supplier_note as string | null,
      neededDate: (l.needed_date as string | null) ?? o.wedding_date,
      returnDate: (l.return_date as string | null) ?? o.wedding_date,
    });
    byOrder.set(l.order_id as string, entry);
  }

  // Only inspect workflows belonging to orders with this supplier's lines.
  const ids = [...byOrder.keys()];
  const workflows = ids.length
    ? await admin.from("booking_workflows").select("order_id,supplier_replies").in("order_id", ids)
    : { data: [], error: null };
  if (workflows.error) return NextResponse.json({ ok: false, error: "Couldn't check your outstanding service quotes." }, { status: 503 });
  const replies = new Map((workflows.data || []).map(w => [w.order_id, w.supplier_replies?.[supplierId]]));
  // Return only the linked supplier's task labels, never raw cross-supplier replies.
  const orders = [...byOrder.values()].map(o => ({
    ...o, outstandingTasks: supplierBookingTasks(o.status, o.lines, replies.get(o.orderId)),
  })).sort((a, b) => {
    const aPending = a.outstandingTasks.length > 0;
    const bPending = b.outstandingTasks.length > 0;
    if (aPending !== bPending) return aPending ? -1 : 1;
    return (a.weddingDate ?? "9999").localeCompare(b.weddingDate ?? "9999");
  });

  return NextResponse.json({ ok: true, orders });
}
