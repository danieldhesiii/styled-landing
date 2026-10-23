import type { CatalogueItem } from "@/lib/types";
import type { StylePreset } from "@/lib/types";
import type { SceneId } from "@/lib/scenes";
import { tablesFor } from "@/lib/quote";

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
    `Restyle ${s} as a finished wedding reception, set and ready for the day.`,
  ceremony: (s) =>
    `Set up ${s} for a wedding CEREMONY: a finished, photorealistic scene, ready for the couple to marry.`,
  party: (s) =>
    `Restyle ${s} as an evening wedding reception party, set for dancing and celebrating after dark.`,
  drinks: (s) =>
    `Restyle ${s} as a wedding drinks reception, set for guests to mingle with drinks and canapés.`,
  proposal: (s) =>
    `Restyle ${s} as an intimate, romantic marriage-proposal setting for just two people.`,
};

const SCENE_LAYOUT: Record<SceneId, (guests: number) => string> = {
  reception: (g) =>
    `The wedding is for about ${g} guests, which is roughly ${tablesFor(g)} tables. Show as many dining tables as fit the room naturally with sensible spacing and a clear walkway; do not cram the room.`,
  ceremony: (g) =>
    `Lay the room out for the ceremony: neat rows of chairs all facing forward towards the front of the room, in two blocks with a clear central aisle running down the middle for the couple to walk down. Seat about ${g} guests. At the front, at the head of the aisle, place the ceremony focal point: an arch or floral backdrop where the couple will stand. Do NOT use any dining or banquet tables; this is the ceremony, not the meal.`,
  party: (g) =>
    `Lay the room out for the evening party, for about ${g} guests: a clear central dancefloor, a stage or DJ booth at one end, a statement bar to one side, and relaxed lounge seating with a few small cocktail tables around the edges. Warm, atmospheric evening lighting: festoon lights, uplighting and candles. Energetic but elegant; no formal dining tables down the middle.`,
  drinks: (g) =>
    `Lay the room out for a standing drinks reception, for about ${g} guests: a stylish bar, scattered tall poseur / cocktail tables for guests to gather around, a few lounge seating clusters and plenty of room to mingle. No formal seated dining tables.`,
  proposal: () =>
    `Set the room for an intimate marriage proposal: a single romantic focal set-up for two, centred in the space, with soft candlelight, lush florals, perhaps rose petals and fairy lights. No rows of guest chairs and no dining tables; this is a private, romantic moment, not an event for guests.`,
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

export function buildRenderPrompt(opts: {
  style: StylePreset | null;
  brief: string;
  guestCount: number;
  items: CatalogueItem[];
  setting?: RenderSetting;
  photoCount?: number;
  itemImageCount?: number;
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
  }

  parts.push(setting === "party" ? KEEP_EVENING : KEEP_DAYLIGHT);
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
      "There is no preset style. Design the decor entirely from the couple's own description below: follow its colours, flowers, materials, lighting and overall mood exactly, and fill in tasteful, cohesive wedding styling for anything they don't specify.",
    );
  }
  parts.push(SCENE_LAYOUT[setting](guestCount));

  // The complete inventory. Everything in the picture that the couple could buy
  // must be one of these pieces: these are in stock for their date.
  if (items.length > 0) {
    const list = items
      .slice(0, MAX_ITEMS)
      .map((i) => `- ${i.name}`)
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
    "Do not introduce any new decorative object that is not already in the picture or named in the list below. Adjust position, arrangement, colour or amount of what's already there instead.",
  ];
  if (items.length > 0) {
    parts.push(
      `These are the only pieces available. If they are not already visible, you may include them where they would naturally go:\n${items
        .slice(0, MAX_ITEMS)
        .map((i) => `- ${i.name}`)
        .join("\n")}`,
    );
  }
  parts.push(`The couple's request: "${brief || "make a subtle improvement"}"`);
  return parts.join("\n\n");
}
