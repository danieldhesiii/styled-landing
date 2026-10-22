import { NextResponse } from "next/server";
import { requireVendor } from "@/lib/server/vendor";
export async function GET(req: Request) {
  const auth = await requireVendor(req);
  if (!auth.ok) return auth.response;
  const [s, p] = await Promise.all([
    auth.admin
      .from("suppliers")
      .select("name,logo_url,bio,onboarding_availability_confirmed_at")
      .eq("id", auth.supplierId)
      .single(),
    auth.admin
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("supplier_id", auth.supplierId),
  ]);
  if (s.error || p.error)
    return NextResponse.json(
      { error: "Could not load onboarding." },
      { status: 503 },
    );
  return NextResponse.json({ profile: s.data, productCount: p.count ?? 0 });
}
export async function POST(req: Request) {
  const auth = await requireVendor(req);
  if (!auth.ok) return auth.response;
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const patch: Record<string, unknown> = {};
  if (body?.bio !== undefined) {
    if (typeof body.bio !== "string" || body.bio.length > 2000)
      return NextResponse.json(
        { error: "Keep your story under 2,000 characters." },
        { status: 422 },
      );
    patch.bio = body.bio.trim() || null;
  }
  if (body?.confirmAvailability === true)
    patch.onboarding_availability_confirmed_at = new Date().toISOString();
  if (!Object.keys(patch).length)
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  const { error } = await auth.admin
    .from("suppliers")
    .update(patch)
    .eq("id", auth.supplierId);
  return error
    ? NextResponse.json({ error: "Could not save profile." }, { status: 503 })
    : NextResponse.json({ ok: true });
}
