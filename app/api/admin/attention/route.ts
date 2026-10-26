import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/server/staff";
import { loadStaffAttention } from "@/lib/server/staff-attention";

export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const auth = await requireStaff(req);
  if (!auth.ok) return auth.response;
  try {
    return NextResponse.json({ ok: true, ...await loadStaffAttention(auth.admin) },
      { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not load the attention queue. Please retry." },
      { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
