import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/server/staff";
import { parseProfile } from "@/lib/server/supplier-profile";

export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
const fail = (status: number, error: string) => json({ ok: false, error }, status);
const SUPPLIER_COLUMNS = "id, name, area, contact_email, logo_url, commission_rate, active, created_at";
function supplierView(s: Record<string, any>) {
  return { id: s.id, name: s.name, area: s.area, contactEmail: s.contact_email,
    logoUrl: s.logo_url, commissionRate: s.commission_rate === null ? null : Number(s.commission_rate),
    active: s.active, createdAt: s.created_at };
}
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// GET /api/admin/suppliers/[id]: a supplier and all of its products. Staff only.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff(req);
  if (!auth.ok) return auth.response;
  const { admin } = auth;
  const { id } = await params;

  const { data: supplier, error: supplierError } = await admin
    .from("suppliers")
    .select(SUPPLIER_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (supplierError) return fail(503, "Could not load the supplier. Try again.");
  if (!supplier) return fail(404, "Supplier not found.");
  const { data: review, error: reviewError } = await admin.from("supplier_reviews")
    .select("state,declarations").eq("supplier_id", id).maybeSingle();
  if (reviewError) return fail(503, "Could not verify publication approval. Refresh before changing visibility.");
  const permissions = review?.declarations as Record<string, unknown> | null;
  const canReactivate = review?.state === "approved" && permissions?.listingPermission === true &&
    permissions?.publicImagePermission === true && permissions?.imageRights === true;

  const { data: products, error: productError } = await admin
    .from("products")
    .select("id, name, category, unit, unit_price_pence, qty_rule, capacity, lead_time_days, active, sort_order, note, updated_at")
    .eq("supplier_id", id)
    .order("category")
    .order("sort_order");

  if (productError) return fail(503, "Could not load the supplier products.");
  return json({
    ok: true,
    supplier: supplierView(supplier),
    publication: { reviewState: review?.state || "unreviewed", canReactivate,
      reason: canReactivate ? null : "Review and approve the current range and photo permissions before reactivating." },
    products: (products ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      unit: p.unit,
      unitPricePence: p.unit_price_pence,
      qtyRule: p.qty_rule,
      capacity: p.capacity,
      leadTimeDays: p.lead_time_days,
      active: p.active,
      note: p.note || "",
      updatedAt: p.updated_at,
    })),
  });
}

// PATCH /api/admin/suppliers/[id]  { name?, area?, contactEmail?, active? }
// Edit a supplier. Switching a supplier off hides all of its products from the
// shop (the catalogue only reads active products from active suppliers).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff(req);
  if (!auth.ok) return auth.response;
  const { admin } = auth;
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return fail(400, "Invalid request body.");
    body = parsed;
  } catch {
    return fail(400, "Invalid request body.");
  }

  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) {
    const name = str(body.name);
    if (name.length < 2 || name.length > 120) return fail(422, "Please enter the supplier's name.");
    patch.name = name;
  }
  if (body.area !== undefined) {
    const area = str(body.area);
    if (area.length < 2 || area.length > 120) return fail(422, "Please enter the area they cover.");
    patch.area = area;
  }
  if (body.contactEmail !== undefined) {
    const contactEmail = str(body.contactEmail).toLowerCase();
    if (contactEmail && (!EMAIL.test(contactEmail) || contactEmail.length > 160)) return fail(422, "That contact email isn't valid.");
    patch.contact_email = contactEmail || null;
  }
  if (body.active !== undefined) {
    if (typeof body.active !== "boolean") return fail(400, "active must be true or false.");
    patch.active = body.active;
  }
  const profile = parseProfile(body);
  if (!profile.ok) return fail(422, profile.error);
  if (profile.logoUrl !== undefined) patch.logo_url = profile.logoUrl;
  if (profile.commissionRate !== undefined) patch.commission_rate = profile.commissionRate;

  if (Object.keys(patch).length === 0) return fail(400, "Nothing to change.");

  const { data, error } = await admin.from("suppliers").update(patch).eq("id", id).select(SUPPLIER_COLUMNS).maybeSingle();
  if (error) {
    if(error.code==="P0001")return fail(409,"Supplier remains hidden. Review and approve its current range and photo permissions before reactivating.");
    if(error.code==="55P03" || error.code==="40P01")return fail(409,"Publication is being updated. Refresh and try again.");
    if (error.code === "23505") return fail(409, "A supplier with that name already exists.");
    console.error("[admin/suppliers PATCH]", error);
    return fail(500, "Couldn't update the supplier.");
  }
  if (!data) return fail(404, "Supplier not found.");
  return json({ ok: true, supplier: supplierView(data),
    requestedActiveApplied: body.active === undefined || data.active === body.active,
    message: body.active !== undefined && data.active !== body.active
      ? "Details saved. The listing remains hidden pending approval of these changes."
      : body.active === false ? "Supplier paused. Its products are hidden from the shop."
      : body.active === true ? "Supplier reactivated. Enabled products can appear in the shop."
      : "Supplier details saved." });
}
