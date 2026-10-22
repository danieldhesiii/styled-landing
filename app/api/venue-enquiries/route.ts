import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIpHash } from "@/lib/server/limits";
import { validateVenueEnquiry } from "@/lib/venue-input";
const fail = (status: number, error: string) =>
  NextResponse.json({ error }, { status });
export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json"))
    return fail(415, "Please send JSON.");
  if (Number(req.headers.get("content-length")) > 20000)
    return fail(413, "Please shorten your enquiry.");
  try {
    const text = await req.text();
    if (text.length > 20000) return fail(413, "Please shorten your enquiry.");
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      return fail(400, "Invalid request.");
    }
    if (!body || typeof body !== "object" || Array.isArray(body))
      return fail(400, "Invalid request.");
    if (body.company) return NextResponse.json({ ok: true }, { status: 201 });
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/London",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const result = validateVenueEnquiry(body, today);
    if (!result.value) return fail(422, result.error!);
    const admin = createAdminClient();
    const { data: allowed, error: limitError } = await admin.rpc(
      "hit_rate_limit",
      {
        p_key: `venue-enquiry:${clientIpHash(req)}`,
        p_limit: 5,
        p_window_seconds: 3600,
      },
    );
    if (limitError)
      return fail(
        503,
        "Enquiries are temporarily unavailable. Please try again later.",
      );
    if (allowed !== true)
      return fail(429, "Please wait before sending another enquiry.");
    const { data: venue, error: venueError } = await admin
      .from("venue_listings")
      .select("id,capacity_min,capacity_max")
      .eq("id", result.value.venue_id)
      .eq("active", true)
      .maybeSingle();
    if (venueError) throw venueError;
    if (!venue)
      return fail(404, "This venue is not currently accepting enquiries.");
    if (
      (venue.capacity_min && result.value.guest_count < venue.capacity_min) ||
      (venue.capacity_max && result.value.guest_count > venue.capacity_max)
    )
      return fail(422, "Your guest count is outside this venue’s capacity.");
    const { data: booked, error: bookedError } = await admin
      .from("venue_enquiries")
      .select("id")
      .eq("venue_id", venue.id)
      .eq("preferred_date", result.value.preferred_date)
      .eq("status", "booked")
      .limit(1);
    if (bookedError) throw bookedError;
    if (booked?.length)
      return fail(
        409,
        "That date is no longer available. Please choose another date.",
      );
    if (result.value.package_id) {
      const { data: p, error } = await admin
        .from("venue_packages")
        .select("id")
        .eq("id", result.value.package_id)
        .eq("venue_id", venue.id)
        .maybeSingle();
      if (error) throw error;
      if (!p) return fail(422, "Please select a package for this venue.");
    }
    const { error } = await admin.from("venue_enquiries").insert(result.value);
    if (error) throw error;
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("[venue-enquiries]", error);
    return fail(
      503,
      "We couldn’t send your enquiry. Please try again shortly.",
    );
  }
}
