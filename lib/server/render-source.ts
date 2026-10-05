import type { SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { getVenue } from "@/lib/styles";
import { env } from "@/lib/server/env";
import { VENUE_BUCKET, normaliseVenuePhoto } from "@/lib/server/photos";

// Finds the pictures a render starts from, always on the server so the browser
// can't point us at arbitrary files. Three sources:
//
//   - a refinement: the parent render's image (the guest's own, via RLS)
//   - the couple's uploaded photos: the primary view plus other angles
//   - otherwise the chosen sample venue's image

export interface BaseImages {
  images: Buffer[]; // [0] is the view to restyle; the rest are references
  width: number; // of images[0]
  height: number;
  dbVenueId: string | null; // set when it came from the couple's own upload
  photoIds: string[]; // venue_photos used, in the order sent
}

async function describe(images: Buffer[], extra: Pick<BaseImages, "dbVenueId" | "photoIds">): Promise<BaseImages> {
  const meta = await sharp(images[0]).metadata();
  return { images, width: meta.width ?? 1024, height: meta.height ?? 1024, ...extra };
}

export async function loadUploadedPhotos(opts: {
  supabase: SupabaseClient; // runs as the guest, so RLS limits it to their data
  primaryIndex: number;
}): Promise<BaseImages | null> {
  const { supabase } = opts;
  const { data: venue } = await supabase
    .from("venues")
    .select("id")
    .eq("kind", "upload")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!venue) return null;

  const { data: photos } = await supabase
    .from("venue_photos")
    .select("id, storage_path")
    .eq("venue_id", venue.id)
    .order("position", { ascending: true });
  if (!photos || photos.length === 0) return null;

  // The couple's chosen view first, then the others in upload order. Extra
  // photos beyond the limit are dropped (they cost input tokens).
  const primary = Math.min(Math.max(0, Math.floor(opts.primaryIndex) || 0), photos.length - 1);
  const ordered = [photos[primary], ...photos.filter((_, i) => i !== primary)].slice(
    0,
    env.maxReferencePhotos
  );

  const buffers: Buffer[] = [];
  for (const p of ordered) {
    const { data: blob } = await supabase.storage.from(VENUE_BUCKET).download(p.storage_path);
    if (!blob) return null;
    buffers.push(Buffer.from(await blob.arrayBuffer()));
  }
  return describe(buffers, { dbVenueId: venue.id as string, photoIds: ordered.map((p) => p.id as string) });
}

export async function loadSampleVenue(opts: { origin: string; sampleVenueId: string }): Promise<BaseImages> {
  const sample = getVenue(opts.sampleVenueId);
  if (!sample.image) throw new Error(`Sample venue ${sample.id} has no image`);
  const res = await fetch(new URL(sample.image, opts.origin));
  if (!res.ok) throw new Error(`Couldn't load sample venue image (${res.status})`);
  const processed = await normaliseVenuePhoto(Buffer.from(await res.arrayBuffer()));
  return describe([processed.data], { dbVenueId: null, photoIds: [] });
}

export interface ParentRender {
  id: string;
  briefId: string;
  depth: number;
  styleId: string | null;
  sampleVenueId: string | null;
  base: BaseImages;
}

// The image a refinement edits. Returns null if it isn't the guest's, or isn't
// a finished render.
export async function loadParentRender(opts: {
  supabase: SupabaseClient;
  parentId: string;
}): Promise<ParentRender | null> {
  const { data: parent } = await opts.supabase
    .from("renders")
    .select("id, brief_id, depth, style_id, sample_venue_id, image_path, status")
    .eq("id", opts.parentId)
    .maybeSingle();
  if (!parent || parent.status !== "succeeded" || !parent.image_path) return null;

  const { data: blob } = await opts.supabase.storage.from("renders").download(parent.image_path);
  if (!blob) return null;

  return {
    id: parent.id as string,
    briefId: parent.brief_id as string,
    depth: parent.depth as number,
    styleId: (parent.style_id as string | null) ?? null,
    sampleVenueId: (parent.sample_venue_id as string | null) ?? null,
    base: await describe([Buffer.from(await blob.arrayBuffer())], { dbVenueId: null, photoIds: [] }),
  };
}
