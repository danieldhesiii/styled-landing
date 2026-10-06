import type { CatalogueItem } from "@/lib/types";
import type { StylePreset } from "@/lib/types";
import { tablesFor } from "@/lib/quote";

// Builds the instruction sent to the image-edit model. The model sees the venue
// photo itself, so the prompt only has to say what to keep and what to add.

// Style wording matches the prompts used to make the landing-page renders
// (scripts/generate-renders.mjs), so generated rooms look like the marketing ones.
const STYLE_DIRECTION: Record<string, string> = {
  garden_romance:
    "Garden Romance: round tables dressed in soft ivory linen, lush blush and white garden roses with trailing greenery centrepieces, gold chiavari chairs, delicate hanging floral installations and warm fairy lights. Romantic, soft, abundant florals.",
  classic_elegance:
    "Classic Elegance, black-tie: round tables with crisp floor-length white linen, tall gold candelabra centrepieces with white roses and hydrangeas, crystal glassware, elegant chair draping and a refined formal look.",
  modern_minimal:
    "Modern Minimal: sleek long rectangular tables, a neutral palette of white and soft greige, low architectural greenery runners, clear acrylic ghost chairs, simple candles, uncluttered and contemporary.",
  rustic_barn:
    "Wildflower: timber trestle guest tables, crossback chairs, sage napkins, loose meadow flowers and mixed foliage runners, warm festoon lights overhead, relaxed natural charm.",
};

const KEEP =
  "Preserve exactly the venue's architecture: walls, windows, doors, ceiling, beams, floor, the view outside, the camera angle, perspective and natural light. Only add and change wedding styling inside the room. Photorealistic wedding venue photography. No people, no text, no watermarks.";

export const MAX_BRIEF_CHARS = 600;
export const MAX_ITEMS = 12;

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
  style: StylePreset;
  brief: string;
  guestCount: number;
  items: CatalogueItem[];
  photoCount?: number;
  itemImageCount?: number;
}): string {
  const { style, brief, guestCount, items, photoCount = 1, itemImageCount = 0 } = opts;
  const parts: string[] = [];

  parts.push(
    photoCount > 1
      ? "Restyle the first photo of a wedding venue as a finished wedding reception, set and ready for the day."
      : "Restyle this photo of a wedding venue as a finished wedding reception, set and ready for the day."
  );
  const refs = referenceNote(photoCount);
  if (refs) parts.push(refs);

  // Product reference images follow the venue photos.
  if (itemImageCount > 0) {
    parts.push(
      `The last ${itemImageCount} image${itemImageCount > 1 ? "s are" : " is"} reference photograph${itemImageCount > 1 ? "s" : ""} of specific pieces the couple has chosen. Study them carefully and reproduce each item's exact colour, material, shape and finish when you place it in the room.`
    );
  }

  parts.push(KEEP);
  parts.push(`Style: ${STYLE_DIRECTION[style.id] ?? `${style.name}. ${style.tagline}.`}`);
  parts.push(
    `The wedding is for about ${guestCount} guests, which is roughly ${tablesFor(guestCount)} tables. Show as many tables as fit the room naturally with sensible spacing and a clear walkway; do not cram the room.`
  );

  if (items.length > 0) {
    const list = items
      .slice(0, MAX_ITEMS)
      .map((i) => `- ${i.name}`)
      .join("\n");
    parts.push(
      `The couple has chosen these specific pieces. Include each one where it would naturally go:\n${list}`
    );
  }

  if (brief) {
    parts.push(
      `The couple's own wishes, to follow wherever they are physically sensible in this room: "${brief}"`
    );
  }

  return parts.join("\n\n");
}

// A follow-up edit to an existing render: change only what was asked.
export function buildRefinePrompt(opts: { brief: string; items: CatalogueItem[] }): string {
  const { brief, items } = opts;
  const parts: string[] = [
    "This is a styled wedding venue render. Edit it according to the couple's request below.",
    "Keep everything else exactly the same: the room's architecture, camera angle, perspective, lighting, and every piece of styling that the request does not mention. Photorealistic wedding venue photography. No people, no text, no watermarks.",
  ];
  if (items.length > 0) {
    parts.push(
      `If they are not already visible, also include these chosen pieces where they would naturally go:\n${items
        .slice(0, MAX_ITEMS)
        .map((i) => `- ${i.name}`)
        .join("\n")}`
    );
  }
  parts.push(`The couple's request: "${brief || "make a subtle improvement"}"`);
  return parts.join("\n\n");
}
