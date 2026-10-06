import { NextResponse, after } from "next/server";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { requireUser } from "@/lib/server/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/server/env";
import { loadItemsById } from "@/lib/server/catalogue";
import { STYLES, getStyle } from "@/lib/styles";
import {
  buildRefinePrompt,
  buildRenderPrompt,
  cleanBrief,
  MAX_ITEMS,
} from "@/lib/server/render-prompt";
import { sizeFor } from "@/lib/server/image-model";
import {
  loadParentRender,
  loadSampleVenue,
  loadUploadedPhotos,
  type BaseImages,
} from "@/lib/server/render-source";
import { checkRenderLimits, clientIpHash } from "@/lib/server/limits";
import { runRenderJob } from "@/lib/server/render-job";

// The model call can run for a few minutes after we've replied.
export const maxDuration = 300;

// POST /api/generate
//
// Starts a render and returns immediately with 202 and a renderId. The slow part
// (calling the image model, storing the picture) runs after the response; the
// studio polls GET /api/renders/[id] for the result.
//
// Two kinds of request:
//   - New look: styled from the couple's photos (primary view + other angles as
//     reference) or a sample venue, using the chosen style, items and wishes.
//   - Refinement: pass parentRenderId to edit an earlier render ("move the arch
//     to the left"). Only the requested change is made.
//
// Security: the browser only names things (a style, catalogue ids, a photo index,
// a render id, free text). Photos and parent renders are looked up server-side as
// the guest, so they can only ever be the guest's own; items come from the
// catalogue; spend limits are enforced here.

interface GenerateRequest {
  prompt?: unknown;
  styleId?: unknown;
  venueId?: unknown;
  images?: unknown;
  itemIds?: unknown;
  guestCount?: unknown;
  primaryIndex?: unknown;
  parentRenderId?: unknown;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { user, supabase } = auth;

  let body: GenerateRequest = {};
  try {
    body = await req.json();
  } catch {
    return fail(400, "Invalid request body.");
  }

  const styleId = typeof body.styleId === "string" ? body.styleId : "garden_romance";
  if (!STYLES.some((s) => s.id === styleId)) return fail(400, "Unknown style.");
  const style = getStyle(styleId);

  const brief = cleanBrief(body.prompt);
  const sampleVenueId = typeof body.venueId === "string" ? body.venueId : "";
  const useUpload = Array.isArray(body.images) && body.images.length > 0;
  const primaryIndex = typeof body.primaryIndex === "number" ? body.primaryIndex : 0;
  const guestCount = Math.min(
    500,
    Math.max(1, Math.round(typeof body.guestCount === "number" ? body.guestCount : 80))
  );
  const parentRenderId = typeof body.parentRenderId === "string" ? body.parentRenderId : null;
  if (parentRenderId && !UUID.test(parentRenderId)) return fail(400, "Invalid render id.");

  const itemIds = Array.isArray(body.itemIds)
    ? body.itemIds.filter((x): x is string => typeof x === "string").slice(0, MAX_ITEMS)
    : [];

  // No image key configured: keep the studio usable with the illustrative render.
  if (!env.openaiApiKeyIfSet) {
    console.warn("[generate] OPENAI_API_KEY not set; returning placeholder render.");
    return NextResponse.json({
      ok: true,
      pending: true,
      imageUrl: style.render ?? null,
      message:
        "Render engine not connected yet. Showing an illustrative look for now — your brief has been captured.",
    });
  }

  // Catalogue items come from the database by id; unknown or withdrawn ids are ignored.
  let items;
  try {
    const found = await loadItemsById(itemIds);
    items = itemIds.map((id) => found.get(id)).filter((i): i is NonNullable<typeof i> => !!i);
  } catch (err) {
    console.error("[generate] couldn't load catalogue items:", err);
    return fail(500, "Couldn't start your render.");
  }

  const admin = createAdminClient();
  const ipHash = clientIpHash(req);

  const limited = await checkRenderLimits({ supabase, admin, userId: user.id, ipHash });
  if (limited) return fail(limited.status, limited.error);

