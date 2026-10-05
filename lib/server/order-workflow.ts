// The rules for moving an order through staff review. Pure, so they're easy to
// test and the UI and API can't disagree.

export type OrderStatus = "requested" | "confirmed" | "declined" | "cancelled" | "deposit_paid";
export type LineStatus = "pending" | "confirmed" | "declined";

// requested  = waiting for a stylist to check every supplier
// confirmed  = every supplier has confirmed the date
// declined   = Styled can't deliver this order (couple is told why)
// cancelled  = called off after the fact
// deposit_paid is set by the payment flow, never by hand
export const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  requested: ["confirmed", "declined", "cancelled"],
  confirmed: ["cancelled"],
  declined: [],
  cancelled: [],
  deposit_paid: [],
};

export const STAFF_SETTABLE: OrderStatus[] = ["confirmed", "declined", "cancelled"];

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

// An order can only be confirmed once every supplier line is confirmed.
export function blockingLines<T extends { supplier_status: string }>(lines: T[]): T[] {
  return lines.filter((l) => l.supplier_status !== "confirmed");
}

// Line decisions are only possible while the order is still being reviewed.
export const lineEditable = (status: OrderStatus) => status === "requested";
