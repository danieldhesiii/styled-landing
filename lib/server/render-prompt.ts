import type { CatalogueItem } from "@/lib/types";
import type { StylePreset } from "@/lib/types";
import type { SceneId } from "@/lib/scenes";

// Builds the instruction sent to the image-edit model. The model sees the venue
// photo itself, so the prompt only has to say what to keep and what to add.

// A style is a MOOD: colours, materials and feeling. It deliberately names no
// objects (no chairs, no glassware, no lighting). The catalogue pieces listed in
// the prompt are the complete inventory of what may appear, so a style must never
// introduce a product we might not have in stock.
const STYLE_DIRECTION: Record<string, string> = {
  garden_romance:
    "Garden Romance mood: romantic, soft and abundant. A palette of blush, ivory, soft gold and fresh greenery; warm, gentle, candlelit glow.",
  classic_elegance:
    "Classic Elegance mood: refined, formal, black-tie. A palette of ivory, white and gold with crisp, polished finishes.",
  modern_minimal:
    "Modern Minimal mood: clean, uncluttered and contemporary. A neutral palette of white and soft greige with sculptural, architectural restraint.",
  rustic_barn:
    "Wildflower mood: relaxed, natural and warm. A palette of sage, meadow colours and warm wood with a loose, undone charm.",
};

// What to preserve. Daytime scenes keep the real daylight; the evening party is
// the one scene where we deliberately shift the room to a dusk / after-dark mood.
const KEEP_DAYLIGHT =
  "Preserve exactly the venue's architecture: walls, windows, doors, ceiling, beams, floor, the view outside, the camera angle, perspective and natural light. Only add and change wedding styling inside the room. Photorealistic wedding venue photography. No people, no text, no watermarks.";
const KEEP_EVENING =
  "Preserve exactly the venue's architecture: walls, windows, doors, ceiling, beams, floor, the camera angle and perspective. Keep the room and viewpoint identical, but change the time of day to evening: the view outside should be dusk or dark, and the room lit warmly and atmospherically. Only add and change wedding styling inside the room. Photorealistic wedding venue photography. No people, no text, no watermarks.";

export const MAX_BRIEF_CHARS = 600;
export const MAX_ITEMS = 12;

// The wedding scene the couple is visualising. Each one restyles the same room
// for a different part of the day, with its own layout and lighting.
export type RenderSetting = SceneId;

// Per-scene prompt pieces: how to open, and how to lay the room out. `guests` is
// woven in where it helps the model judge scale.
const SCENE_OPENING: Record<SceneId, (subject: string) => string> = {
  reception: (s) =>
    `Preview the selected catalogue pieces in ${s} for a wedding reception.`,
  ceremony: (s) =>
    `Preview the selected catalogue pieces in ${s} for a wedding ceremony.`,
  party: (s) =>
    `Preview the selected catalogue pieces in ${s} for an evening wedding party.`,
  drinks: (s) =>
    `Preview the selected catalogue pieces in ${s} for a wedding drinks reception.`,
  proposal: (s) =>
    `Preview the selected catalogue pieces in ${s} for an intimate marriage proposal.`,
};

const SCENE_LAYOUT: Record<SceneId, (guests: number) => string> = {
  reception: (g) =>
    `Reception context for about ${g} guests. Arrange only the listed pieces with sensible spacing and a clear walkway. Guest count is context, not permission to add furniture or place settings.`,
  ceremony: (g) =>
    `Ceremony context for about ${g} guests. Keep a clear central aisle. Position any listed seating towards the ceremony front and any listed backdrop at that focal point. If neither is listed, leave those spaces as photographed. This is not a dining layout.`,
  party: (g) =>
    `Evening party context for about ${g} guests. Keep the centre open for movement and arrange only the listed pieces around usable circulation space. Do not invent entertainment equipment or extra lighting.`,
  drinks: (g) =>
    `Standing drinks reception context for about ${g} guests. Arrange only the listed pieces with plenty of room to mingle. Do not invent a bar, seating or serving furniture to complete the scene.`,
  proposal: () =>
    `Private marriage proposal context for two people. Arrange only the listed pieces into an intimate focal point. A romantic mood does not authorise extra flowers, candles or props.`,
};

