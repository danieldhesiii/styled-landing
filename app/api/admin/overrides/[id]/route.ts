import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/server/staff";
import { UUID } from "@/lib/server/admin-orders";

// DELETE /api/admin/overrides/[id]: remove a blocked day / unit change.
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff(req);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });

  const { data, error } = await auth.admin.from("availability_overrides").delete().eq("id", id).select("id");
  if (error) return NextResponse.json({ ok: false, error: "Couldn't remove that." }, { status: 500 });
  if (!data || data.length === 0) return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