  // ---- Work out what to edit, and the instruction to give the model.
  let base: BaseImages;
  let prompt: string;
  let depth = 0;
  let briefId: string | null = null;
  let parentId: string | null = null;
  let renderStyleId = styleId;
  let renderSampleVenueId: string | null = null;

  if (parentRenderId) {
    const parent = await loadParentRender({ supabase, parentId: parentRenderId });
    if (!parent) return fail(404, "That render couldn't be found. Please start a new look.");
    if (parent.depth + 1 > env.maxRefinements) {
      return fail(
        422,
        `You've refined this look ${env.maxRefinements} times, which is as far as it can go before quality drops. Start a new look from your venue photo.`
      );
    }
    base = parent.base;
    prompt = buildRefinePrompt({ brief, items });
    depth = parent.depth + 1;
    briefId = parent.briefId;
    parentId = parent.id;
    renderStyleId = parent.styleId ?? styleId;
    renderSampleVenueId = parent.sampleVenueId;
  } else {
    try {
      const uploaded = useUpload ? await loadUploadedPhotos({ supabase, primaryIndex }) : null;
      // Fall back to the sample venue if the upload can't be found.
      base = uploaded ?? (await loadSampleVenue({ origin: new URL(req.url).origin, sampleVenueId }));
      if (!uploaded) renderSampleVenueId = sampleVenueId || null;
    } catch (err) {
      console.error("[generate] couldn't load base image:", err);
      return fail(500, "Couldn't load your venue photo.");
    }
    // Load product images to use as visual references (max 4, only items with images).
    const itemImages: Buffer[] = [];
    for (const item of items.slice(0, 4)) {
      if (!item.image) continue;
      try {
        const buf = await readFile(path.join(process.cwd(), "public", item.image));
        itemImages.push(buf);
      } catch {
        // Missing image file — skip silently.
      }
    }

    prompt = buildRenderPrompt({
      style,
      brief,
      guestCount,
      items,
      photoCount: base.images.length,
      itemImageCount: itemImages.length,
    });

    // Stash item images so runRenderJob can append them as reference images.
    (base as typeof base & { itemImages: Buffer[] }).itemImages = itemImages;

    // A render belongs to a brief. The studio doesn't persist briefs yet, so reuse
    // the guest's latest one (updating its style) or create it.
    const { data: existing } = await supabase
      .from("briefs")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const fields = { style_id: styleId, guest_count: guestCount, venue_id: base.dbVenueId };
    if (existing) {
      briefId = existing.id as string;
      await supabase.from("briefs").update(fields).eq("id", briefId);
    } else {
      const { data: created, error } = await supabase.from("briefs").insert(fields).select("id").single();
      if (error || !created) return fail(500, "Couldn't start your render.");
      briefId = created.id as string;
    }
  }

  // ---- Record the render, then do the slow work after replying.
  const renderId = randomUUID();
  const size = sizeFor(base.width, base.height);
  const { error: insertError } = await admin.from("renders").insert({
    id: renderId,
    owner_id: user.id,
    brief_id: briefId,
    parent_render_id: parentId,
    prompt,
    status: "running",
    model: env.imageModel,
    style_id: renderStyleId,
    sample_venue_id: renderSampleVenueId,
    input_photo_ids: base.photoIds,
    item_ids: items.map((i) => i.id),
    depth,
    client_ip_hash: ipHash,
  });
  if (insertError) {
    // The database allows one render in flight per guest; losing that race is a 409.
    if (insertError.code === "23505") {
      return fail(409, "Your last render is still being created. Hang on a moment.");
    }
    console.error("[generate] couldn't create render row:", insertError);
    return fail(500, "Couldn't start your render.");
  }

  const itemImages: Buffer[] = (base as typeof base & { itemImages?: Buffer[] }).itemImages ?? [];
  after(() => runRenderJob({ admin, renderId, userId: user.id, images: [...base.images, ...itemImages], prompt, size }));

  return NextResponse.json(
    { ok: true, pending: false, status: "running", renderId, depth },
    { status: 202 }
  );
}
