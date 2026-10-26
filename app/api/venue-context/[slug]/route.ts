import { NextResponse } from "next/server";
import { loadPublicVenue } from "@/lib/server/venues";
import { safeImageUrl } from "@/lib/venue-input";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const result = await loadPublicVenue(slug);
    if (!result || result.venue.is_demo)
      return NextResponse.json(
        { error: "Venue unavailable." },
        { status: 404 },
      );
    return NextResponse.json(
      {
        venue: {
          id: `listing:${result.venue.slug}`,
          name: result.venue.name,
          area: result.venue.location,
          kind: "Partner venue",
          gradient: "",
          image: safeImageUrl(result.venue.hero_image) || undefined,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "Venue unavailable." }, { status: 503 });
  }
}