// The couple's free text goes into a prompt, so keep it plain and bounded.
export function cleanBrief(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_BRIEF_CHARS);
}

// Several photos of one room: the first is the view to restyle, the rest only
// teach the model what the room really looks like.
function referenceNote(photoCount: number): string | null {
  if (photoCount < 2) return null;
  return `You are given ${photoCount} photos of the same venue from different angles. The FIRST image is the view to restyle: keep its exact camera angle and framing, and output only that view. The other images are reference only. Use them to understand the room's true size, layout and architecture, and keep the styling consistent with the real space, but do not copy their camera angles.`;
}

/** Product-to-product scale is automatic; an unmeasured room is never a survey. */
export function physicalScaleInstruction():string {
  return "PHYSICAL SIZE AND REALISM. Use the catalogue dimensions as real-world dimensions for every product. At the same depth, preserve the relative size of catalogue pieces instead of independently shrinking them to fit a pleasing composition. Use venue perspective, floor and ceiling planes, and any recognisable features as contextual guides; use an object's known dimensions as an anchor when supplied. Respect depth: a distant object can look smaller, but a large statement piece must not become a miniature at the same position. Keep fixture body height, diameter and any suspension distinct. Choose plausible placement automatically, with realistic contact, shadows, reflections and lighting. Do not enlarge the room, raise the ceiling or alter product proportions to make an item fit. Do not invent measured room dimensions or claim camera calibration. Without a measured scene, the result remains an approximate visualisation, not proof of true scale or installation suitability.";
}

