import type { BasketLine, CatalogueItem, Quote, QuoteLine } from "./types";
import { CATALOGUE, getItem } from "./catalogue";

export const GUESTS_PER_TABLE = 10;
export const COMMISSION_RATE = 0.12; // 12% average, per the Build Plan
export const DEPOSIT_RATE = 0.25; // 25% deposit secures every supplier for the date

export function tablesFor(guestCount: number): number {
  return Math.max(1, Math.ceil(guestCount / GUESTS_PER_TABLE));
}

// Suggested quantity for an item given the guest count and its qty rule. The
// couple can override it in the basket, but this is the sensible default.
export function suggestedQty(item: CatalogueItem, guestCount: number): number {
  switch (item.qtyRule) {
    case "per_guest":
      return guestCount;
    case "per_table":
      return tablesFor(guestCount);
    case "per_venue":
    case "fixed":
    default:
      return 1;
  }
}

// Build a full quote from a basket (list of item ids + quantities). Groups by
// supplier so the couple sees who supplies what — the core of the product.
export function buildQuote(basket: BasketLine[]): Quote {
  const lines: QuoteLine[] = [];

  for (const { itemId, quantity } of basket) {
    const item = getItem(itemId);
    if (!item || quantity <= 0) continue;
    const lineTotal = Math.round(item.unitPrice * quantity);
    lines.push({ item, quantity, lineTotal });
  }

  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const commission = Math.round(subtotal * COMMISSION_RATE);
  const deposit = Math.round(subtotal * DEPOSIT_RATE);

  const supplierMap = new Map<string, QuoteLine[]>();
  for (const line of lines) {
    const key = line.item.supplier;
    if (!supplierMap.has(key)) supplierMap.set(key, []);
    supplierMap.get(key)!.push(line);
  }

  const bySupplier = Array.from(supplierMap.entries()).map(([supplier, ls]) => ({
    supplier,
    area: ls[0].item.supplierArea,
    total: ls.reduce((s, l) => s + l.lineTotal, 0),
    lines: ls,
  }));

  return { lines, subtotal, commission, deposit, bySupplier };
}

export function formatGBP(n: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(n);
}

export function supplierCount(): number {
  return new Set(CATALOGUE.map((i) => i.supplier)).size;
}
