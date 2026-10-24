import { requireVenueAccount } from "@/lib/server/venue-access";
import { notifyVenueRequest } from "@/lib/server/venue-notify";
import { NextResponse, after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIpHash } from "@/lib/server/limits";
import { validateVenueEnquiry } from "@/lib/venue-input";
const fail = (status: number, error: string) =>
  NextResponse.json({ error }, { status });
export async function POST(req: Request) {
  const auth = await requireVenueAccount(req);
  if (!auth.ok) return auth.response;
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
    const result = validateVenueEnquiry(
      { ...body, email: auth.user.email },
      today,
    );
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
    if (result.value.request_kind === "booking") {
      const { data: booked, error: bookedError } = await admin
        .from("venue_enquiries")
        .select("id")
        .eq("venue_id", venue.id)
        .lte("booking_start", result.value.booking_end!)
        .gte("booking_end", result.value.booking_start!)
        .eq("request_kind", "booking")
        .eq("status", "booked")
        .limit(1);
      if (bookedError) throw bookedError;
      if (booked?.length)
        return fail(
          409,
          "Part of that venue hire period is already booked. Please choose another period.",
        );
    }
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
    if (result.value.request_kind === "booking") {
      const { data: blocked, error: blockError } = await admin
        .from("venue_date_blocks")
        .select("day")
        .eq("venue_id", venue.id)
        .gte("day", result.value.booking_start!)
        .lte("day", result.value.booking_end!)
        .limit(1);
      if (blockError) throw blockError;
      if (blocked?.length)
        return fail(
          409,
          "Part of that venue hire period is unavailable. Please choose another period.",
        );
    }
    const { data: request, error } = await admin
      .from("venue_enquiries")
      .insert({
        ...result.value,
        owner_user_id: auth.user.id,
        next_actor: "venue",
      })
      .select("id")
      .single();
    if (error) throw error;
    after(() => notifyVenueRequest(request.id, "new"));
    return NextResponse.json({ ok: true, id: request.id }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "message" in error &&
      /hire period|already booked|date is blocked/i.test(String(error.message)))
      return fail(409, "Part of that venue hire period is no longer available. Please choose another period.");
    console.error("[venue-enquiries]", error);
    return fail(
      503,
      "We couldn’t send your enquiry. Please try again shortly.",
    );
  }
}

export async function GET(req: Request) {
  const auth = await requireVenueAccount(req);
  if (!auth.ok) return auth.response;
  const { data, error } = await auth.admin
    .from("venue_enquiries")
    .select(
      "id,venue_id,preferred_date,booking_start,booking_end,viewing_time,next_actor,request_kind,guest_count,status,message,response,alternative_dates,responded_at,created_at,venue_listings(name,slug)",
    )
    .eq("owner_user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return fail(503, "Could not load your venue requests.");
  return NextResponse.json(
    { requests: data },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function DELETE(req: Request) {
  const auth = await requireVenueAccount(req);
  if (!auth.ok) return auth.response;
  const id = new URL(req.url).searchParams.get("id");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id))
    return fail(400, "Choose a request.");
  const { data, error } = await auth.admin
    .from("venue_enquiries")
    .update({ status: "cancelled", next_actor: "none" })
    .eq("id", id)
    .eq("owner_user_id", auth.user.id)
    .in("status", ["new", "contacted"])
    .select("id")
    .maybeSingle();
  if (error) return fail(503, "Could not cancel your request.");
  if (!data)
    return fail(
      409,
      "Only an unconfirmed request can be cancelled here. Contact support@styleduk.com for help.",
    );
  return NextResponse.json({ ok: true });
}
