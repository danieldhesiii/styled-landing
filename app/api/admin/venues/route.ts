import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/server/staff";
import { parseVenue, parseVenuePackage } from "@/lib/venue-admin-input";
const fail = (status: number, error: string) =>
  NextResponse.json({ error }, { status });
const uuid = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export async function GET(req: Request) {
  const auth = await requireStaff(req);
  if (!auth.ok) return auth.response;
  const id = new URL(req.url).searchParams.get("id");
  if (id && !uuid(id)) return fail(400, "Invalid venue.");
  if (!id) {
    const { data, error } = await auth.admin
      .from("venue_listings")
      .select("*")
      .order("name");
    if (error) return fail(500, "Could not load venues.");
    return NextResponse.json({ venues: data });
  }
  const [v, p, e] = await Promise.all([
    auth.admin.from("venue_listings").select("*").eq("id", id).maybeSingle(),
    auth.admin
      .from("venue_packages")
      .select("*")
      .eq("venue_id", id)
      .order("sort_order"),
    auth.admin
      .from("venue_enquiries")
      .select("*")
      .eq("venue_id", id)
      .order("created_at", { ascending: false }),
  ]);
  if (v.error || p.error || e.error)
    return fail(500, "Could not load venue details.");
  if (!v.data) return fail(404, "Venue not found.");
  return NextResponse.json({
    venue: v.data,
    packages: p.data,
    enquiries: e.data,
  });
}
export async function POST(req: Request) {
  const auth = await requireStaff(req);
  if (!auth.ok) return auth.response;
  let body;
  try {
    const text = await req.text();
    if (text.length > 50000) return fail(413, "Request too large.");
    body = JSON.parse(text);
  } catch {
    return fail(400, "Invalid request.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body))
    return fail(400, "Invalid request.");
  try {
    if (body.action === "saveVenue") {
      const value = parseVenue(body);
      if (body.id && !uuid(body.id)) return fail(400, "Invalid venue.");
      const q = body.id
        ? auth.admin.from("venue_listings").update(value).eq("id", body.id)
        : auth.admin.from("venue_listings").insert(value);
      const { data, error } = await q.select("id").single();
      if (error)
        return fail(
          error.code === "23505" ? 409 : 500,
          error.code === "23505"
            ? "This URL slug is already in use."
            : "Could not save venue.",
        );
      return NextResponse.json({ ok: true, id: data.id });
    }
    if (!uuid(body.venueId)) return fail(400, "Invalid venue.");
    if (body.action === "savePackage") {
      if (body.id && !uuid(body.id)) return fail(400, "Invalid package.");
      const value = parseVenuePackage(body);
      const q = body.id
        ? auth.admin
            .from("venue_packages")
            .update(value)
            .eq("id", body.id)
            .eq("venue_id", body.venueId)
        : auth.admin
            .from("venue_packages")
            .insert({ ...value, venue_id: body.venueId });
      const { error } = await q.select("id").single();
      if (error) return fail(500, "Could not save package.");
    } else if (body.action === "deletePackage") {
      if (!uuid(body.id)) return fail(400, "Invalid package.");
      const { error } = await auth.admin
        .from("venue_packages")
        .delete()
        .eq("id", body.id)
        .eq("venue_id", body.venueId);
      if (error)
        return fail(
          409,
          "This package is linked to an enquiry and cannot be deleted.",
        );
    } else if (body.action === "setEnquiryStatus") {
      if (
        !uuid(body.id) ||
        !["new", "contacted", "booked", "declined"].includes(body.status)
      )
        return fail(400, "Invalid enquiry status.");
      const { error } = await auth.admin
        .from("venue_enquiries")
        .update({ status: body.status })
        .eq("id", body.id)
        .eq("venue_id", body.venueId)
        .select("id")
        .single();
      if (error) return fail(500, "Could not update enquiry.");
    } else return fail(400, "Unknown action.");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(422, e instanceof Error ? e.message : "Check your input.");
  }
}
