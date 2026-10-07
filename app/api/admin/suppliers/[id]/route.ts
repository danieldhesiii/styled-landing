import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/server/staff";

export const dynamic = "force-dynamic";

const fail = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status });
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// GET /api/admin/suppliers/[id]: a supplier and all of its products. Staff only.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff(req);
  if (!auth.ok) return auth.response;
  const { admin } = auth;
  const { id } = await params;

  const { data: supplier } = await admin
    .from("suppliers")
    .select("id, name, area, contact_email, active, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!supplier) return fail(404, "Supplier not found.");

  const { data: products } = await admin
    .from("products")
    .select("id, name, category, unit, unit_price_pence, qty_rule, capacity, lead_time_days, active, sort_order")
    .eq("supplier_id", id)
    .order("category")
    .order("sort_order");

  return NextResponse.json({
    ok: true,
    supplier: {
      id: supplier.id,
      name: supplier.name,
      area: supplier.area,
      contactEmail: supplier.contact_email,
      active: supplier.active,
      createdAt: supplier.created_at,
    },
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
    body = await req.json();
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
  if (Object.keys(patch).length === 0) return fail(400, "Nothing to change.");

  const { data, error } = await admin.from("suppliers").update(patch).eq("id", id).select("id").maybeSingle();
  if (error) {
    if (error.code === "23505") return fail(409, "A supplier with that name already exists.");
    console.error("[admin/suppliers PATCH]", error);
    return fail(500, "Couldn't update the supplier.");
  }
  if (!data) return fail(404, "Supplier not found.");
  return NextResponse.json({ ok: true });
}
