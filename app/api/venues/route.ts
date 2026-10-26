import { NextResponse } from "next/server";
import { loadPublicVenues } from "@/lib/server/venues";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    return NextResponse.json(
      {
        venues: await loadPublicVenues(
          new URL(req.url).searchParams.get("date") || undefined,
        ),
      },
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
