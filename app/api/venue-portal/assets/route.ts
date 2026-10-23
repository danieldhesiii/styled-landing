import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireVenueAccount, venueUuid } from "@/lib/server/venue-access";
import { readAssetBody, normaliseAssetImage } from "@/lib/server/asset-image";
export async function POST(req: Request) {
  const auth = await requireVenueAccount(req);
  if (!auth.ok) return auth.response;
  try {
    const body = await readAssetBody(req);
    if (!venueUuid(body.venueId))
      return NextResponse.json({ error: "Choose a venue." }, { status: 422 });
    const { data: link, error } = await auth.admin
      .from("venue_users")
      .select("venue_id")
      .eq("venue_id", body.venueId)
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (error) throw error;
    if (!link)
      return NextResponse.json({ error: "Venue not found." }, { status: 404 });
    const { data: allowed, error: limitError } = await auth.admin.rpc(
      "hit_rate_limit",
      {
        p_key: `venue-photo:${auth.user.id}`,
        p_limit: 30,
        p_window_seconds: 3600,
      },
    );
    if (limitError || allowed !== true)
      return NextResponse.json(
        { error: "Please wait before uploading more photos." },
        { status: 429 },
      );
    const image = await normaliseAssetImage(body.image);
    const path = `venues/${body.venueId}/${randomUUID()}.webp`;
    const { error: upload } = await auth.admin.storage
      .from("supplier-assets")
      .upload(path, image, { contentType: "image/webp" });
    if (upload) throw upload;
    const { data: url } = auth.admin.storage
      .from("supplier-assets")
      .getPublicUrl(path);
    return NextResponse.json({ url: url.publicUrl });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Could not upload your photo.",
      },
      { status: 422 },
    );
  }
}
