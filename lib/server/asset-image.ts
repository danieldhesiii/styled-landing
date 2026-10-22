import "server-only";
import sharp from "sharp";
export async function normaliseAssetImage(value: unknown, size = 2000) {
  if (
    typeof value !== "string" ||
    !/^data:image\/(jpeg|png|webp);base64,/.test(value)
  )
    throw new Error("Use a JPEG, PNG or WebP image.");
  const buffer = Buffer.from(value.split(",")[1], "base64");
  if (!buffer.length || buffer.length > 5 * 1024 * 1024)
    throw new Error("Choose an image smaller than 5 MB.");
  try {
    return await sharp(buffer, { limitInputPixels: 40000000 })
      .rotate()
      .resize({
        width: size,
        height: size,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    throw new Error("This image could not be read. Try a different photo.");
  }
}
export async function readAssetBody(req: Request) {
  if (Number(req.headers.get("content-length")) > 7500000)
    throw new Error("Choose an image smaller than 5 MB.");
  const text = await req.text();
  if (text.length > 7500000)
    throw new Error("Choose an image smaller than 5 MB.");
  const value = JSON.parse(text);
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid request.");
  return value as Record<string, unknown>;
}
