// Availability rules shared by the server (which computes it) and the browser
// (which labels it). The numbers come from the database function
// public.product_availability; this file only decides what to call them.

export type AvailabilityStatus = "available" | "limited" | "unavailable" | "made_to_order";

export interface ItemAvailability {
  status: AvailabilityStatus;
  // Units left on the day. Only reported when it matters (limited / unavailable).
  availableUnits: number | null;
  requiredQty: number;
  reason?: "blocked" | "short";
}

// effectiveCapacity: null = not limited by stock (made to order), 0 = blocked.
export function classifyAvailability(
  a: { effectiveCapacity: number | null; available: number | null },
  requiredQty: number
): ItemAvailability {
  if (a.effectiveCapacity === null || a.available === null) {
    return { status: "made_to_order", availableUnits: null, requiredQty };
  }
  if (a.effectiveCapacity === 0) {
    return { status: "unavailable", availableUnits: 0, requiredQty, reason: "blocked" };
  }
  if (a.available < requiredQty) {
    return { status: "unavailable", availableUnits: a.available, requiredQty, reason: "short" };
  }
  // Fits, but taking it would leave less than the same amount again.
  if (a.available < requiredQty * 2) {
    return { status: "limited", availableUnits: a.available, requiredQty };
  }
  return { status: "available", availableUnits: null, requiredQty };
}

export type BadgeTone = "ok" | "warn" | "bad" | "muted";

export function availabilityLabel(a: ItemAvailability): { label: string; tone: BadgeTone } {
  switch (a.status) {
    case "available":
      return { label: "Available for your date", tone: "ok" };
    case "limited":
      return {
        label: a.availableUnits != null ? `Limited: ${a.availableUnits} left for your date` : "Limited for your date",
        tone: "warn",
      };
    case "unavailable":
      return {
        label:
          a.reason === "blocked" || !a.availableUnits
            ? "Not available on your date"
            : `Only ${a.availableUnits} available on your date`,
        tone: "bad",
      };
    default:
      return { label: "Made to order", tone: "muted" };
  }
}

export const DAY = /^\d{4}-\d{2}-\d{2}$/;

// A real calendar day written YYYY-MM-DD.
export function isValidDay(s: unknown): s is string {
  if (typeof s !== "string" || !DAY.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}
