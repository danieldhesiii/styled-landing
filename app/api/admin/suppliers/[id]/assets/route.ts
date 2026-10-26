import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireStaff } from "@/lib/server/staff";
import { normaliseAssetImage, readAssetBody } from "@/lib/server/asset-image";
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireStaff(req);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id))
    return NextResponse.json({ error: "Invalid supplier." }, { status: 400 });
  try {
    const { data: supplier, error } = await auth.admin
      .from("suppliers")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!supplier)
      return NextResponse.json(
        { error: "Supplier not found." },
        { status: 404 },
      );
    const body = await readAssetBody(req);
    let image;
    try {
      image = await normaliseAssetImage(body.image, 800);
    } catch (e) {
      return NextResponse.json(
        { error: (e as Error).message },
        { status: 422 },
      );
    }
    const path = `${id}/logo-${randomUUID()}.webp`;
    const { error: upload } = await auth.admin.storage
      .from("supplier-assets")
      .upload(path, image, { contentType: "image/webp" });
    if (upload) throw upload;
    const { data: url } = auth.admin.storage
      .from("supplier-assets")
      .getPublicUrl(path);
    const { error: save } = await auth.admin
      .from("suppliers")
      .update({ logo_url: url.publicUrl })
      .eq("id", id);
    if (save) {
      await auth.admin.storage.from("supplier-assets").remove([path]);
      throw save;
    }
    return NextResponse.json({ ok: true, url: url.publicUrl });
  } catch (error) {
    console.error("[admin/supplier-assets]", error);
    return NextResponse.json(
      { error: "Could not save the logo. Please try again." },
      { status: 503 },
    );
  }
}
