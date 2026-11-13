import { NextResponse } from "next/server";
import { requireVendor } from "@/lib/server/vendor";
import { UUID } from "@/lib/server/admin-orders";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const auth = await requireVendor(req);
  if (!auth.ok) return auth.response;
  const { data, error } = await auth.admin.from("supplier_order_inbox")
    .select("id,order_id,reference,summary,status,version").eq("supplier_id", auth.supplierId)
    .order("created_at", { ascending: false });
  return error ? NextResponse.json({ error: "Could not load order messages." }, { status: 503 })
    : NextResponse.json({ notices: data }, { headers: { "Cache-Control": "no-store" } });
}
export async function POST(req: Request) {
  const auth = await requireVendor(req);
  if (!auth.ok) return auth.response;
  const body = await req.json().catch(() => null);
  if (!UUID.test(body?.id) || !/^[0-9a-f]{32}$/.test(body?.version))
    return NextResponse.json({ error: "Choose a current order." }, { status: 400 });
  const { data, error } = await auth.admin.rpc("approve_supplier_order_notice", {
    p_notice: body.id, p_supplier: auth.supplierId, p_version: body.version, p_actor: auth.user.id, p_channel: "portal",
  });
  if (error || data !== "availability_confirmed") return NextResponse.json({ error: "Review the latest order details before approving." }, { status: 409 });
  return NextResponse.json({ ok: true });
}
