import { isValidDay, todayUtc } from "@/lib/availability";
import type { Brief } from "@/components/design/BriefStep";

export type VenueChoice = "exploring" | "looking" | "have";
export interface PlanningDetails {
  venueChoice?: VenueChoice;
  venueName?: string;
  venuePostcode?: string;
  deliverySameDay?: boolean;
  deliveryDate?: string;
  returnDate?: string;
}
export type WeddingBrief = Brief & PlanningDetails;
export interface BoardPin {
  id: string;
  kind: "product" | "photo" | "look" | "note";
  ref?: string;
  text: string;
}
export interface WeddingBoard {
  id: string;
  name: string;
  pins: BoardPin[];
}
export interface EventPlan {
  id: string;
  name: string;
  kind: "ceremony" | "reception" | "party" | "other";
  brief: Omit<WeddingBrief, "uploadedImages"> & { photoIds: string[] };
  basket: import("./types").BasketLine[];
  renderId?: string | null;
}
export interface WorkspaceData {
  events?: EventPlan[];
  activeEventId?: string;

  brief: Omit<WeddingBrief, "uploadedImages"> & { photoIds: string[] };
  boards: WeddingBoard[];
}
export const deliveryDay = (b: PlanningDetails & { weddingDate: string }) =>
  b.deliverySameDay === false ? b.deliveryDate || "" : b.weddingDate;
export function deliveryError(
  wedding: string,
  delivery: string,
): string | null {
  if (!isValidDay(wedding) || wedding < todayUtc())
    return "Choose a valid wedding date today or later.";
  if (!isValidDay(delivery) || delivery < todayUtc())
    return "Choose a valid delivery date today or later.";
  if (delivery > wedding)
    return "Delivery must be on or before your wedding day.";
  if ((Date.parse(wedding) - Date.parse(delivery)) / 86400000 > 31)
    return "Choose delivery within 31 days of your wedding. Contact Styled for a longer hire.";
  return null;
}
export function workspaceData(
  brief: WeddingBrief,
  boards: WeddingBoard[],
): WorkspaceData {
  const { uploadedImages, ...rest } = brief;
  return {
    brief: { ...rest, photoIds: uploadedImages.map((p) => p.id) },
    boards,
  };
}

// Object key order differs after server validation; compare content, not insertion order.
export function workspaceFingerprint(value: unknown): string {
  return JSON.stringify(value, (_key, entry) =>
    entry && typeof entry === "object" && !Array.isArray(entry)
      ? Object.fromEntries(
          Object.entries(entry).sort(([a], [b]) => a.localeCompare(b)),
        )
      : entry,
  );
}
