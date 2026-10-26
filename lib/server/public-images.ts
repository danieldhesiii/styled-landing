import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createAnonClient } from "@/lib/supabase/anon";
import { env } from "@/lib/server/env";

// Only bundled pictures and our own public asset bucket can become model input.
// Display URLs never grant the server permission to fetch arbitrary hosts.
export async function readPublicImage(image: string): Promise<Buffer> {
  if (image.startsWith("/img/")) {
    const root = path.resolve(process.cwd(), "public/img");
    const file = path.resolve(
      process.cwd(),
      "public",
      decodeURIComponent(image.slice(1)),
    );
    if (!file.startsWith(root + path.sep))
      throw new Error("Invalid image path.");
    return readFile(file);
  }
  const url = new URL(image),
    base = new URL(env.supabaseUrl);
  const prefix = "/storage/v1/object/public/supplier-assets/";
  if (
    url.protocol !== "https:" ||
    url.origin !== base.origin ||
    !url.pathname.startsWith(prefix)
  )
    throw new Error("Use an uploaded image for the visualiser.");
  const objectPath = decodeURIComponent(url.pathname.slice(prefix.length));
  const { data, error } = await createAnonClient()
    .storage.from("supplier-assets")
    .download(objectPath);
  if (error || !data || data.size > 10 * 1024 * 1024)
    throw new Error("Image unavailable.");
  return Buffer.from(await data.arrayBuffer());
}
