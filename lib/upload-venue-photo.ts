import { createClient } from "@/lib/supabase/client";

// Browser helper: upload a venue photo and get back a displayable URL.
//
// 1. Sends the file straight to Supabase Storage (no 4.5 MB request limit).
// 2. Asks the server to normalise and record it.
//
// Throws an Error whose message is safe to show the couple.

const MAX_BYTES = 15 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heic",
};

// Browsers often report HEIC photos with an empty or odd type, so fall back to
// the file name. Returns the storage extension, or undefined if unsupported.
function extensionFor(file: File): string | undefined {
  if (EXTENSIONS[file.type]) return EXTENSIONS[file.type];
  const name = file.name.toLowerCase();
  if (name.endsWith(".heic") || name.endsWith(".heif")) return "heic";
  return undefined;
}

export interface UploadedVenuePhoto {
  id: string;
  venueId: string;
  url: string; // signed, expires after an hour
  width: number;
  height: number;
}

// The venue the couple is currently adding photos to. Lives for the page
// session, matching the page's own uploadedImages state.
let currentVenueId: string | undefined;

// append: true adds to the current venue (another angle); otherwise a fresh
// venue is started (a new upload that replaces the previous one).
export async function uploadVenuePhoto(
  file: File,
  opts: { append?: boolean } = {}
): Promise<UploadedVenuePhoto> {
  const ext = extensionFor(file);
  if (!ext) throw new Error("Please choose a JPEG, PNG, WebP or HEIC photo.");
  if (file.size > MAX_BYTES) throw new Error("That photo is over 15 MB. Please choose a smaller one.");

  const supabase = createClient();

  // The guest session is normally ready already; create it if the couple was
  // quicker than the page.
  let { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const res = await supabase.auth.signInAnonymously();
    if (res.error || !res.data.user) throw new Error("Couldn't start your session. Please refresh.");
    user = res.data.user;
  }

  const path = `${user.id}/incoming/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("venue-uploads")
    // The bucket only accepts the types it lists, so name HEIC explicitly.
    .upload(path, file, { contentType: ext === "heic" ? "image/heic" : file.type });
  if (uploadError) throw new Error("Upload failed. Please try again.");

  const res = await fetch("/api/venues/photos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, venueId: opts.append ? currentVenueId : undefined }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.photo?.url) {
    throw new Error(data?.error ?? "Couldn't process that photo. Please try again.");
  }
  currentVenueId = data.photo.venueId;
  return data.photo as UploadedVenuePhoto;
}
