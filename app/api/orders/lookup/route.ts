import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIpHash } from "@/lib/server/limits";
import { LINE_VIEW_COLUMNS, ORDER_VIEW_COLUMNS, orderView } from "@/lib/server/orders";

// POST /api/orders/lookup  { reference, email }
//
// Lets a couple see where their order is up to without needing the browser
// session they placed it in (cleared cookies, a new phone). Both the reference
// and the email must match, a wrong guess on either gives the same answer, and
// each network is limited to a few guesses an hour.
export async function POST(req: Request) {
  const admin = createAdminClient();

  const { data: allowed } = await admin.rpc("hit_rate_limit", {
    p_key: `lookup:${clientIpHash(req)}`,
    p_limit: 15,
    p_window_seconds: 3600,
  });
  if (allowed === false) {
    return NextResponse.json({ ok: false, error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  let body: { reference?: unknown; email?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }
  const reference = typeof body.reference === "string" ? body.reference.trim().toUpperCase() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const notFound = () =>
    NextResponse.json({ ok: false, error: "We couldn't find an order with those details." }, { status: 404 });
  if (!/^STY-[0-9A-F]{8}$/.test(reference) || !email || email.length > 254) return notFound();

  const { data: candidates } = await admin.from("orders").select(ORDER_VIEW_COLUMNS).eq("reference", reference);
  const order = (candidates ?? []).find((o) => String(o.email).toLowerCase() === email);
  if (!order) return notFound();

  const { data: lines } = await admin
    .from("order_lines")
    .select(LINE_VIEW_COLUMNS)
    .eq("order_id", order.id)
    .order("created_at");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return NextResponse.json({ ok: true, order: orderView(order as any, (lines ?? []) as any) });
}
