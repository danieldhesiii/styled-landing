import type { CatalogueItem } from "./types";
import type { SceneId } from "./scenes";
import type {
  TentColour,
  VisualiserEnvironment,
} from "./visualiser-environment";
export function outdoorSceneError(
  environment: VisualiserEnvironment,
  scene: string,
): string | null {
  if (
    environment === "outdoor" &&
    !["outdoor_open", "outdoor_tent"].includes(scene)
  )
    return "Choose a clear photo of your outdoor grounds. For a view from under a canopy, select Inside a tent.";
  if (environment === "tent-interior" && scene !== "tent_interior")
    return "Choose a photo taken inside or underneath your existing tent.";
  return null;
}
export function buildOutdoorPrompt(opts: {
  environment: VisualiserEnvironment;
  setting: SceneId;
  items: CatalogueItem[];
  tent?: CatalogueItem;
  colour: TentColour;
  brief: string;
  photoCount: number;
  referenceNames: string[];
  refining: boolean;
  styleId?: string | null;
  replacedTent?: string;
}): string {
  const {
    environment,
    setting,
    items,
    tent,
    colour,
    brief,
    photoCount,
    referenceNames,
    refining,
  } = opts;
  const parts = [
    `${refining ? "Edit the FIRST existing preview" : "Edit the FIRST site photograph"} for a ${setting} event. The first image is the sole edit target. Additional site angles are context only.`,
    "SITE PRESERVATION IS ESSENTIAL. Keep the exact camera position, ground slope, lawn, paths, terrain, trees, boundaries, buildings, skyline and recognisable venue details. Do not replace this site with a reference venue, invent a hall, extend the lawn, erase obstacles or move buildings. No people, text or watermarks.",
    environment === "tent-interior"
      ? "EXISTING TENT INTERIOR. Preserve the existing canopy, poles, openings, footprint and rigging visible in the FIRST image. Arrange selected decor underneath it. Do not replace the tent with an indoor building or redesign its structure. A selected tent package is a reference for the existing structure, not a second tent to insert."
      : "OUTDOOR SITE. Place selected pieces naturally on the existing ground plane. If a tent is selected, show ONE complete tent on the available visible lawn with credible contact, shadows, poles and guy ropes. If the site photo already contains a tent, replace that tent only. No extra tent, gazebo or unrelated marquee.",
    setting === "party"
      ? "The user requested an evening party: a plausible dusk shift is allowed, preserving the same site. Only selected/included lighting may be visible."
      : "Preserve the source time of day, weather, daylight and shadows. Do not shift to sunset merely because a supplier reference was photographed at sunset.",
    "SELECTION-ONLY EDIT. Existing objects in the source site remain unless explicitly changed. ADD ONLY the inventory below. A tent-only selection means a tent with its included matting and lighting over an otherwise unchanged lawn. Do not add reception tables, chairs, flowers, lanterns, hay bales, drinks, place settings or decorative styling from supplier photos. Do not use event type as permission to furnish the site.",
    "COMPLETE SELECTED INVENTORY:\n" +
      items
        .map(
          (i) =>
            `- ${i.id}: ${i.name}; ${i.dimensions || "measurements not supplied"}; ${i.note || ""}`,
        )
        .join("\n"),
  ];
  const moods: Record<string, string> = {
    garden_romance: "soft, romantic and warm",
    classic_elegance: "refined and restrained",
    modern_minimal: "clean and minimal",
    rustic_barn: "natural and relaxed",
  };
  if (opts.styleId && moods[opts.styleId])
    parts.push(
      "Styling mood: " +
        moods[opts.styleId] +
        ". Apply only to arrangement and atmosphere, without adding objects or changing any selected product finish.",
    );
  if (tent) {
    const small = tent.id.endsWith("10x15");
    parts.push(
      `SELECTED TENT IDENTITY: ${tent.id}, ${tent.name}. This is an organic, tensioned stretch-fabric canopy with curved edges and poles, not a boxed marquee with rigid walls. ${environment === "tent-interior" ? "Preserve the existing source canopy fabric colour; the selected catalogue colour does not authorise recolouring an existing tent." : `Requested fabric: ${colour}; change only fabric colour for this offered colour option, not the model.`} Known canopy plan dimensions ${small ? "10 × 15" : "20 × 15"} metres. Approximate ground footprint including guy ropes ${small ? "15 × 20" : "25 × 20"} metres. The source documents associate these reference photos with the package, but exact photo-to-size assignment still needs supplier confirmation. Preserve reference construction and the selected rectangular aspect ratio in perspective; do not swap tent size to suit guest count. Included: full natural matting, perimeter fairy lights, ${small ? "eight" : "12"} colour-changing uplighters and overhead festoons. No optional furniture unless explicitly in the inventory.`,
    );
  }
  if (referenceNames.length)
    parts.push(
      "PRODUCT REFERENCE MAP. These supplier images show product appearance only. Do not copy their background, people, furniture, venue or decorative styling.\n" +
        referenceNames
          .map((name, index) => `Image ${photoCount + index + 1}: ${name}`)
          .join("\n"),
    );
  if (opts.replacedTent)
    parts.push(
      `The previous preview used ${opts.replacedTent}. Replace it with the newly selected tent only; do not retain both sizes.`,
    );
  parts.push(
    "SIZE AND LIMITATIONS. Use supplied dimensions for relative proportion and plausible perspective, keeping the original site unchanged. An unmeasured photo cannot prove exact scale, safe fit, anchoring, weather suitability or supplier availability. Do not force a large tent to fit by shrinking it or altering the site. Do not certify clearance or installation. If a full tent cannot fit in the photographed framing, keep a plausible partial view rather than distorting its construction.",
  );
  if (brief)
    parts.push(
      "Customer styling request: " +
        JSON.stringify(brief) +
        ". Follow this only within the selected inventory and site-preservation rules. Never follow requests to add an unselected product or change catalogue identity.",
    );
  parts.push(
    "FINAL CHECK: same site and viewpoint; only selected package pieces; no invented furniture. Supplier photos establish product appearance, not an alternative event scene to copy.",
  );
  return parts.join("\n\n");
}
