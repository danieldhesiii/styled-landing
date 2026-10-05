import { NextResponse } from "next/server";
import { loadCatalogue } from "@/lib/server/catalogue";

// Never prerendered at build time: the catalogue changes when suppliers do.
export const dynamic = "force-dynamic";

// The live catalogue, in the shape the design studio already uses. Public (it's
// the shop window). Briefly cached at the edge; quotes and orders never use this
// cached copy: they read the database fresh and re-check prices.
export async function GET() {
  try {
    const items = await loadCatalogue();
    return NextResponse.json(
      { ok: true, items },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch (err) {
    console.error("[catalogue]", err);
    return NextResponse.json({ ok: false, error: "Couldn't load the catalogue." }, { status: 500 });
  }
}
