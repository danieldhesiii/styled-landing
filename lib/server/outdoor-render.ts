import { NextResponse, after } from "next/server";
import { randomUUID } from "node:crypto";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { CatalogueItem } from "@/lib/types";
import type { LookItem, LookReport } from "@/lib/look";
import type { SceneId } from "@/lib/scenes";
import { earthVillageCatalogue } from "@/lib/earth-village-catalogue";
import {
  parseVisualiserEnvironment,
  parseTentColour,
  isAlexTent,
  unknownTentSize,
} from "@/lib/visualiser-environment";
import { namedProducts, ProductMatchError } from "@/lib/product-matching";
import { developmentRequestsAllowed } from "@/lib/server/development-request-catalogue";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/server/env";
import { checkRenderLimits, clientIpHash } from "@/lib/server/limits";
import {
  loadParentRender,
  loadSampleVenue,
  loadUploadedPhotos,
  type BaseImages,
} from "@/lib/server/render-source";
import { composeOrderableLook } from "@/lib/server/look";
import { loadProductReferences } from "@/lib/server/product-references";
import { loadAlexTentReferences } from "@/lib/server/alex-tent-references";
import { classifyOutdoorSource } from "@/lib/server/outdoor-vision";
import { buildOutdoorPrompt, outdoorSceneError } from "@/lib/outdoor-prompt";
import { sizeFor } from "@/lib/server/image-model";
import { loadSelectedPhotoBuffers } from "@/lib/server/selected-photos";
import { inspirationInstruction } from "@/lib/board-inspiration";
import { runRenderJob } from "@/lib/server/render-job";
const fail = (status: number, error: string) =>
  NextResponse.json({ ok: false, error }, { status });
