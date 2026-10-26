import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { normaliseAssetImage } from "@/lib/server/asset-image";
import { requireVendor } from "@/lib/server/vendor";
export async function POST(req: Request) {
  const auth = await requireVendor(req);
  if (!auth.ok) return auth.response;
  const fail = (status: number, error: string) =>
    NextResponse.json({ error }, { status });
  try {
    const { data: allowed, error: limitError } = await auth.admin.rpc(
      "hit_rate_limit",
      {
        p_key: `supplier-assets:${auth.user.id}`,
        p_limit: 30,
        p_window_seconds: 3600,
      },
    );
    if (limitError || allowed !== true)
      return fail(429, "Please wait before uploading another image.");
    if (Number(req.headers.get("content-length")) > 7500000)
      return fail(413, "Choose an image smaller than 5 MB.");
    const text = await req.text();
    if (text.length > 7500000)
      return fail(413, "Choose an image smaller than 5 MB.");
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      return fail(400, "Invalid request.");
    }
    if (
      !body ||
      !["logo", "product"].includes(body.kind) ||
      typeof body.image !== "string"
    )
      return fail(422, "Choose a logo or product image.");
    if (body.kind === "product") {
      if (typeof body.productId !== "string")
        return fail(422, "Choose a product.");
      const { data, error } = await auth.admin
        .from("products")
        .select("id")
        .eq("id", body.productId)
        .eq("supplier_id", auth.supplierId)
        .maybeSingle();
      if (error) return fail(503, "Could not check product ownership.");
      if (!data) return fail(404, "That product is not yours.");
    }
    let image;
    try {
      image = await normaliseAssetImage(
        body.image,
        body.kind === "logo" ? 800 : 2000,
      );
    } catch (e) {
      return fail(422, (e as Error).message);
    }
    const path = `${auth.supplierId}/${body.kind}-${randomUUID()}.webp`;
    const { error: uploadError } = await auth.admin.storage
      .from("supplier-assets")
      .upload(path, image, { contentType: "image/webp", upsert: false });
    if (uploadError)
      return fail(503, "Could not upload the image. Please try again.");
    const { data: url } = auth.admin.storage
      .from("supplier-assets")
      .getPublicUrl(path);
    const q =
      body.kind === "logo"
        ? auth.admin
            .from("suppliers")
            .update({ logo_url: url.publicUrl })
            .eq("id", auth.supplierId)
        : auth.admin
            .from("products")
            .update({ image: url.publicUrl })
            .eq("id", body.productId)
            .eq("supplier_id", auth.supplierId);
    const { error: saveError } = await q.select("id").single();
    if (saveError) {
      await auth.admin.storage.from("supplier-assets").remove([path]);
      return fail(503, "Could not attach the image. Please try again.");
    }
    return NextResponse.json({ ok: true, url: url.publicUrl });
  } catch (error) {
    console.error("[vendor/assets]", error);
    return fail(503, "Upload unavailable. Please try again.");
  }
}
