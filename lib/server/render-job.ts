import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/server/env";
import { editImage, ImageModelError } from "@/lib/server/image-model";
import { sanitiseErrorText, type RenderErrorKind } from "@/lib/server/render-errors";

// The slow part of a render: call the image model, store the picture, record the
// outcome. Runs after the HTTP response has been sent (see app/api/generate), so
// it uses the service role and never throws: every outcome ends in a row update.

export async function runRenderJob(opts: {
  admin: SupabaseClient;
  renderId: string;
  userId: string;
  images: Buffer[];
  prompt: string;
  size: string;
}) {
  const { admin, renderId, userId } = opts;

  const finish = (patch: Record<string, unknown>) =>
    admin
      .from("renders")
      .update({ ...patch, completed_at: new Date().toISOString() })
      .eq("id", renderId)
      .then(({ error }) => {
        if (error) console.error(`[render ${renderId}] couldn't record outcome:`, error);
      });

  try {
    const result = await editImage({ images: opts.images, prompt: opts.prompt, size: opts.size });

    // Confirm the model really returned an image before storing it.
    await sharp(result.image).metadata();

    const imagePath = `${userId}/${renderId}.jpg`;
    const { error: uploadError } = await admin.storage
      .from("renders")
      .upload(imagePath, result.image, { contentType: "image/jpeg" });
    if (uploadError) throw new Error(`storing render: ${uploadError.message}`);

    await finish({
      status: "succeeded",
      image_path: imagePath,
      usage: result.usage,
      cost_pence: env.renderCostPence,
    });
  } catch (err) {
    console.error(`[render ${renderId}] failed:`, err);
    const kind: RenderErrorKind =
      err instanceof ImageModelError
        ? err.kind === "moderation"
          ? "moderation"
          : err.kind === "busy"
            ? "busy"
            : "failed"
        : "failed";
    await finish({
      status: "failed",
      error_kind: kind,
      error: sanitiseErrorText(err instanceof Error ? err.message : String(err)),
    });
  }
}
