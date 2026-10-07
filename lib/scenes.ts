// The wedding "scenes" a couple can visualise. The render engine is specialised
// for these — each one gets its own layout, lighting and set of shoppable pieces,
// rather than always producing a seated reception. Client-safe (no secrets): the
// studio uses this for the picker; the server maps each id to a prompt and to the
// catalogue categories that make up the look (see lib/server/render-prompt.ts and
// lib/server/catalogue.ts).

export type SceneId = "reception" | "ceremony" | "party" | "drinks" | "proposal";

export interface Scene {
  id: SceneId;
  label: string;
  icon: string;
  blurb: string;
}

export const SCENES: Scene[] = [
  { id: "reception", label: "Reception dinner", icon: "🍽", blurb: "Seated meal — dining tables & centrepieces" },
  { id: "ceremony", label: "Ceremony", icon: "💍", blurb: "Aisle of chairs facing an arch" },
  { id: "party", label: "Evening party", icon: "🎉", blurb: "Dancefloor, band & bar, after dark" },
  { id: "drinks", label: "Drinks reception", icon: "🥂", blurb: "Standing tables, bar & lounge for mingling" },
  { id: "proposal", label: "Proposal", icon: "💐", blurb: "Intimate, romantic set-up for the question" },
];

export const DEFAULT_SCENE: SceneId = "reception";

export function isSceneId(x: unknown): x is SceneId {
  return typeof x === "string" && SCENES.some((s) => s.id === x);
}

export function getScene(id: string): Scene {
  return SCENES.find((s) => s.id === id) ?? SCENES[0];
}
