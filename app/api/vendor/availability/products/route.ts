import { NextResponse } from "next/server";
import { requireVendor } from "@/lib/server/vendor";
import { todayUtc } from "@/lib/availability";
import { productDayLimitInput } from "@/lib/product-day-limit";
import { JsonBodyError, readJsonObject } from "@/lib/server/request-json";

export const dynamic = "force-dynamic";
const fail = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status });

export async function GET(req: Request) {
  const auth = await requireVendor(req);
  if (!auth.ok) return auth.response;
  const { admin, supplierId } = auth;
  const { data: products, error } = await admin.from("products").select("id,name,capacity").eq("supplier_id", supplierId).order("name");
  if (error) return fail(503, "Could not load your products. Please retry.");
  if (!products?.length) return NextResponse.json({ ok: true, products: [], limits: [] });
  const { data: limits, error: limitsError } = await admin.from("availability_overrides")
    .select("id,product_id,day,blocked,units_available,note")
    .in("product_id", products.map(p => p.id)).gte("day", todayUtc()).order("day");
  if (limitsError) return fail(503, "Could not load product date limits. Please retry.");
  return NextResponse.json({ ok: true, products, limits: limits || [] });
}

export async function POST(req: Request) {
  const auth = await requireVendor(req);
  if (!auth.ok) return auth.response;
  let body;
  try { body = await readJsonObject(req, 4096); }
  catch (e) { return fail(e instanceof JsonBodyError ? e.status : 400, e instanceof Error ? e.message : "Invalid request."); }
  const parsed = productDayLimitInput(body, todayUtc());
  if (parsed.error) return fail(422, parsed.error);
  const { productId, day, units, note } = parsed.value!;
  const { error } = await auth.admin.rpc("set_supplier_product_day_limit", {
    p_actor: auth.actor.id, p_supplier: auth.supplierId, p_product: productId, p_day: day, p_units: units, p_note: note,
  });
  if (error) {
    if (error.message === "Product does not belong to this supplier") return fail(404, "Product not found.");
    if (error.message === "Daily limit exceeds normal stock") return fail(422, "This exceeds normal stock. Update the product's normal stock first.");
    if (error.message === "Made-to-order products can only be closed for a date") return fail(422, "For made-to-order products, use zero to close a date. Set normal stock in Products to use quantity limits.");
    return fail(503, "Could not save the date limit. Your existing dates are unchanged. Please retry.");
  }
  return NextResponse.json({ ok: true });
}
