import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/server/staff";

export const dynamic = "force-dynamic";

const STATUSES = ["requested", "confirmed", "declined", "cancelled", "deposit_paid"] as const;

// GET /api/admin/orders?status=requested|confirmed|...|all&q=search&limit=100
//
// The staff inbox. Search matches reference, names and email. "requested" is
// listed oldest first so whatever has waited longest is on top.
export async function GET(req: Request) {
  const auth = await requireStaff(req);
  if (!auth.ok) return auth.response;
  const { admin } = auth;

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "requested";
  if (status !== "all" && !(STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json({ ok: false, error: "Unknown status." }, { status: 400 });
  }
  const limit = Math.min(300, Math.max(1, Number(url.searchParams.get("limit")) || 100));
  // Keep search text to harmless characters: it's placed inside a PostgREST filter.
  const q = (url.searchParams.get("q") ?? "").replace(/[^\p{L}\p{N} @.'&+-]/gu, "").trim().slice(0, 80);

  let query = admin
    .from("orders")
    .select(
      "id, reference, status, created_at, couple_name, email, wedding_date, venue_label, guest_count, subtotal_pence, deposit_pence, order_lines(supplier_status, supplier_name)"
    )
    .order("created_at", { ascending: status === "requested" })
    .limit(limit);
  if (status !== "all") query = query.eq("status", status);
  if (q) query = query.or(`couple_name.ilike.%${q}%,email.ilike.%${q}%,reference.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) {
    console.error("[admin/orders]", error);
    return NextResponse.json({ ok: false, error: "Couldn't load orders." }, { status: 500 });
  }

  const counts: Record<string, number> = {};
  await Promise.all(
    STATUSES.map(async (s) => {
      const { count } = await admin.from("orders").select("id", { count: "exact", head: true }).eq("status", s);
      counts[s] = count ?? 0;
    })
  );
  counts.all = Object.values(counts).reduce((a, b) => a + b, 0);

  const orders = (data ?? []).map((o) => {
    const lines = (o.order_lines ?? []) as { supplier_status: string; supplier_name: string }[];
    return {
      id: o.id,
      reference: o.reference,
      status: o.status,
      createdAt: o.created_at,
      coupleName: o.couple_name,
      email: o.email,
      weddingDate: o.wedding_date,
      venueLabel: o.venue_label,
      guestCount: o.guest_count,
      subtotalPence: o.subtotal_pence,
      depositPence: o.deposit_pence,
      lines: {
        total: lines.length,
        confirmed: lines.filter((l) => l.supplier_status === "confirmed").length,
        declined: lines.filter((l) => l.supplier_status === "declined").length,
        pending: lines.filter((l) => l.supplier_status === "pending").length,
      },
      suppliers: [...new Set(lines.map((l) => l.supplier_name))],
    };
  });

  return NextResponse.json({ ok: true, counts, orders });
}
