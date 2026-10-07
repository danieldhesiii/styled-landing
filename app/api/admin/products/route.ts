import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { requireStaff } from "@/lib/server/staff";
import { VENDOR_CATEGORY_VALUES } from "@/lib/vendor-categories";
import { QTY_RULE_VALUES, SLOT_VALUES } from "@/lib/product-options";
import { STYLES } from "@/lib/styles";

export const dynamic = "force-dynamic";

const fail = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status });
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const STYLE_IDS = new Set(STYLES.map((s) => s.id));

// Turn a name into a url-safe id with a short random suffix, so two products with
// the same name (e.g. "Taper Candles") never collide on the text primary key.
function makeId(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "product";
  return `${slug}-${randomBytes(3).toString("hex")}`;
}

// POST /api/admin/products
//
// Add a product to a supplier's catalogue. The shop shows it as soon as the
// product and its supplier are both active. Staff only.
//
// Body: { supplierId, name, category, unitPrice (GBP), unit, qtyRule, capacity?,
//         leadTimeDays?, styles?, slot?, icon?, swatch?, image?, note?, active? }
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

  const supplierId = str(body.supplierId);
  const name = str(body.name);
  const category = str(body.category);
  const unit = str(body.unit);
  const qtyRule = str(body.qtyRule);
  const slot = str(body.slot);
  const icon = str(body.icon);
  const swatch = str(body.swatch);
  const image = str(body.image);
  const note = str(body.note);
  const active = body.active === undefined ? true : body.active === true;

  if (!supplierId) return fail(422, "Which supplier is this for?");
  if (name.length < 2 || name.length > 160) return fail(422, "Please enter the product name.");
  if (!VENDOR_CATEGORY_VALUES.has(category)) return fail(422, "Please choose a category.");
  if (unit.length < 1 || unit.length > 40) return fail(422, "Please enter a unit (e.g. “each”, “per table”).");
  if (!QTY_RULE_VALUES.has(qtyRule)) return fail(422, "Please choose how the quantity is worked out.");
  if (slot && !SLOT_VALUES.has(slot)) return fail(422, "That render position isn't valid.");
  if (swatch && !/^#[0-9a-fA-F]{6}$/.test(swatch)) return fail(422, "Swatch must be a hex colour like #c9a0a0.");
  if (image.length > 300) return fail(422, "That image path is too long.");
  if (note.length > 500) return fail(422, "Please keep the note under 500 characters.");

  const unitPrice = Number(body.unitPrice);
  if (!Number.isFinite(unitPrice) || unitPrice < 0 || unitPrice > 1_000_000) return fail(422, "Please enter a valid price in pounds.");
  const unitPricePence = Math.round(unitPrice * 100);

  // Capacity: units available per day. Empty/null = not limited by stock (made to
  // order). That's also what the shop reads to show the stock label.
  let capacity: number | null = null;
  if (body.capacity !== undefined && body.capacity !== null && str(body.capacity) !== "") {
    const c = Number(body.capacity);
    if (!Number.isInteger(c) || c < 0 || c > 100000) return fail(422, "Capacity must be a whole number from 0 to 100,000, or left empty for made to order.");
    capacity = c;
  }

  let leadTimeDays = 0;
  if (body.leadTimeDays !== undefined && str(body.leadTimeDays) !== "") {
    const d = Number(body.leadTimeDays);
    if (!Number.isInteger(d) || d < 0 || d > 365) return fail(422, "Lead time must be a whole number of days from 0 to 365.");
    leadTimeDays = d;
  }

  let styles: string[] = [];
  if (Array.isArray(body.styles)) {
    styles = body.styles.filter((s): s is string => typeof s === "string" && STYLE_IDS.has(s));
  }

  // Make sure the supplier exists before writing the product.
  const { data: supplier } = await admin.from("suppliers").select("id").eq("id", supplierId).maybeSingle();
  if (!supplier) return fail(404, "That supplier doesn't exist.");

  // Append within its category in the shop ordering.
  const { data: last } = await admin
    .from("products")
    .select("sort_order")
    .eq("category", category)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sortOrder = (last?.sort_order ?? 0) + 1;

  // Retry once if the random id happens to collide.
  for (let attempt = 0; attempt < 2; attempt++) {
    const id = makeId(name);
    const { data, error } = await admin
      .from("products")
      .insert({
        id,
        supplier_id: supplierId,
        name,
        category,
        slot: slot || null,
        unit_price_pence: unitPricePence,
        unit,
        qty_rule: qtyRule,
        styles,
        image: image || null,
        icon,
        swatch: swatch || "#cccccc",
        lead_time_days: leadTimeDays,
        stock: capacity === null ? "made_to_order" : "in_stock",
        capacity,
        note: note || null,
        sort_order: sortOrder,
        active,
      })
      .select("id")
      .single();
    if (!error) return NextResponse.json({ ok: true, product: { id: data.id } }, { status: 201 });
    if (error.code === "23505" && attempt === 0) continue; // id clash — new suffix
    console.error("[admin/products POST]", error);
    return fail(500, "Couldn't add the product.");
  }
  return fail(500, "Couldn't add the product.");
}
