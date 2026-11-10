import { demoPreviewAllowed } from "@/lib/server/development-request-catalogue";
import {venueCatalogue} from "@/lib/server/venue-catalogue";
import { NextResponse } from "next/server";
import { loadCatalogue } from "@/lib/server/catalogue";
import { crescentMoonDemoCatalogue } from "@/lib/crescent-moon-demo-catalogue";

// Never prerendered at build time: the catalogue changes when suppliers do.
export const dynamic = "force-dynamic";

function isProdprogressDemoHost(req: Request) {
  return demoPreviewAllowed(req);
}

// The live catalogue, in the shape the design studio already uses. Public (it's
// the shop window). Briefly cached at the edge; quotes and orders never use this
// cached copy: they read the database fresh and re-check prices.
export async function GET(req:Request) {
  try {
    const items = await loadCatalogue();
    const slug=new URL(req.url).searchParams.get("venue");
    if(slug){const scoped=await venueCatalogue(slug,items);return NextResponse.json({ok:true,...scoped},{headers:{"Cache-Control":"no-store"}});}
    return NextResponse.json(
      { ok: true, items, demoItems: isProdprogressDemoHost(req) ? crescentMoonDemoCatalogue() : [] },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch (err) {
    if(new URL(req.url).searchParams.has("venue"))return NextResponse.json({ok:false,error:err instanceof Error?err.message:"Could not load this venue’s suppliers."},{status:422});
    console.error("[catalogue]", err);
    return NextResponse.json({ ok: false, error: "Couldn't load the catalogue." }, { status: 500 });
  }
}
