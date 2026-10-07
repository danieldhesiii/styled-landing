import { NextResponse } from "next/server";
import { requireVendor } from "@/lib/server/vendor";
import { lineEditable, type OrderStatus } from "@/lib/server/order-workflow";

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
    .select("id, order_id, product_name, unit, quantity, supplier_status, supplier_note, orders!inner(reference, status, wedding_date, venue_label, created_at)")
    .eq("supplier_id", supplierId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[vendor/orders] load failed:", error);
    return NextResponse.json({ ok: false, error: "Couldn't load your orders." }, { status: 500 });
  }

  // Group lines under their order.
  const byOrder = new Map<string, {
    orderId: string; reference: string; status: string; weddingDate: string | null; venue: string | null;
    actionable: boolean; lines: { id: string; name: string; unit: string | null; quantity: number; status: string; note: string | null }[];
  }>();
  for (const l of lines ?? []) {
    const o = l.orders as unknown as { reference: string; status: string; wedding_date: string | null; venue_label: string | null };
    const entry = byOrder.get(l.order_id as string) ?? {
      orderId: l.order_id as string,
      reference: o.reference,
      status: o.status,
      weddingDate: o.wedding_date,
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
    });
    byOrder.set(l.order_id as string, entry);
  }

  // Sort: orders needing a decision first, then by soonest wedding date.
  const orders = [...byOrder.values()].sort((a, b) => {
    const aPending = a.actionable && a.lines.some((l) => l.status === "pending");
    const bPending = b.actionable && b.lines.some((l) => l.status === "pending");
    if (aPending !== bPending) return aPending ? -1 : 1;
    return (a.weddingDate ?? "9999").localeCompare(b.weddingDate ?? "9999");
  });

  return NextResponse.json({ ok: true, orders });
}
