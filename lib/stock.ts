import type { StockStatus } from "./types";

// Placeholder live-availability layer. Today this reads the static `stock` field
// on each catalogue item. When we integrate vendor inventory feeds, this is the
// single place that will call out to each supplier's stock/availability API
// (keyed by supplier + wedding date) so a couple can never book something that
// isn't actually available for their date.
export interface StockInfo {
  status: StockStatus;
  label: string;
  tone: "ok" | "warn" | "muted";
}

const MAP: Record<StockStatus, Omit<StockInfo, "status">> = {
  in_stock: { label: "Available for your date", tone: "ok" },
  low_stock: { label: "Limited for your date", tone: "warn" },
  made_to_order: { label: "Made to order", tone: "muted" },
};

export function stockInfo(status: StockStatus): StockInfo {
  return { status, ...MAP[status] };
}
