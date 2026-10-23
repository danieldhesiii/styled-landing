import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/server/staff";
import { lookupPostcode } from "@/lib/server/geocode";
export async function GET(req: Request) {
  const auth = await requireStaff(req);
  if (!auth.ok) return auth.response;
  const [s, v, l] = await Promise.all([
    auth.admin.from("suppliers").select("id,name").order("name"),
    auth.admin.from("venue_listings").select("id,name").order("name"),
    auth.admin.from("discovery_locations").select("*"),
  ]);
  if (s.error || v.error || l.error)
    return NextResponse.json(
      { error: "Could not load locations." },
      { status: 500 },
    );
  return NextResponse.json(
    { suppliers: s.data, venues: v.data, locations: l.data },
    { headers: { "Cache-Control": "private,no-store" } },
  );
}
export async function POST(req: Request) {
  const auth = await requireStaff(req);
  if (!auth.ok) return auth.response;
  const fail = (status: number, error: string) =>
    NextResponse.json({ error }, { status });
  let b;
  try {
    const text = await req.text();
    if (text.length > 1500) return fail(413, "Request too large.");
    b = JSON.parse(text);
  } catch {
    return fail(400, "Invalid request.");
  }
  if (
    !b ||
    !["supplier", "venue"].includes(b.entity_type) ||
    typeof b.entity_id !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(b.entity_id)
  )
    return fail(400, "Choose a supplier or venue.");
  const { data: exists } = await auth.admin
    .from(b.entity_type === "supplier" ? "suppliers" : "venue_listings")
    .select("id")
    .eq("id", b.entity_id)
    .maybeSingle();
  if (!exists) return fail(404, "Listing not found.");
  if (b.action === "clear") {
    const { error } = await auth.admin
      .from("discovery_locations")
      .delete()
      .eq("entity_type", b.entity_type)
      .eq("entity_id", b.entity_id);
    return error
      ? fail(500, "Could not clear location.")
      : NextResponse.json({ ok: true });
  }
  if (b.action !== "save" || b.confirmed !== true)
    return fail(400, "Confirm these details with the business before saving.");
  if (typeof b.postcode !== "string" || b.postcode.length > 10)
    return fail(400, "Enter a full UK postcode.");
  const radius =
    b.radius_miles === "" || b.radius_miles == null
      ? null
      : Number(b.radius_miles);
  if (
    radius !== null &&
    (!Number.isInteger(radius) || radius < 0 || radius > 500)
  )
    return fail(400, "Use a delivery radius from 0 to 500 miles.");
  let point;
  try {
    point = await lookupPostcode(b.postcode);
  } catch (e) {
    return fail(
      422,
      e instanceof Error ? e.message : "Could not locate that postcode.",
    );
  }
  const { error } = await auth.admin
    .from("discovery_locations")
    .upsert(
      {
        entity_type: b.entity_type,
        entity_id: b.entity_id,
        ...point,
        radius_miles: b.entity_type === "supplier" ? radius : null,
        nationwide: b.entity_type === "supplier" && b.nationwide === true,
      },
      { onConflict: "entity_type,entity_id" },
    );
  return error
    ? fail(500, "Could not save location.")
    : NextResponse.json({ ok: true });
}
