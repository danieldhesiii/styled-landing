import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const admin = createAdminClient();
  const { data: venue, error } = await admin
    .from("venue_listings")
    .select("id")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  if (error)
    return NextResponse.json({ error: "Dates unavailable." }, { status: 503 });
  if (!venue)
    return NextResponse.json({ error: "Venue not found." }, { status: 404 });
  const { data, error: datesError } = await admin
    .from("venue_enquiries")
    .select("preferred_date")
    .eq("venue_id", venue.id)
    .eq("status", "booked")
    .gte("preferred_date", new Date().toISOString().slice(0, 10));
  const { data: blocks, error: blockError } = await admin
    .from("venue_date_blocks")
    .select("day")
    .eq("venue_id", venue.id)
    .gte("day", new Date().toISOString().slice(0, 10));
  if (datesError || blockError)
    return NextResponse.json({ error: "Dates unavailable." }, { status: 503 });
  return NextResponse.json(
    {
      blockedDates: [
        ...new Set(
          [
            ...(data ?? []).map((r) => r.preferred_date),
            ...(blocks ?? []).map((b) => b.day),
          ].filter(Boolean),
        ),
      ],
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
