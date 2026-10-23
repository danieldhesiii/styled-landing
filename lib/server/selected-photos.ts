import type { SupabaseClient } from "@supabase/supabase-js";

/** Only private photos explicitly named by the signed-in owner, in request order. */
export async function loadSelectedPhotoBuffers(
  supabase: SupabaseClient,
  userId: string,
  ids: string[],
) {
  if (!ids.length) return { rows: [], buffers: [] as Buffer[] };
  const { data, error } = await supabase
    .from("venue_photos")
    .select("id,storage_path,venue_id")
    .eq("owner_id", userId)
    .in("id", ids);
  if (error || !data || data.length !== ids.length)
    throw Error("One of your selected photos is no longer available.");
  const rows = ids.map((id) => data.find((p) => p.id === id));
  if (rows.some((p) => !p))
    throw Error("One of your selected photos is no longer available.");
  const buffers: Buffer[] = [];
  for (const row of rows) {
    const { data: blob, error: downloadError } = await supabase.storage
      .from("venue-uploads")
      .download(row!.storage_path);
    if (downloadError || !blob)
      throw Error("Could not open a selected private photo.");
    buffers.push(Buffer.from(await blob.arrayBuffer()));
  }
  return { rows: rows.map((p) => p!), buffers };
}
