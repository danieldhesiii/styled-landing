import type {
  WeddingBrief,
  WeddingBoard,
  EventPlan,
  WorkspaceData,
  PreviewSelection,
} from "./wedding";
import { workspaceData } from "./wedding";
import { isValidDay } from "./availability";
import type { BasketLine } from "./types";

export const FIRST_EVENT_ID = "00000000-0000-4000-8000-000000000001";
export function eventWorkspace(
  brief: WeddingBrief,
  boards: WeddingBoard[],
  events: EventPlan[],
  activeId: string,
  basket: BasketLine[],
  renderId: string | null,
  previewSelection?: PreviewSelection,
): WorkspaceData {
  const base = workspaceData(brief, boards);
  const current = {
    id: activeId,
    name: "Wedding day",
    kind: "reception" as const,
    ...events.find((e) => e.id === activeId),
    brief: base.brief,
    basket,
    renderId: renderId === "placeholder" ? null : renderId,
    previewSelection: previewSelection ?? events.find((event) => event.id === activeId)?.previewSelection ?? emptyPreviewSelection(),
  };
  return {
    ...base,
    activeEventId: activeId,
    events: events.some((e) => e.id === activeId)
      ? events.map((e) => (e.id === activeId ? current : e))
      : [...events, current],
  };
}
export function eventBrief(
  plan: EventPlan,
  photos: Record<string, string>,
): WeddingBrief {
  const { photoIds, ...brief } = plan.brief;
  return {
    ...brief,
    uploadedImages: photoIds.flatMap((id) =>
      photos[id] ? [{ id, url: photos[id] }] : [],
    ),
  };
}
export function daysToEvent(date: string, now = new Date()): number | null {
  if (!isValidDay(date)) return null;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return Math.round(
    (Date.parse(date) -
      Date.parse(`${part("year")}-${part("month")}-${part("day")}`)) /
      86400000,
  );
}

export function emptyPreviewSelection(): PreviewSelection {
  return { itemIds: [], mode: "manual" };
}

export function parsePreviewSelection(raw: unknown): PreviewSelection {
  if (raw === undefined) return emptyPreviewSelection();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw Error("Invalid preview selection.");
  const value = raw as Record<string, unknown>;
  if (value.mode !== "manual" && value.mode !== "auto") throw Error("Choose a preview selection mode.");
  if (!Array.isArray(value.itemIds) || value.itemIds.length > 100 || value.itemIds.some((id) => typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,120}$/.test(id))) {
    throw Error("Invalid preview products.");
  }
  return { mode: value.mode, itemIds: [...new Set(value.itemIds)] as string[] };
}

export function togglePreviewItem(selection: PreviewSelection, itemId: string): PreviewSelection {
  return { ...selection, mode: "manual", itemIds: selection.itemIds.includes(itemId)
    ? selection.itemIds.filter((id) => id !== itemId)
    : [...selection.itemIds, itemId] };
}
