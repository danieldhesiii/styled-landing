import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/session";
import { loadOrderView } from "@/lib/server/orders";

// GET /api/orders/[id]: the guest's own order and its lines (row level security
// hides anyone else's).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const order = await loadOrderView(auth.supabase, id);
  if (!order) return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
  return NextResponse.json({ ok: true, order });
}
