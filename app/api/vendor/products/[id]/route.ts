import { supplierJson } from "@/lib/server/supplier-body";
import { productInput } from "@/lib/supplier-workspace";
import { NextResponse } from "next/server";
import { requireVendor } from "@/lib/server/vendor";

export const dynamic = "force-dynamic";

const fail = (status: number, error: string) =>
  NextResponse.json({ ok: false, error }, { status });

// PATCH /api/vendor/products/[id]  { active?, unitPrice? (GBP), capacity? }
// A supplier manages their own product: show/hide it, change its price, or set
// how many they can supply per day (blank = made to order). Scoped to their own
// products only.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireVendor(req);
  if (!auth.ok) return auth.response;
  const { admin, supplierId } = auth;
  const { id } = await params;

  let body: {
    active?: unknown;
    unitPrice?: unknown;
    capacity?: unknown;
    product?: unknown;
    updatedAt?: unknown;
  };
  try {
    body = await supplierJson(req);
  } catch {
    return fail(400, "Invalid request body.");
  }

  const patch: Record<string, unknown> = {};
  if (body.product !== undefined) {
    const parsed = productInput(body.product);
    if (!parsed) return fail(422, "Check the product details and amounts.");
    if (
      typeof body.updatedAt !== "string" ||
      !Number.isFinite(Date.parse(body.updatedAt))
    )
      return fail(422, "Refresh this product before editing.");
    Object.assign(patch, parsed);
  }

  if (body.active !== undefined) {
    if (typeof body.active !== "boolean")
      return fail(400, "active must be true or false.");
    patch.active = body.active;
  }

  if (body.unitPrice !== undefined) {
    const n = Number(body.unitPrice);
    if (!Number.isFinite(n) || n < 0 || n > 1_000_000)
      return fail(422, "Enter a valid price in pounds.");
    patch.unit_price_pence = Math.round(n * 100);
  }

  if (body.capacity !== undefined) {
    if (
      body.capacity === null ||
      (typeof body.capacity === "string" && body.capacity.trim() === "")
    ) {
      patch.capacity = null;
      patch.stock = "made_to_order";
    } else {
      const c = Number(body.capacity);
      if (!Number.isInteger(c) || c < 0 || c > 100000)
        return fail(
          422,
          "Capacity must be a whole number from 0 to 100,000, or blank for made to order.",
        );
      patch.capacity = c;
      patch.stock = "in_stock";
    }
  }

  if (Object.keys(patch).length === 0) return fail(400, "Nothing to change.");

  // The supplier_id filter is the security boundary: a vendor can only ever edit
  // their own rows, whatever id they send.
  let updateQuery = admin
    .from("products")
    .update(patch)
    .eq("id", id)
    .eq("supplier_id", supplierId);
  if (body.product !== undefined)
    updateQuery = updateQuery.eq("updated_at", body.updatedAt as string);
  const { data, error } = await updateQuery.select("id").maybeSingle();
  if (error) {
    if(error.code==="P0001")return fail(409,"This product needs a submitted range and staff approval before it can be published.");
    console.error("[vendor/products PATCH]", error);
    return fail(500, "Couldn't update the product.");
  }
  if (!data)
    return fail(
      body.product !== undefined ? 409 : 404,
      "This product changed or is no longer available. Refresh before saving again.",
    );
  return NextResponse.json({ ok: true });
}
