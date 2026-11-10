import { supplierJson } from "@/lib/server/supplier-body";
import { productInput } from "@/lib/supplier-workspace";
import { NextResponse } from "next/server";
import { requireVendor } from "@/lib/server/vendor";
import {
  loadAvailability,
  type RawAvailability,
} from "@/lib/server/availability";
import { usableDate } from "@/lib/server/look";

export const dynamic = "force-dynamic";

// GET /api/vendor/products?date=YYYY-MM-DD: this supplier's own catalogue, with what
// is free on that day (default: today). Availability comes from the same database
// function the shop and the studio use, so what the vendor sees is what couples get.
export async function GET(req: Request) {
  const auth = await requireVendor(req);
  if (!auth.ok) return auth.response;
  const { admin, supplierId } = auth;

  const url = new URL(req.url);
  const day =
    usableDate(url.searchParams.get("date")) ??
    new Date().toISOString().slice(0, 10);

  const { data, error } = await admin
    .from("products")
    .select(
      "id, name, category, unit, unit_price_pence, qty_rule, capacity, lead_time_days, active, note, styles, image, details, updated_at",
    )
    .eq("supplier_id", supplierId)
    .order("category")
    .order("sort_order");
  if (error) {
    console.error("[vendor/products] load failed:", error);
    return NextResponse.json(
      { ok: false, error: "Couldn't load your products." },
      { status: 500 },
    );
  }

  // Owner-only signed previews for unpublished/private review uploads.
  const previews=new Map<string,string>();
  const privateRows=(data||[]).filter(p=>p.image?.startsWith("/api/supplier-images/"));
  if(privateRows.length){const assets=await admin.from("supplier_review_assets").select("id,path").eq("supplier_id",supplierId).in("id",privateRows.map(p=>p.image!.split('/').at(-1)!));if(assets.error)return NextResponse.json({error:"Could not load private product images."},{status:503});for(const asset of assets.data||[]){const signed=await admin.storage.from("supplier-review-assets").createSignedUrl(asset.path,600);if(signed.data)previews.set(asset.id,signed.data.signedUrl);}}
  let avail = new Map<string, RawAvailability>();
  try {
    avail = await loadAvailability(
      admin,
      (data ?? []).map((p) => p.id),
      day,
    );
  } catch (e) {
    console.error("[vendor/products] availability failed:", e);
  }

  return NextResponse.json({
    ok: true,
    date: day,
    products: (data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      unit: p.unit,
      unitPricePence: p.unit_price_pence,
      qtyRule: p.qty_rule,
      capacity: p.capacity,
      leadTimeDays: p.lead_time_days,
      note: p.note,
      styles: p.styles,
      image: p.image?.startsWith("/api/supplier-images/")?previews.get(p.image.split("/").at(-1)!)||null:p.image,
      details: p.details,
      updatedAt: p.updated_at,
      active: p.active,
      day: avail.has(p.id)
        ? {
            // null = no stock limit (made to order); 0 effective = blocked that day
            effectiveCapacity: avail.get(p.id)!.effectiveCapacity,
            booked: avail.get(p.id)!.reserved,
            available: avail.get(p.id)!.available,
          }
        : null,
    })),
  });
}

export async function POST(req: Request) {
  const auth = await requireVendor(req);
  if (!auth.ok) return auth.response;
  try {
    if (!req.headers.get("origin") || new URL(req.headers.get("origin")!).host !== (req.headers.get("host") || new URL(req.url).host))
      return NextResponse.json({error:"Cross-site request refused."},{status:403});
    const body = await supplierJson(req);
    const patch = productInput(body);
    const clientId = body.clientId;
    if (
      typeof clientId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        clientId,
      )
    )
      return NextResponse.json(
        { error: "Refresh the product form and try again." },
        { status: 422 },
      );
    if (!patch)
      return NextResponse.json(
        {
          error:
            "Check the product name, price, category and optional details.",
        },
        { status: 422 },
      );
    const { data: allowed, error: limitError } = await auth.admin.rpc(
      "hit_rate_limit",
      {
        p_key: `supplier-product:${auth.user.id}`,
        p_limit: 30,
        p_window_seconds: 3600,
      },
    );
    if (limitError || allowed !== true)
      return NextResponse.json(
        { error: "Please wait before adding more products." },
        { status: 429 },
      );
    const id = `supplier-${auth.supplierId}-${clientId}`;
    const { error } = await auth.admin.from("products").upsert(
      {
        ...patch,
        id,
        supplier_id: auth.supplierId,
        active: false,
        icon: "",
        swatch: "#f6f1eb",
      },
      { onConflict: "id", ignoreDuplicates: true },
    );
    if (error)
      return NextResponse.json(
        { error: "Could not save your product." },
        { status: 503 },
      );
    return NextResponse.json({ ok: true, id });
  } catch {
    return NextResponse.json(
      { error: "Could not save. Check your details and try again." },
      { status: 400 },
    );
  }
}
