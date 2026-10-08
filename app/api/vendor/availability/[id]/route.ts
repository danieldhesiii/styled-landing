import { NextResponse } from "next/server";
import { requireVendor } from "@/lib/server/vendor";
import { UUID } from "@/lib/server/admin-orders";

// DELETE /api/vendor/availability/[id]: unblock a date. Scoped to this supplier's
// own blocks (the supplier_id filter is the security boundary).
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireVendor(req);
  if (!auth.ok) return auth.response;
  const { admin, supplierId } = auth;
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });

  const { data, error } = await admin
    .from("availability_overrides")
    .delete()
    .eq("id", id)
    .eq("supplier_id", supplierId)
    .select("id");
  if (error) return NextResponse.json({ ok: false, error: "Couldn't remove that." }, { status: 500 });
  if (!data || data.length === 0) return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
