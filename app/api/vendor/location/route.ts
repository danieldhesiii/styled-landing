import { NextResponse } from "next/server";
import { requireVendor } from "@/lib/server/vendor";
import { supplierJson } from "@/lib/server/supplier-body";
import { lookupPostcode } from "@/lib/server/geocode";
import { supplierLocationInput } from "@/lib/supplier-location";

// Never accept an entity ID from the browser; every read/write uses membership.
export async function GET(req: Request) {
  const auth = await requireVendor(req);
  if (!auth.ok) return auth.response;
  const { data, error } = await auth.admin.from("discovery_locations")
    .select("postcode,radius_miles,nationwide")
    .eq("entity_type", "supplier").eq("entity_id", auth.supplierId).maybeSingle();
  return error
    ? NextResponse.json({ error: "Could not load your location." }, { status: 503 })
    : NextResponse.json({ location: data }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(req: Request) {
  const auth = await requireVendor(req);
  if (!auth.ok) return auth.response;
  let input;
  try { input = supplierLocationInput(await supplierJson(req, 1500)); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Check your location." }, { status: 422 }); }
  if (input.action === "clear") {
    const { error } = await auth.admin.from("discovery_locations").delete()
      .eq("entity_type", "supplier").eq("entity_id", auth.supplierId);
    return error ? NextResponse.json({ error: "Could not clear location." }, { status: 503 }) : NextResponse.json({ ok: true });
  }
  let point;
  try { point = await lookupPostcode(input.postcode); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Could not locate that postcode." }, { status: 422 }); }
  const { error } = await auth.admin.from("discovery_locations").upsert({
    entity_type: "supplier", entity_id: auth.supplierId,
    ...point, radius_miles: input.radius_miles, nationwide: input.nationwide,
  }, { onConflict: "entity_type,entity_id" });
  return error ? NextResponse.json({ error: "Could not save location." }, { status: 503 }) : NextResponse.json({ ok: true });
}
