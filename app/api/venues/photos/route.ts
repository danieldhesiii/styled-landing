import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireUser } from "@/lib/server/session";
import {
  MAX_PHOTOS_PER_USER,
  SIGNED_URL_SECONDS,
  UnreadableImageError,
  VENUE_BUCKET,
  incomingPathPattern,
  normaliseVenuePhoto,
} from "@/lib/server/photos";

// Registers a venue photo the browser has just uploaded to Storage.
//
// The browser uploads the raw file straight to the private bucket at
// "<user id>/incoming/<uuid>.<ext>" (so large photos never pass through a
// serverless request body), then calls this route with that path. We normalise
// it, store the clean copy, record it, and delete the raw file.
//
// Everything runs as the signed-in guest, so row level security and the storage
// folder rules apply; the service key isn't needed here.

function fail(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { user, supabase } = auth;
  const storage = supabase.storage.from(VENUE_BUCKET);

  let body: { path?: unknown; venueId?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail(400, "Invalid request body.");
  }

  const path = typeof body.path === "string" ? body.path : "";
  const venueId = typeof body.venueId === "string" ? body.venueId : null;

  // Only ever touch files inside this guest's own incoming folder.
  if (!incomingPathPattern(user.id).test(path)) {
    return fail(400, "Invalid upload path.");
  }

  // Per-guest cap on stored photos (cost and abuse control).
  const { count } = await supabase
    .from("venue_photos")
    .select("id", { count: "exact", head: true });
  if ((count ?? 0) >= MAX_PHOTOS_PER_USER) {
    await storage.remove([path]);
    return fail(429, `You can add up to ${MAX_PHOTOS_PER_USER} venue photos.`);
  }

  // If adding to an existing venue, confirm it's theirs (row level security
  // hides anyone else's).
  if (venueId) {
    const { data: venue } = await supabase
      .from("venues")
      .select("id")
      .eq("id", venueId)
      .maybeSingle();
    if (!venue) {
      await storage.remove([path]);
      return fail(404, "Venue not found.");
    }
  }

  const { data: raw, error: downloadError } = await storage.download(path);
  if (downloadError || !raw) return fail(404, "Upload not found.");

  let processed;
  try {
    processed = await normaliseVenuePhoto(Buffer.from(await raw.arrayBuffer()));
  } catch (err) {
    await storage.remove([path]);
    if (err instanceof UnreadableImageError) {
      return fail(422, "That file couldn't be read as an image.");
    }
    throw err;
  }

  // Create the venue on the first photo.
  let finalVenueId = venueId;
  if (!finalVenueId) {
    const { data: created, error } = await supabase
      .from("venues")
      .insert({ kind: "upload", name: "My venue" })
      .select("id")
      .single();
    if (error || !created) return fail(500, "Couldn't save your venue.");
    finalVenueId = created.id as string;
  }

  const photoId = randomUUID();
  const storagePath = `${user.id}/${finalVenueId}/${photoId}.jpg`;

  const { error: uploadError } = await storage.upload(storagePath, processed.data, {
    contentType: "image/jpeg",
  });
  if (uploadError) return fail(500, "Couldn't store your photo.");

  const { count: existing } = await supabase
    .from("venue_photos")
    .select("id", { count: "exact", head: true })
    .eq("venue_id", finalVenueId);

  const { error: insertError } = await supabase.from("venue_photos").insert({
    id: photoId,
    venue_id: finalVenueId,
    storage_path: storagePath,
    position: existing ?? 0,
    width: processed.width,
    height: processed.height,
  });
  if (insertError) {
    await storage.remove([storagePath]);
    return fail(500, "Couldn't record your photo.");
  }

  await storage.remove([path]);

  const { data: signed } = await storage.createSignedUrl(storagePath, SIGNED_URL_SECONDS);

  return NextResponse.json(
    {
      ok: true,
      photo: {
        id: photoId,
        venueId: finalVenueId,
        url: signed?.signedUrl ?? null,
        width: processed.width,
        height: processed.height,
      },
    },
    { status: 201 }
  );
}
