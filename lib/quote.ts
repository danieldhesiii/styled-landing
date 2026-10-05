import type { BasketLine, CatalogueItem, Quote, QuoteLine } from "./types";

// Pricing rules, shared by the browser (live preview in the basket) and the
// server (the authoritative quote and the order). All arithmetic is done in
// whole pence, so a quote can never drift by rounding between the two. Nothing
// here reads the catalogue directly: callers pass a lookup, so the browser uses
// the catalogue it loaded and the server uses the database.

export const GUESTS_PER_TABLE = 10;
export const COMMISSION_RATE = 0.12; // 12% average, per the Build Plan
export const DEPOSIT_RATE = 0.25; // 25% deposit secures every supplier for the date

export type ItemLookup = (id: string) => CatalogueItem | undefined;

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

export const toPence = (gbp: number): number => Math.round(gbp * 100);

export interface PenceQuoteLine {
  item: CatalogueItem;
  quantity: number;
  unitPricePence: number;
  lineTotalPence: number;
}

export interface PenceQuote {
  lines: PenceQuoteLine[];
  subtotalPence: number;
  commissionPence: number; // Styled's margin: internal, never shown to couples
  depositPence: number;
  bySupplier: { supplier: string; area: string; totalPence: number; lines: PenceQuoteLine[] }[];
}

// The quote, in whole pence. Unknown items and non-positive quantities are
// skipped (the server rejects those before calling this).
export function quotePence(basket: BasketLine[], lookup: ItemLookup): PenceQuote {
  const lines: PenceQuoteLine[] = [];

  for (const { itemId, quantity } of basket) {
    const item = lookup(itemId);
    if (!item || !Number.isInteger(quantity) || quantity <= 0) continue;
    const unitPricePence = toPence(item.unitPrice);
    lines.push({ item, quantity, unitPricePence, lineTotalPence: unitPricePence * quantity });
  }

  const subtotalPence = lines.reduce((sum, l) => sum + l.lineTotalPence, 0);
  const commissionPence = Math.round(subtotalPence * COMMISSION_RATE);
  const depositPence = Math.round(subtotalPence * DEPOSIT_RATE);

  // Group by supplier so the couple sees who supplies what: the core of the product.
  const supplierMap = new Map<string, PenceQuoteLine[]>();
  for (const line of lines) {
    const key = line.item.supplier;
    if (!supplierMap.has(key)) supplierMap.set(key, []);
    supplierMap.get(key)!.push(line);
  }
  const bySupplier = Array.from(supplierMap.entries()).map(([supplier, ls]) => ({
    supplier,
    area: ls[0].item.supplierArea,
    totalPence: ls.reduce((s, l) => s + l.lineTotalPence, 0),
    lines: ls,
  }));

  return { lines, subtotalPence, commissionPence, depositPence, bySupplier };
}

// The same quote in pounds, in the shape the UI components already use.
export function buildQuote(basket: BasketLine[], lookup: ItemLookup): Quote {
  const q = quotePence(basket, lookup);
  const gbp = (p: number) => p / 100;
  const toLine = (l: PenceQuoteLine): QuoteLine => ({
    item: l.item,
    quantity: l.quantity,
    lineTotal: gbp(l.lineTotalPence),
  });

  return {
    lines: q.lines.map(toLine),
    subtotal: gbp(q.subtotalPence),
    commission: gbp(q.commissionPence),
    deposit: gbp(q.depositPence),
    bySupplier: q.bySupplier.map((g) => ({
      supplier: g.supplier,
      area: g.area,
      total: gbp(g.totalPence),
      lines: g.lines.map(toLine),
    })),
  };
}

// Whole pounds when there are no pence (£320), otherwise exact (£45.50), so a
// shown price always matches what is charged.
export function formatGBP(n: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);
}
