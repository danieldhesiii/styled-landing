import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/server/staff";

// GET /api/admin/vendor-applications: suppliers who've applied to join, newest
// first. Optional ?status=new|reviewing|accepted|declined filter. Staff only.
export async function GET(req: Request) {
  const auth = await requireStaff(req);
  if (!auth.ok) return auth.response;
  const { admin } = auth;

  const status = new URL(req.url).searchParams.get("status");

  let query = admin
    .from("vendor_applications")
    .select("id, business_name, contact_name, email, phone, category, area, website, message, status, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (status && ["new", "reviewing", "accepted", "declined"].includes(status)) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[admin/vendor-applications] load failed:", error);
    return NextResponse.json({ ok: false, error: "Couldn't load applications." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, applications: data ?? [] });
}
