import type {
  WeddingBrief,
  WeddingBoard,
  EventPlan,
  WorkspaceData,
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
