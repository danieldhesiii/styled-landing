import { NextResponse } from "next/server";
import { loadPublicVenues } from "@/lib/server/venues";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return NextResponse.json(
      { venues: await loadPublicVenues() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[public venues]", error);
    return NextResponse.json(
      { error: "We couldn’t load venues. Please try again." },
      { status: 503 },
    );
  }
}
