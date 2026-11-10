import type { LookReport } from "./look";

export interface SavedRenderSnapshot {
  id: string;
  url: string;
  originalUrl?: string;
  itemIds: string[];
  look?: LookReport;
}

// One decoder for reopening through Saved, Boards and event restoration.
// Never treat a failed/in-progress render as a resumable preview.
export function savedRenderSnapshot(id: string, value: unknown): SavedRenderSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (data.status !== "succeeded" || typeof data.imageUrl !== "string" || !data.imageUrl || (data.renderId && data.renderId !== id)) return null;
  return {
    id, url: data.imageUrl,
    originalUrl: typeof data.originalUrl === "string" && data.originalUrl ? data.originalUrl : undefined,
    itemIds: Array.isArray(data.itemIds) ? data.itemIds.filter((v): v is string => typeof v === "string") : [],
    look: data.look && typeof data.look === "object" ? data.look as LookReport : undefined,
  };
}
