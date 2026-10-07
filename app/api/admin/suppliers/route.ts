import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/server/staff";
import { parseProfile } from "@/lib/server/supplier-profile";

export const dynamic = "force-dynamic";

const fail = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status });
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// GET /api/admin/suppliers: every supplier with a count of its products and how
// many are live, newest first. Staff only.
export async function GET(req: Request) {
  const auth = await requireStaff(req);
  if (!auth.ok) return auth.response;
  const { admin } = auth;

  const [{ data: suppliers, error }, { data: products }] = await Promise.all([
    admin.from("suppliers").select("id, name, area, contact_email, logo_url, commission_rate, active, created_at").order("created_at", { ascending: false }),
    admin.from("products").select("supplier_id, active"),
  ]);
  if (error) {
    console.error("[admin/suppliers] load failed:", error);
    return fail(500, "Couldn't load suppliers.");
  }

  const counts = new Map<string, { total: number; active: number }>();
  for (const p of products ?? []) {
    const id = p.supplier_id as string;
    const c = counts.get(id) ?? { total: 0, active: 0 };
    c.total += 1;
    if (p.active) c.active += 1;
    counts.set(id, c);
  }

  return NextResponse.json({
    ok: true,
    suppliers: (suppliers ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      area: s.area,
      contactEmail: s.contact_email,
      logoUrl: s.logo_url,
      commissionRate: s.commission_rate === null ? null : Number(s.commission_rate),
      active: s.active,
      createdAt: s.created_at,
      products: counts.get(s.id)?.total ?? 0,
      activeProducts: counts.get(s.id)?.active ?? 0,
    })),
  });
}

// POST /api/admin/suppliers  { name, area, contactEmail?, active?, applicationId? }
// Create a supplier. If it came from a vendor application, pass applicationId to
// mark that application accepted at the same time. Staff only.
export async function POST(req: Request) {
  const auth = await requireStaff(req);
  if (!auth.ok) return auth.response;
  const { admin } = auth;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail(400, "Invalid request body.");
  }

  const name = str(body.name);
  const area = str(body.area);
  const contactEmail = str(body.contactEmail).toLowerCase();
  const active = body.active === undefined ? true : body.active === true;
  const applicationId = str(body.applicationId);

  if (name.length < 2 || name.length > 120) return fail(422, "Please enter the supplier's name.");
  if (area.length < 2 || area.length > 120) return fail(422, "Please enter the area they cover.");
  if (contactEmail && (!EMAIL.test(contactEmail) || contactEmail.length > 160)) return fail(422, "That contact email isn't valid.");

  const profile = parseProfile(body);
  if (!profile.ok) return fail(422, profile.error);

  const { data, error } = await admin
    .from("suppliers")
    .insert({
      name,
      area,
      contact_email: contactEmail || null,
      logo_url: profile.logoUrl ?? null,
      commission_rate: profile.commissionRate ?? null,
      active,
    })
    .select("id, name, area, contact_email, active")
    .single();
  if (error) {
    if (error.code === "23505") return fail(409, "A supplier with that name already exists.");
    console.error("[admin/suppliers POST]", error);
    return fail(500, "Couldn't create the supplier.");
  }

  // Link the originating application, if any (best effort — the supplier is made).
  if (applicationId) {
    const { error: linkError } = await admin
      .from("vendor_applications")
      .update({ status: "accepted" })
      .eq("id", applicationId);
    if (linkError) console.error("[admin/suppliers POST] couldn't mark application accepted:", linkError);
  }

  return NextResponse.json(
    { ok: true, supplier: { id: data.id, name: data.name, area: data.area, contactEmail: data.contact_email, active: data.active } },
    { status: 201 }
  );
}
