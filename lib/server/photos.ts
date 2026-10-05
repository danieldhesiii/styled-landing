import sharp from "sharp";
import convert from "heic-convert";

// Venue photo rules, shared by the upload routes.
export const VENUE_BUCKET = "venue-uploads";
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // matches the bucket limit
export const MAX_PHOTOS_PER_USER = 20;
export const MAX_EDGE_PX = 2048;
export const SIGNED_URL_SECONDS = 60 * 60;

// Where the browser drops a raw upload before the server has processed it.
export function incomingPathPattern(userId: string) {
  return new RegExp(`^${userId}/incoming/[0-9a-f-]{36}\\.(jpg|png|webp|heic)$`);
}

export class UnreadableImageError extends Error {}

// HEIC/HEIF is what iPhones save by default. sharp's prebuilt binaries can't
// decode it, so we detect it by content (not file name or declared type, both
// of which browsers get wrong) and convert it to JPEG first.
const HEIC_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"]);

function isHeic(buf: Buffer) {
  return buf.length > 12 && buf.toString("ascii", 4, 8) === "ftyp" && HEIC_BRANDS.has(buf.toString("ascii", 8, 12));
}

async function heicToJpeg(buf: Buffer): Promise<Buffer> {
  const out = await convert({ buffer: new Uint8Array(buf), format: "JPEG", quality: 0.95 });
  return Buffer.from(out);
}

// Normalise any accepted upload into one predictable file:
//  - apply the EXIF orientation, then drop all metadata (GPS location, device
//    details) because sharp strips it unless asked to keep it
//  - cap the long edge so later image-model calls stay fast and cheap
//  - always output JPEG
export async function normaliseVenuePhoto(original: Buffer) {
  try {
    let input = original;
    if (isHeic(original)) {
      try {
        input = await heicToJpeg(original);
      } catch {
        // Some "mif1" files hold AVIF, which sharp reads natively; let it try.
      }
    }

    const { data, info } = await sharp(input, {
      limitInputPixels: 80_000_000,
      failOn: "error",
    })
      .rotate()
      .resize({
        width: MAX_EDGE_PX,
        height: MAX_EDGE_PX,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });

    return { data, width: info.width, height: info.height };
  } catch (err) {
    throw new UnreadableImageError(
      err instanceof Error ? err.message : "Unreadable image"
    );
  }
}
