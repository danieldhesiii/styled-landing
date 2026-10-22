import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireStaff } from "@/lib/server/staff";
import { normaliseAssetImage, readAssetBody } from "@/lib/server/asset-image";
export async function POST(req: Request) {
  const auth = await requireStaff(req);
  if (!auth.ok) return auth.response;
  try {
    const body = await readAssetBody(req);
    if (
      typeof body.venueId !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(body.venueId) ||
      !["hero", "gallery"].includes(String(body.kind))
    )
      return NextResponse.json(
        { error: "Choose a venue and photo type." },
        { status: 422 },
      );
    const { data: venue, error } = await auth.admin
      .from("venue_listings")
      .select("id,gallery_images")
      .eq("id", body.venueId)
      .maybeSingle();
    if (error) throw error;
    if (!venue)
      return NextResponse.json({ error: "Venue not found." }, { status: 404 });
    if (body.kind === "gallery" && venue.gallery_images.length >= 20)
      return NextResponse.json(
        { error: "A gallery can contain up to 20 images." },
        { status: 422 },
      );
    let image;
    try {
      image = await normaliseAssetImage(body.image);
    } catch (e) {
      return NextResponse.json(
        { error: (e as Error).message },
        { status: 422 },
      );
    }
    const path = `venues/${venue.id}/${randomUUID()}.webp`;
    const { error: upload } = await auth.admin.storage
      .from("supplier-assets")
      .upload(path, image, { contentType: "image/webp" });
    if (upload) throw upload;
    const { data: url } = auth.admin.storage
      .from("supplier-assets")
      .getPublicUrl(path);
    const patch =
      body.kind === "hero"
        ? { hero_image: url.publicUrl }
        : { gallery_images: [...venue.gallery_images, url.publicUrl] };
    const { error: save } = await auth.admin
      .from("venue_listings")
      .update(patch)
      .eq("id", venue.id);
    if (save) {
      await auth.admin.storage.from("supplier-assets").remove([path]);
      throw save;
    }
    return NextResponse.json({ ok: true, url: url.publicUrl });
  } catch (error) {
    console.error("[admin/venue-assets]", error);
    return NextResponse.json(
      { error: "Could not save this photo. Please try again." },
      { status: 503 },
    );
  }
}
