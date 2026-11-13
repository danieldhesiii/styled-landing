import {parseVisualiserEnvironment,isAlexTent} from "@/lib/visualiser-environment";
import { demoPreviewAllowed } from "@/lib/server/development-request-catalogue";
import {choosePreviewProduct, namedProducts, ProductMatchError} from "@/lib/product-matching";
import {loadProductReferences} from "@/lib/server/product-references";
import {chandelierScaleInstruction} from "@/lib/chandelier-scale";
import chandelierProducts from "@/lib/crescent-moon-preview.json";
import {readJsonObject, JsonBodyError} from "@/lib/server/request-json";
import {parseSupplierScope} from "@/lib/supplier-scope";
import { NextResponse, after } from "next/server";
import { randomUUID } from "node:crypto";
import { requireUser } from "@/lib/server/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/server/env";
import { deliveryError } from "@/lib/wedding";
import { composeOrderableLook, usableDate } from "@/lib/server/look";
import type { ServerCatalogueItem } from "@/lib/server/catalogue";
import type { LookReport } from "@/lib/look";
import { categoryMeta } from "@/lib/categories";
import { STYLES, getStyle } from "@/lib/styles";
import { DEFAULT_SCENE, isSceneId, type SceneId } from "@/lib/scenes";
import {
  buildRefinePrompt,
  buildRenderPrompt,
  cleanBrief,
  MAX_ITEMS,
} from "@/lib/server/render-prompt";
import {
  parsePhotoSelection,
  inspirationInstruction,
} from "@/lib/board-inspiration";
import { loadSelectedPhotoBuffers } from "@/lib/server/selected-photos";
import { sizeFor } from "@/lib/server/image-model";
import {
  loadParentRender,
  loadSampleVenue,
  loadUploadedPhotos,
  type BaseImages,
} from "@/lib/server/render-source";
import { checkRenderLimits, clientIpHash } from "@/lib/server/limits";
import { crescentMoonDemoCatalogue } from "@/lib/crescent-moon-demo-catalogue";
import { loadCrescentMoonReferences, chandelierIdentityInstruction, orderChandelierInputs } from "@/lib/server/crescent-moon-references";
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
  environment?: unknown;
  tentColour?: unknown;
  demoReferenceId?: unknown;
  chandelierScale?: unknown;
  supplierId?: unknown;
  photoIds?: unknown;
  inspirationPhotoIds?: unknown;
  prompt?: unknown;
  styleId?: unknown;
  venueId?: unknown;
  images?: unknown;
  itemIds?: unknown;
  selectionMode?: unknown;
  guestCount?: unknown;
  primaryIndex?: unknown;
  parentRenderId?: unknown;
  setting?: unknown;
  weddingDate?: unknown;
  deliveryDate?: unknown;
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
    body = await readJsonObject(req);
  } catch (error) {
    return fail(error instanceof JsonBodyError ? error.status : 400, error instanceof JsonBodyError ? error.message : "Invalid request body.");
  }

  let supplierId:string|null;
  try{supplierId=parseSupplierScope(body.supplierId);}catch{return fail(400,"Choose a valid supplier.");}
  let photoIds: string[] | undefined, inspirationPhotoIds: string[];
  try {
    photoIds =
      body.photoIds === undefined
        ? undefined
        : parsePhotoSelection(body.photoIds, 20);
    inspirationPhotoIds = parsePhotoSelection(body.inspirationPhotoIds);
  } catch {
    return fail(400, "Choose valid private photos within the image limit.");
  }

  // "none" means description-led: the couple skipped the preset styles and the
  // design comes entirely from their own description.
  const styleId =
    typeof body.styleId === "string" ? body.styleId : "garden_romance";
  const descriptionLed = styleId === "none";
  if (!descriptionLed && !STYLES.some((s) => s.id === styleId))
    return fail(400, "Unknown style.");
  const style = descriptionLed ? null : getStyle(styleId);

  if (body.itemIds !== undefined && (!Array.isArray(body.itemIds) || body.itemIds.some(id => typeof id !== "string" || !id.trim()))) {
    return fail(400, "Choose valid catalogue products.");
  }
  if (body.selectionMode !== undefined && body.selectionMode !== "manual" && body.selectionMode !== "auto") return fail(400, "Choose a valid product selection mode.");
  const selectionMode = body.selectionMode as "manual" | "auto" | undefined;
  const manual = selectionMode === "manual";
  const selectedIds = [...new Set((body.itemIds as string[] | undefined) || [])];
  if (selectedIds.length > MAX_ITEMS) return fail(422, `Choose up to ${MAX_ITEMS} products for one preview.`);

  // Explicit auto mode never inherits the caller's saved manual selection.
  const itemIds = selectionMode === "auto" ? [] : selectedIds;
  if (manual && !itemIds.length) return fail(422, "Choose products or select Choose for me.");

  const brief = cleanBrief(body.prompt);
  // Product-led previews can start directly from selected catalogue pieces.
  if (descriptionLed && !brief && !itemIds.length) {
    return fail(
      422,
      "Add a description of the look you want, or pick a style to start from.",
    );
  }
  const sampleVenueId = typeof body.venueId === "string" ? body.venueId : "";
  const useUpload =
    photoIds !== undefined
      ? photoIds.length > 0
      : Array.isArray(body.images) && body.images.length > 0;
  const primaryIndex =
    typeof body.primaryIndex === "number" ? body.primaryIndex : 0;
  const guestCount = Math.min(
    500,
    Math.max(
      1,
      Math.round(typeof body.guestCount === "number" ? body.guestCount : 80),
    ),
  );
  const parentRenderId =
    typeof body.parentRenderId === "string" ? body.parentRenderId : null;
  // The wedding date availability is checked against. Missing or in the past means
  // "unchecked": we then only keep pieces the supplier could ever supply for this
  // guest count, and tell the couple the date wasn't checked.
  const weddingDate = usableDate(body.weddingDate);
  const deliveryDate =
    body.deliveryDate === undefined
      ? weddingDate
      : usableDate(body.deliveryDate);
  if (
    weddingDate &&
    (!deliveryDate || deliveryError(weddingDate, deliveryDate))
  )
    return fail(
      400,
      "Check your wedding and delivery dates before generating a look.",
    );
  if (parentRenderId && !UUID.test(parentRenderId))
    return fail(400, "Invalid render id.");

  // Which wedding scene to set the room for (reception, ceremony, party, drinks,
  // proposal). Drives the layout instruction and which catalogue categories
  // compose the look.
  const setting: SceneId = isSceneId(body.setting)
    ? body.setting
    : DEFAULT_SCENE;

  let environment;try{environment=parseVisualiserEnvironment(body.environment);}catch(e){return fail(400,(e as Error).message);}
  if(environment!=="indoor"||itemIds.some(isAlexTent)){const {startOutdoorRender}=await import("@/lib/server/outdoor-render");return startOutdoorRender({req,user,supabase,body,itemIds,selectionMode,brief,styleId:descriptionLed?null:styleId,setting,guestCount,weddingDate,deliveryDate,photoIds,inspirationPhotoIds,supplierId});}
  const previewCatalogue = crescentMoonDemoCatalogue();
  const previewIds = itemIds.filter(id => previewCatalogue.some(item => item.id === id));
  const allowPreview = demoPreviewAllowed(req) && !supplierId && !sampleVenueId.startsWith("listing:");
  if (previewIds.length && !allowPreview) return fail(422, "That preview product is not available within this venue or supplier selection.");
  if (previewIds.length > 1) return fail(422, "Use one reference lighting design per preview.");
  if (manual && body.demoReferenceId !== undefined && body.demoReferenceId !== (previewIds[0] || null)) return fail(422, "Update your selected products to change the preview reference.");
  if (manual) {
    try {
      const requested = namedProducts(brief, previewCatalogue);
      if (requested.items.some(item => !previewIds.includes(item.id)) || previewIds.some(id => requested.excludedIds.includes(id))) return fail(422, "Your description conflicts with your selected products. Update your selection or use Choose for me.");
    } catch (error) { return fail(422, error instanceof Error ? error.message : "Check the product names in your description."); }
  }

  // No image key configured: keep the studio usable with the illustrative render.
  if (!env.openaiApiKeyIfSet) {
    if(body.demoReferenceId || previewIds.length || (manual && itemIds.length)) return fail(503, "Image generation is not connected. A sample image cannot show your selected products. Please contact support.");
    console.warn(
      "[generate] OPENAI_API_KEY not set; returning placeholder render.",
    );
    return NextResponse.json({
      ok: true,
      pending: true,
      imageUrl: style?.render ?? STYLES[0].render ?? null,
      message:
        "Render engine not connected yet. Showing an illustrative look for now. Your brief has been captured.",
    });
  }

  // Work out the catalogue pieces this render is built from. A refinement keeps
  // just the couple's explicitly chosen items; a new look is composed into a full
  // catalogue-only look (their chosen items + a style-matched piece per decor
  // category) so everything in the picture is real and shoppable.
  // Only pieces the couple could actually order: in stock, free on their date, and
  // enough of them for their guest count (see lib/look.ts). Anything they chose
  // that is unavailable blocks generation so selections are never silently
  // replaced. A refinement keeps exactly what they already have.
  let namedProductIds:string[]=[];
  let excludedProductIds:string[]=[];
  let items: ServerCatalogueItem[];
  let look: LookReport;
  try {
    const composed = await composeOrderableLook({
      supplierId,
      venueSlug:sampleVenueId.startsWith("listing:")?sampleVenueId.slice(8):undefined,
      styleId: descriptionLed ? null : styleId,
      chosenIds: itemIds.filter(id=>!crescentMoonDemoCatalogue().some(item=>item.id===id)),
      brief,
      setting,
      weddingDate,
      deliveryDate,
      guestCount,
      selectionMode,
      autoFill: !manual && !parentRenderId,
      substitute: !parentRenderId,
    });
    namedProductIds=composed.namedIds||[];
    excludedProductIds=composed.excludedNamedIds||[];
    items = composed.items;
    look = composed.report;
    if(supplierId&&!parentRenderId&&!items.length)return fail(422,"No eligible products from this supplier match the current venue, date and scene. Choose another supplier or adjust your request.");
  } catch (err) {
    if(err instanceof ProductMatchError)return fail(422,err.message);
    console.error("[generate] couldn't load catalogue items:", err);
    return fail(500, "Couldn't start your render.");
  }

  const demoReferenceId = body.demoReferenceId;
  let demoReference = typeof demoReferenceId === "string" && demoReferenceId
    ? crescentMoonDemoCatalogue().find(item => item.id === demoReferenceId)
    : undefined;
  if (demoReferenceId && (!demoReference || !demoPreviewAllowed(req) || supplierId || sampleVenueId.startsWith("listing:"))) {
    return fail(422, "Choose a demo reference for an unrestricted development look.");
  }
  if(demoReferenceId===undefined) {
    try {
      demoReference=choosePreviewProduct({catalogue:crescentMoonDemoCatalogue(),currentItems:items,brief:manual ? "" : brief,styleId:descriptionLed?null:styleId,chosenIds:[...itemIds,...namedProductIds],allow:demoPreviewAllowed(req)&&!supplierId&&!sampleVenueId.startsWith("listing:"),auto:!manual&&!parentRenderId});
    } catch(error) {return fail(422,error instanceof Error?error.message:"Check the product names in your description.");}
  }
  if (demoReference) {
    look.demoReference = { id: demoReference.id, name: demoReference.name, image: demoReference.image };
    items = items.filter(item => item.category !== "lighting" || namedProductIds.includes(item.id) || itemIds.includes(item.id));
    look.items = look.items.filter(item => item.category !== "lighting" || namedProductIds.includes(item.id) || itemIds.includes(item.id));
    look.leftPlain = look.leftPlain.filter(category => category !== "lighting");
  }

  const admin = createAdminClient();
  const ipHash = clientIpHash(req);

  const limited = await checkRenderLimits({
    supabase,
    admin,
    userId: user.id,
    ipHash,
  });
  if (limited) return fail(limited.status, limited.error);

  // ---- Work out what to edit, and the instruction to give the model.
  let base: BaseImages;
  let prompt: string;
  let depth = 0;
  let briefId: string | null = null;
  let parentId: string | null = null;
  let renderStyleId: string | null = descriptionLed ? null : styleId;
  let renderSampleVenueId: string | null = null;

  if (parentRenderId) {
    const parent = await loadParentRender({
      supabase,
      parentId: parentRenderId,
    });
    if (!parent)
      return fail(
        404,
        "That render couldn't be found. Please start a new look.",
      );
    if (parent.depth + 1 > env.maxRefinements) {
      return fail(
        422,
        `You've refined this look ${env.maxRefinements} times, which is as far as it can go before quality drops. Start a new look from your venue photo.`,
      );
    }
    // A refinement inherits its original supplier and venue scope. Never carry
    // stale parent report items past current eligibility checks.
    const inheritedScope=(parent.lookReport as LookReport|null)?.supplierId||null;
    if(body.supplierId!==undefined&&supplierId!==inheritedScope)return fail(409,"Start a new look to change its supplier.");
    const inheritedVenue=(parent.lookReport as LookReport|null)?.venueSlug||(parent.sampleVenueId?.startsWith("listing:")?parent.sampleVenueId.slice(8):null);
    const requestedVenue=sampleVenueId.startsWith("listing:")?sampleVenueId.slice(8):null;
    if(inheritedVenue!==requestedVenue)return fail(409,"Start a new look to change its venue supplier policy.");
    if(parent.sampleVenueId&&sampleVenueId!==parent.sampleVenueId)return fail(409,"Start a new look to change its venue.");
    const originalIds = (parent.lookReport as LookReport | null)?.items?.map(item => item.id) || [];
    try {
      if (manual) {
        const updated = await composeOrderableLook({ supplierId: inheritedScope, venueSlug: inheritedVenue || undefined, styleId: parent.styleId, chosenIds: itemIds.filter(id => !previewIds.includes(id)), brief, setting, weddingDate, deliveryDate, guestCount, selectionMode, autoFill: false, substitute: false });
        items = updated.items;
        look = updated.report;
        namedProductIds = updated.namedIds || [];
      } else {
        const parentLook = await composeOrderableLook({ supplierId: inheritedScope, venueSlug: inheritedVenue || undefined, styleId: parent.styleId, chosenIds: originalIds, setting, weddingDate, deliveryDate, guestCount, autoFill: false, substitute: false });
        if (originalIds.some(id => !parentLook.items.some(item => item.id === id))) return fail(409, "Some pieces are no longer eligible. Start a new look to choose alternatives.");
        const updated = (namedProductIds.length || excludedProductIds.length) ? await composeOrderableLook({ supplierId: inheritedScope, venueSlug: inheritedVenue || undefined, styleId: parent.styleId, chosenIds: originalIds, brief, setting, weddingDate, deliveryDate, guestCount, autoFill: false, substitute: false }) : parentLook;
        items = updated.items; look = updated.report;
        namedProductIds = updated.namedIds || namedProductIds;
      }
    } catch (error) { return fail(422, error instanceof ProductMatchError ? error.message : "Could not check the original look’s supplier and venue rules. Start a new look."); }
    if((parent.lookReport as LookReport|null)?.environment && (parent.lookReport as LookReport).environment!=="indoor")return fail(422,"Reopen this outdoor preview with its outdoor setting before refining it.");
    base = parent.base;
    const inheritedDemoId = (parent.lookReport as LookReport | null)?.demoReference?.id;
    const namedPreview=namedProducts(brief,crescentMoonDemoCatalogue());
    const removedPreview=!!inheritedDemoId&&((!demoReference&&items.some(item=>namedProductIds.includes(item.id)&&item.category==="lighting"))||namedPreview.excludedIds.includes(inheritedDemoId)||/\b(?:no|without|avoid|remove) (?:any |the )?chandeliers?\b/i.test(brief));
    const selectedDemoId = manual ? demoReference?.id : body.demoReferenceId === null || removedPreview ? undefined : demoReference?.id || (body.demoReferenceId === undefined ? inheritedDemoId : undefined);
    const inheritedDemo = selectedDemoId ? crescentMoonDemoCatalogue().find(item => item.id === selectedDemoId) : undefined;
    if (demoReference && (inheritedScope || inheritedVenue)) return fail(422, "Demo chandeliers cannot be used in a supplier-restricted look.");
    if (inheritedDemo && demoPreviewAllowed(req) && !inheritedScope && !inheritedVenue) {
      look.demoReference = { id: inheritedDemo.id, name: inheritedDemo.name, image: inheritedDemo.image };
      items = items.filter(item => item.category !== "lighting" || namedProductIds.includes(item.id) || itemIds.includes(item.id));
      look.items = look.items.filter(item => item.category !== "lighting" || namedProductIds.includes(item.id) || itemIds.includes(item.id));
      look.leftPlain = look.leftPlain.filter(category => category !== "lighting");
    }
    prompt = buildRefinePrompt({ brief, items: look.demoReference && inheritedDemo ? [...items, inheritedDemo] : items });
    if (look.demoReference && inheritedDemo) {
      try {
        const references = await loadCrescentMoonReferences(inheritedDemo.id);
        (base as typeof base & { itemImages: Buffer[] }).itemImages = references.buffers;
        prompt += "\n\n" + chandelierIdentityInstruction(inheritedDemo.id, 2);
        const product=chandelierProducts.find(p=>`demo-crescent-moon-${p.slug}`===inheritedDemo.id);
        if(product) prompt += "\n\n" + chandelierScaleInstruction(product,null);
        prompt += "\n\nThe first image is the existing render to edit. Subsequent images are original reference views of the SAME " + inheritedDemo.name + ". Preserve its identity using these original photos; do not copy backgrounds or other chandeliers. Reference map: " + references.names.map((name,index)=>`Image ${index+2}: ${name}`).join("; ");
      } catch { return fail(422, "The original chandelier reference photos could not be loaded."); }
    }
    if ((body.demoReferenceId === null || removedPreview || (manual && !selectedDemoId)) && inheritedDemoId) {
      prompt += "\n\nRemove the previously selected demo chandelier from this image. Do not replace it with an invented chandelier. Keep the rest of the scene unchanged.";
    }
    try {
      const existingRefs=(base as typeof base & {itemImages?:Buffer[]}).itemImages||[];
      const references=await loadProductReferences(items,[...new Set([...namedProductIds, ...itemIds.filter(id => items.some(item => item.id === id))])],16-base.images.length-existingRefs.length);
      (base as typeof base & {itemImages:Buffer[]}).itemImages=[...existingRefs,...references.buffers];
      if(references.names.length)prompt+="\n\nORIGINAL PRODUCT PHOTO MAP. Reproduce each specific product, not a generic alternative. Only the FIRST image is the venue view to edit. "+references.names.map((name,index)=>`Image ${base.images.length+existingRefs.length+index+1}: ${name}`).join("; ");
    }catch(error){return fail(422,error instanceof Error?error.message:"Product photos could not be loaded.");}
    if (manual) {
      const removed = ((parent.lookReport as LookReport | null)?.items || []).filter(item => !items.some(selected => selected.id === item.id));
      if (removed.length) prompt += "\n\nRemove these products from the existing image: " + removed.map(item => `${item.name} [${item.id}]`).join(", ") + ". Keep only the selected inventory; do not replace removed products.";
    }
    if(excludedProductIds.length)prompt+="\n\nRemove these explicitly excluded products from the existing image: "+((parent.lookReport as LookReport|null)?.items||[]).filter(item=>excludedProductIds.includes(item.id)).map(item=>item.name).join(", ")+". Keep other products unchanged.";
    if(namedProductIds.length)prompt+="\n\nExplicitly named catalogue products take priority: "+items.filter(item=>namedProductIds.includes(item.id)).map(item=>item.name).join(", ")+". Include these exact products using their original reference photos and dimensions. Replace competing versions of those products where necessary; do not alter their design to fit the mood. Keep the rest of the venue unchanged.";
    depth = parent.depth + 1;
    briefId = parent.briefId;
    parentId = parent.id;
    renderStyleId = parent.styleId ?? renderStyleId;
    renderSampleVenueId = parent.sampleVenueId;
  } else {
    try {
      const uploaded = useUpload
        ? await loadUploadedPhotos({
            supabase,
            primaryIndex,
            userId: user.id,
            photoIds,
          })
        : null;
      // Fall back to the sample venue if the upload can't be found.
      base =
        uploaded ??
        (await loadSampleVenue({
          origin: new URL(req.url).origin,
          sampleVenueId,
        }));
      if (!uploaded) renderSampleVenueId = sampleVenueId || null;
    } catch (err) {
      console.error("[generate] couldn't load base image:", err);
      return fail(500, "Couldn't load your venue photo.");
    }
    let inspirationImages: Buffer[] = [];
    try {
      inspirationImages = (await loadSelectedPhotoBuffers(supabase, user.id, inspirationPhotoIds)).buffers;
    } catch {
      return fail(400, "One of your board inspiration photos is no longer available. Return to Boards and choose it again.");
    }
    // Reserve room for venue and private inspiration photos within the image API limit.
    const itemImageBudget = Math.max(0, 16 - base.images.length - inspirationImages.length);
    const itemImages: Buffer[] = [];
    const itemImageNames: string[] = [];
    if (demoReference) {
      try {
        const references = await loadCrescentMoonReferences(demoReference.id);
        if (references.buffers.length > itemImageBudget) return fail(422, "Choose fewer venue or inspiration photos to include all chandelier reference views.");
        itemImages.push(...references.buffers);
        itemImageNames.push(...references.names);
      } catch {
        return fail(422, "The chandelier reference set could not be loaded. Please try again.");
      }
    }
    try {
      const references=await loadProductReferences(items,[...new Set([...namedProductIds, ...itemIds.filter(id => items.some(item => item.id === id))])],itemImageBudget-itemImages.length);
      itemImages.push(...references.buffers);itemImageNames.push(...references.names);
    }catch(error){return fail(422,error instanceof Error?error.message:"Product photos could not be loaded.");}
    prompt = buildRenderPrompt({
      style,
      brief,
      guestCount,
      items: demoReference ? [...items, demoReference] : items,
      setting,
      photoCount: demoReference ? 1 : base.images.length,
      itemImageCount: itemImages.length,
      itemImageNames,
      leftPlain: look.leftPlain.map((c) => categoryMeta(c).label),
    });

    if (demoReference) {
      const product=chandelierProducts.find(p=>`demo-crescent-moon-${p.slug}`===demoReference.id);
      prompt += "\n\n" + chandelierIdentityInstruction(demoReference.id, 2);
      if(product) prompt += "\n\n" + chandelierScaleInstruction(product,null);
      if(base.images.length>1) prompt += `\n\nImages ${itemImages.length+2} to ${itemImages.length+base.images.length} are additional venue angles only. Preserve the FIRST image's viewpoint; never copy lighting fixtures from these extra room views.`;
    }
    if (inspirationImages.length)
      prompt += "\n\n" + inspirationInstruction(inspirationImages.length);
    // Keep source venue ids first so saved looks still know their original room.
    (base as typeof base & { inspirationImages: Buffer[] }).inspirationImages =
      inspirationImages;
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
    // A description-led render has no preset style (renderStyleId is null). The
    // briefs.style_id column is NOT NULL (default 'garden_romance'), so only set it
    // when we actually have one — otherwise let the default stand (on insert) or
    // leave the existing value untouched (on update).
    const fields: {
      guest_count: number;
      venue_id: string | null;
      style_id?: string;
    } = {
      guest_count: guestCount,
      venue_id: base.dbVenueId,
    };
    if (renderStyleId) fields.style_id = renderStyleId;
    if (existing) {
      briefId = existing.id as string;
      await supabase.from("briefs").update(fields).eq("id", briefId);
    } else {
      const { data: created, error } = await supabase
        .from("briefs")
        .insert(fields)
        .select("id")
        .single();
      if (error || !created) return fail(500, "Couldn't start your render.");
      briefId = created.id as string;
    }
  }

  // ---- Record the render, then do the slow work after replying.
  const renderId = randomUUID();
  const size = sizeFor(base.width, base.height);
  const referenceIds = [...new Set([...items.map(item => item.id), ...(look.demoReference ? [look.demoReference.id] : [])])];
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
    item_ids: referenceIds,
    look_report: look,
    depth,
    client_ip_hash: ipHash,
  });
  if (insertError) {
    // The database allows one render in flight per guest; losing that race is a 409.
    if (insertError.code === "23505") {
      return fail(
        409,
        "Your last render is still being created. Hang on a moment.",
      );
    }
    console.error("[generate] couldn't create render row:", insertError);
    return fail(500, "Couldn't start your render.");
  }

  const itemImages: Buffer[] =
    (base as typeof base & { itemImages?: Buffer[] }).itemImages ?? [];
  after(() =>
    runRenderJob({
      admin,
      renderId,
      userId: user.id,
      images: look.demoReference
        ? orderChandelierInputs(base.images, itemImages, (base as typeof base & { inspirationImages?: Buffer[] }).inspirationImages || [])
        : [...base.images, ...itemImages, ...((base as typeof base & { inspirationImages?: Buffer[] }).inspirationImages || [])],
      quality: look.demoReference || namedProductIds.length ? "high" : undefined,
      prompt,
      size,
    }),
  );

  return NextResponse.json(
    { ok: true, pending: false, status: "running", renderId, depth, itemIds: referenceIds, selectionMode, look },
    { status: 202 },
  );
}
