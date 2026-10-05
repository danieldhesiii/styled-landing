import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/session";
import { VENUE_BUCKET } from "@/lib/server/photos";

// Remove one of the guest's venue photos (file and record).
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { supabase } = auth;
  const { id } = await params;

  // Row level security means this only finds the guest's own photo.
  const { data: photo } = await supabase
    .from("venue_photos")
    .select("id, storage_path")
    .eq("id", id)
    .maybeSingle();

  if (!photo) {
    return NextResponse.json({ ok: false, error: "Photo not found." }, { status: 404 });
  }

  await supabase.storage.from(VENUE_BUCKET).remove([photo.storage_path]);
  const { error } = await supabase.from("venue_photos").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ ok: false, error: "Couldn't delete the photo." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