export function buildRenderPrompt(opts: {
  style: StylePreset | null;
  brief: string;
  guestCount: number;
  items: CatalogueItem[];
  setting?: RenderSetting;
  photoCount?: number;
  itemImageCount?: number;
  itemImageNames?: string[];
  // Decor categories with nothing the couple could order: shown plain, not invented.
  leftPlain?: string[];
}): string {
  const {
    style,
    brief,
    guestCount,
    items,
    setting = "reception",
    photoCount = 1,
    itemImageCount = 0,
    itemImageNames = [],
    leftPlain = [],
  } = opts;
  const parts: string[] = [];

  const subject =
    photoCount > 1
      ? "the first photo of a wedding venue"
      : "this photo of a wedding venue";
  parts.push(SCENE_OPENING[setting](subject));
  const refs = referenceNote(photoCount);
  if (refs) parts.push(refs);

  // Product reference images follow the venue photos.
  if (itemImageCount > 0) {
    parts.push(
      `Images ${photoCount + 1} to ${photoCount + itemImageCount} are reference photograph${itemImageCount > 1 ? "s" : ""} of specific pieces the couple has chosen. Study them carefully and reproduce each item's exact colour, material, shape and finish when you place it in the room.`,
    );
    if(itemImageNames.length===itemImageCount){
      parts.push('PRODUCT PHOTO MAP. Each image is a reference for this specific product, not for the surrounding venue or decor:\n'+itemImageNames.map((name,index)=>`Image ${photoCount+index+1}: ${cleanBrief(name)}.`).join('\n')+'\nKeep each product’s silhouette, frame finish, crystal arrangement and proportions distinct. Do not merge different chandelier designs or copy unrelated decor from reference photos. Product photos guide appearance; they do not establish rigging safety or venue suitability.');
    }
  }

  parts.push(setting === "party" ? KEEP_EVENING : KEEP_DAYLIGHT);
  parts.push(physicalScaleInstruction());
  // The couple can either start from one of our preset looks or skip them and
  // describe their own decoration. When there's no preset, their description
  // below is the whole design direction — so only add style wording if a preset
  // was chosen, and treat the free text as the decoration brief in both cases.
  if (style) {
    parts.push(
      `Style: ${STYLE_DIRECTION[style.id] ?? `${style.name}. ${style.tagline}.`}`,
    );
  } else {
    parts.push(
      "There is no preset style. Use the couple's description for mood and placement of the listed pieces. Preserve each product's actual colours, materials and construction. Leave unspecified styling unchanged.",
    );
  }
  parts.push(SCENE_LAYOUT[setting](guestCount));
  parts.push("SELECTION-ONLY EDIT. Preserve existing background objects in the venue photograph. Add only the catalogue inventory below. If the inventory contains only a chandelier, add that chandelier to the otherwise unchanged room. An empty room must stay empty apart from selected pieces. Do not dress it with unselected tables, chairs, flowers, candles or tableware, even to make a complete wedding scene.");

  // The complete inventory. Everything in the picture that the couple could buy
  // must be one of these pieces: these are in stock for their date.
  if (items.length > 0) {
    parts.push("PRODUCT PRIORITY. Catalogue identity, product photographs, verified dimensions and explicit keep/omit instructions take priority over general style suggestions. Do not replace a chosen product with a style-matched alternative or change its design to fit the mood.");
    const list = items
      .slice(0, MAX_ITEMS)
      .map((i) => `- ${cleanBrief(i.name)} [catalogue ID: ${i.id}; supplier: ${cleanBrief(i.supplier)}]${i.dimensions?`; dimensions: ${cleanBrief(i.dimensions)}`:''}${i.material?`; material: ${cleanBrief(i.material)}`:''}`)
      .join("\n");
    parts.push(
      `COMPLETE INVENTORY. These are the ONLY decorative pieces that exist for this wedding. Every element of styling in the picture (backdrop, florals, centrepieces, furniture, linen and tableware, lighting and signage) must be one of these pieces, placed where it would naturally go. Do not add any other decorative object, flower arrangement, furniture, lighting, signage, linen or prop, even if it would look nice:\n${list}`,
    );
  } else {
    parts.push(
      "No decorative pieces are available for this wedding, so leave the room plain and unstyled: do not invent any decor.",
    );
  }
  if (leftPlain.length > 0) {
    parts.push(
      `Leave these parts of the room plain and undecorated, because nothing is available for them: ${leftPlain.join(", ")}. Do not fill them with anything.`,
    );
  }

  if (brief) {
    parts.push(
      `The couple's own description. Use it for colours, mood, atmosphere and the overall feel, wherever that is physically sensible in this room. If it asks for particular objects that are not in the inventory above, do NOT add those objects; only take the colours and feeling from it: "${brief}"`,
    );
  }

  return parts.join("\n\n");
}

// A follow-up edit to an existing render: change only what was asked.
export function buildRefinePrompt(opts: {
  brief: string;
  items: CatalogueItem[];
}): string {
  const { brief, items } = opts;
  const parts: string[] = [
    "This is a styled wedding venue render. Edit it according to the couple's request below.",
    "Keep everything else exactly the same: the room's architecture, camera angle, perspective, lighting, and every piece of styling that the request does not mention. Photorealistic wedding venue photography. No people, no text, no watermarks.",
    "Catalogue identity, product photographs and verified dimensions take priority over general style suggestions. Preserve the identity of each named product.",
    "Do not introduce any new decorative object that is not already in the picture or named in the list below. Adjust position, arrangement, colour or amount of what's already there instead.",
  ];
  if (items.length > 0) {
    parts.push(
      `These are the only pieces available. If they are not already visible, you may include them where they would naturally go:\n${items
        .slice(0, MAX_ITEMS)
        .map((i) => `- ${cleanBrief(i.name)} [catalogue ID: ${i.id}; supplier: ${cleanBrief(i.supplier)}]${i.dimensions?`; dimensions: ${cleanBrief(i.dimensions)}`:""}`)
        .join("\n")}`,
    );
  }
  parts.push(physicalScaleInstruction());
  parts.push(`The couple's request: "${brief || "make a subtle improvement"}"`);
  return parts.join("\n\n");
}