interface Options {
  req: Request;
  user: User;
  supabase: SupabaseClient;
  body: {
    environment?: unknown;
    tentColour?: unknown;
    parentRenderId?: unknown;
    venueId?: unknown;
    primaryIndex?: unknown;
    images?: unknown;
  };
  itemIds: string[];
  selectionMode: "manual" | "auto" | undefined;
  brief: string;
  styleId: string | null;
  setting: SceneId;
  guestCount: number;
  weddingDate: string | null;
  deliveryDate: string | null;
  photoIds: string[] | undefined;
  inspirationPhotoIds: string[];
  supplierId: string | null;
}
/** Isolated first rollout. Uses the same auth, quota, storage and render records as indoor previews. */
export async function startOutdoorRender(o: Options): Promise<NextResponse> {
  const { req, user, supabase, body, brief, setting, guestCount } = o;
  if (
    !developmentRequestsAllowed(req) ||
    ["styleduk.com", "www.styleduk.com"].includes(new URL(req.url).hostname)
  )
    return fail(
      422,
      "Outdoor previews are available on the development site while we test them.",
    );
  let environment, colour;
  try {
    environment = parseVisualiserEnvironment(body.environment);
    colour = parseTentColour(body.tentColour);
  } catch (e) {
    return fail(400, (e as Error).message);
  }
  if (environment === "indoor")
    return fail(
      422,
      "Select Outdoor space or Inside a tent for this tent package.",
    );
  if (!env.openaiApiKeyIfSet)
    return fail(
      503,
      "Image generation is not connected. A sample image cannot show your selected tent.",
    );
  const sample = typeof body.venueId === "string" ? body.venueId : "";
  if (o.supplierId || sample.startsWith("listing:"))
    return fail(
      422,
      "This outdoor rollout does not change a venue’s supplier rules. Use your own site photo or the outdoor example for this development preview.",
    );
  const earth = earthVillageCatalogue(),
    tents = earth.filter((i) => isAlexTent(i.id)),
    selectedEarth = earth.filter((i) => o.itemIds.includes(i.id));
  if (selectedEarth.some((i) => i.visualiserUse === "reference-pending"))
    return fail(
      422,
      "Exact furniture reference photos are not supplied yet. Preview the tent alone or choose another photographed catalogue product.",
    );
  if(unknownTentSize(brief))return fail(422,"That tent size is not listed. Choose the 10 × 15 m or 20 × 15 m package, or ask Alex about another size.");
  const manual = o.selectionMode === "manual";
  let parent: Awaited<ReturnType<typeof loadParentRender>> = null;
  if (body.parentRenderId) {
    parent = await loadParentRender({
      supabase,
      parentId: String(body.parentRenderId),
    });
    if (!parent)
      return fail(404, "That saved preview is unavailable. Start a new look.");
    const old = parent.lookReport as LookReport | null;
    if (
      !old?.environment ||
      old.environment === "indoor" ||
      old.environment !== environment
    )
      return fail(
        422,
        "Start a new look from the site photo when changing between indoor, outdoor and tent-interior settings.",
      );
    if (old.supplierId || old.venueSlug)
      return fail(
        422,
        "This preview keeps its original supplier and venue restrictions. Start from an eligible source.",
      );
    if (parent.depth >= env.maxRefinements)
      return fail(
        422,
        "Start a new look from the original site photo to keep the details accurate.",
      );
  }
  const oldLook = parent?.lookReport as LookReport | null;
  if (body.tentColour === undefined && oldLook?.tentColour)
    colour = oldLook.tentColour;
  if (o.itemIds.some((id) => id.startsWith("demo-crescent-moon-")))
    return fail(
      422,
      "Chandelier reference previews are currently indoor only. Choose outdoor catalogue decor for this tent preview.",
    );
  let named;
  try {
    named = namedProducts(brief, tents);
  } catch (e) {
    return fail(422, (e as Error).message);
  }
  const requested = manual
    ? selectedEarth.filter((i) => isAlexTent(i.id))
    : named.items.length
      ? named.items
      : oldLook?.structureId &&
          !named.excludedIds.includes(oldLook.structureId) &&
          !/\b(no|without|remove) (?:the |any )?(tent|marquee)\b/i.test(brief)
        ? tents.filter((i) => i.id === oldLook.structureId)
        : [];
  if (requested.length > 1)
    return fail(
      422,
      "Choose one tent size per preview. Compare the other size in a new version.",
    );
  const tent = requested[0];
  if (
    manual &&
    (named.items.some((i) => i.id !== tent?.id) ||
      (!!tent && named.excludedIds.includes(tent.id)))
  )
    return fail(
      422,
      "Your description names a different tent. Update your selected package rather than silently changing its size.",
    );
  if (
    !tent &&
    !parent &&
    /\b(?:stretch tent|marquee|tent)\b/i.test(brief) &&
    !/\b(no|without|avoid) (?:the |any )?(tent|marquee)\b/i.test(brief)
  )
    return fail(
      422,
      "Choose the tent size from the catalogue first. Alex will confirm which layout suits your event.",
    );
  let live;
  try {
    const liveIds = manual
      ? o.itemIds.filter((id) => !earth.some((i) => i.id === id))
      : (oldLook?.items || [])
          .filter((i) => !isAlexTent(i.id))
          .map((i) => i.id);
    live = await composeOrderableLook({
      styleId: o.styleId,
      chosenIds: liveIds,
      brief,
      setting,
      weddingDate: o.weddingDate,
      deliveryDate: o.deliveryDate,
      guestCount,
      selectionMode: o.selectionMode,
      autoFill: !manual && !parent,
      substitute: false,
    });
  } catch (e) {
    return fail(
      422,
      e instanceof ProductMatchError
        ? e.message
        : "Could not check the selected products. Your existing preview is unchanged.",
    );
  }
  const items: CatalogueItem[] = [...live.items, ...(tent ? [tent] : [])];
  if (!items.length)
    return fail(422, "Choose the products you want to preview.");
  let base: BaseImages;
  try {
    if (parent) base = parent.base;
    else if (
      o.photoIds?.length ||
      (o.photoIds === undefined &&
        Array.isArray(body.images) &&
        body.images.length)
    ) {
      const uploaded = await loadUploadedPhotos({
        supabase,
        userId: user.id,
        photoIds: o.photoIds,
        primaryIndex:
          typeof body.primaryIndex === "number" ? body.primaryIndex : 0,
      });
      if (!uploaded)
        return fail(
          422,
          "Your site photo could not be loaded. Upload it again.",
        );
      base = uploaded;
    } else {
      if (sample !== "outdoor_garden" || environment === "tent-interior")
        return fail(
          422,
          environment === "outdoor"
            ? "Upload an outdoor site photo or try the outdoor garden example."
            : "Upload a photo taken inside your existing tent.",
        );
      base = await loadSampleVenue({
        origin: new URL(req.url).origin,
        sampleVenueId: sample,
      });
    }
  } catch {
    return fail(422, "Your site photo could not be loaded. Upload it again.");
  }
  const admin = createAdminClient(),
    ipHash = clientIpHash(req);
  const limited = await checkRenderLimits({
    supabase,
    admin,
    userId: user.id,
    ipHash,
  });
  if (limited) return fail(limited.status, limited.error);
  let scene = oldLook?.sourceScene;
  if (!parent) {
    // These preflight checks cost less than a render but still need their own bounded quota.
    for (const [key, limit] of [
      [`outdoor-check-user:${user.id}`, 20],
      [`outdoor-check-ip:${ipHash}`, 60],
      ["outdoor-check-global", 500],
    ] as const) {
      const r = await admin.rpc("hit_rate_limit", {
        p_key: key,
        p_limit: limit,
        p_window_seconds: 3600,
      });
      if (r.error || r.data !== true)
        return fail(
          r.error ? 503 : 429,
          "The site-photo check is temporarily unavailable or has reached its limit. Your work is saved.",
        );
    }
    try {
      scene = await classifyOutdoorSource(base.images[0]);
    } catch (e) {
      return fail(503, (e as Error).message);
    }
  }
  const sceneError = outdoorSceneError(environment, scene || "uncertain");
  if (sceneError) return fail(422, sceneError);
  let inspiration: Buffer[] = [];
  try {
    if (o.inspirationPhotoIds.length)
      inspiration = (
        await loadSelectedPhotoBuffers(supabase, user.id, o.inspirationPhotoIds)
      ).buffers;
  } catch {
    return fail(
      422,
      "One of your private inspiration photos is unavailable. Choose it again from Boards.",
    );
  }
  const refs: Buffer[] = [],
    names: string[] = [],
    audit: { productId: string; imageCount: number; source: string }[] = [];
  try {
    if (tent) {
      const r = await loadAlexTentReferences(tent, colour);
      refs.push(...r.buffers);
      names.push(...r.names);
      audit.push({
        productId: tent.id,
        imageCount: r.buffers.length,
        source: r.source,
      });
    }
    const remaining =
      16 - base.images.length - refs.length - inspiration.length;
    if (remaining < 0)
      return fail(
        422,
        "Choose fewer site photos so the tent reference can be included.",
      );
    const other = await loadProductReferences(
      live.items,
      live.items.map((i) => i.id),
      remaining,
    );
    refs.push(...other.buffers);
    names.push(...other.names);
  } catch (e) {
    return fail(
      422,
      e instanceof ProductMatchError
        ? e.message
        : "A selected reference photo could not be loaded. No image generation was started.",
    );
  }
  const oldTent =
    oldLook?.structureId !== tent?.id
      ? tents.find((i) => i.id === oldLook?.structureId)
      : undefined;
  let prompt = buildOutdoorPrompt({
    environment,
    setting,
    styleId: o.styleId,
    items,
    tent,
    colour,
    brief,
    photoCount: base.images.length,
    referenceNames: names,
    refining: !!parent,
    replacedTent: tent ? oldTent?.name : undefined,
  });
  if (inspiration.length)
    prompt += "\n\n" + inspirationInstruction(inspiration.length);
  if (oldTent && !tent)
    prompt +=
      "\n\nRemove the previously selected " +
      oldTent.name +
      " and its package matting/lighting. Do not replace it with another tent. Keep the site and remaining selected products unchanged.";
  const look: LookReport = {
    ...live.report,
    environment,
    tentColour: colour,
    sourceScene: scene,
    sourcePhotoIds: oldLook?.sourcePhotoIds || base.photoIds,
    structureId: tent?.id,
    referenceAudit: audit,
    checked: tent ? false : live.report.checked,
    leftPlain: tent
      ? live.report.leftPlain.filter((c) => c !== "lighting")
      : live.report.leftPlain,
    items: [
      ...live.report.items,
      ...(tent
        ? [
            {
              id: tent.id,
              name: tent.name,
              supplier: tent.supplier,
              category: tent.category,
              unitPricePence: Math.round(tent.unitPrice * 100),
              unit: tent.unit,
              quantity: 1,
              image: tent.image,
              basis: "request" as const,
              source: "chosen" as const,
            },
          ]
        : []),
    ],
  };
  const itemIds = items.map((i) => i.id),
    renderId = randomUUID();
  let briefId = parent?.briefId;
  if (!briefId) {
    const previous = await supabase
      .from("briefs")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (previous.error) return fail(503, "Could not save the preview.");
    briefId = previous.data?.id;
    if (!briefId) {
      const created = await supabase
        .from("briefs")
        .insert({
          guest_count: guestCount,
          venue_id: base.dbVenueId,
          ...(o.styleId ? { style_id: o.styleId } : {}),
        })
        .select("id")
        .single();
      if (created.error || !created.data)
        return fail(503, "Could not save the preview.");
      briefId = created.data.id;
    }
  }
  const saved = await admin
    .from("renders")
    .insert({
      id: renderId,
      owner_id: user.id,
      brief_id: briefId,
      parent_render_id: parent?.id || null,
      prompt,
      status: "running",
      model: env.imageModel,
      style_id: o.styleId,
      sample_venue_id: parent
        ? parent.sampleVenueId
        : base.dbVenueId
          ? null
          : sample,
      input_photo_ids: oldLook?.sourcePhotoIds || base.photoIds,
      item_ids: itemIds,
      look_report: look,
      depth: parent ? parent.depth + 1 : 0,
      client_ip_hash: ipHash,
    });
  if (saved.error)
    return fail(
      saved.error.code === "23505" ? 409 : 503,
      saved.error.code === "23505"
        ? "Your last preview is still being created."
        : "Could not save the preview. No image generation was started.",
    );
  after(() =>
    runRenderJob({
      admin,
      renderId,
      userId: user.id,
      images: [...base.images, ...refs, ...inspiration],
      prompt,
      size: sizeFor(base.width, base.height),
      quality: "high",
    }),
  );
  return NextResponse.json(
    {
      ok: true,
      status: "running",
      renderId,
      itemIds,
      look,
      depth: parent ? parent.depth + 1 : 0,
      selectionMode: o.selectionMode,
    },
    { status: 202 },
  );
}
