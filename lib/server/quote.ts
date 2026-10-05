import { loadCatalogue, type ServerCatalogueItem } from "@/lib/server/catalogue";
import { quotePence, toPence, type PenceQuote } from "@/lib/quote";

// The authoritative quote. The browser's basket is only a request ("these items,
// these quantities"); prices, availability and totals are all decided here from
// the database.

export const MAX_LINES = 60;
export const MAX_QUANTITY = 2000;
export const MAX_SUBTOTAL_PENCE = 50_000_000; // £500,000: a sanity ceiling, not a business rule

export interface ValidLine {
  itemId: string;
  quantity: number;
  seenUnitPricePence?: number;
}

export type Failure = { ok: false; status: number; error: string; extra?: Record<string, unknown> };

export function validateBasket(raw: unknown): { ok: true; lines: ValidLine[] } | Failure {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { ok: false, status: 400, error: "Your basket is empty." };
  }
  if (raw.length > MAX_LINES) {
    return { ok: false, status: 400, error: `A basket can hold up to ${MAX_LINES} different items.` };
  }

  const lines: ValidLine[] = [];
  const seen = new Set<string>();
  for (const l of raw) {
    const itemId = (l as { itemId?: unknown })?.itemId;
    const quantity = (l as { quantity?: unknown })?.quantity;
    const seenPrice = (l as { seenUnitPricePence?: unknown })?.seenUnitPricePence;

    if (typeof itemId !== "string" || !itemId || itemId.length > 64) {
      return { ok: false, status: 400, error: "Invalid item in basket." };
    }
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      return { ok: false, status: 400, error: `Quantities must be whole numbers from 1 to ${MAX_QUANTITY}.` };
    }
    if (seen.has(itemId)) {
      return { ok: false, status: 400, error: "Each item can only appear once; change its quantity instead." };
    }
    if (seenPrice !== undefined && (typeof seenPrice !== "number" || !Number.isInteger(seenPrice) || seenPrice < 0)) {
      return { ok: false, status: 400, error: "Invalid price in basket." };
    }
    seen.add(itemId);
    lines.push({ itemId, quantity, seenUnitPricePence: seenPrice as number | undefined });
  }
  return { ok: true, lines };
}

export interface PricedBasket {
  ok: true;
  quote: PenceQuote;
  items: Map<string, ServerCatalogueItem>;
  lines: ValidLine[];
}

// Validate a basket and price it from the live catalogue. Fails (400) on any
// item that doesn't exist or has been withdrawn, and (409) if the couple was
// shown a price that has since changed, so nobody is charged more than they saw.
export async function priceBasket(raw: unknown): Promise<PricedBasket | Failure> {
  const valid = validateBasket(raw);
  if (!valid.ok) return valid;

  const catalogue = await loadCatalogue();
  const items = new Map(catalogue.map((i) => [i.id, i]));

  const unavailable = valid.lines.filter((l) => !items.has(l.itemId)).map((l) => l.itemId);
  if (unavailable.length > 0) {
    return {
      ok: false,
      status: 400,
      error: "Some items are no longer available. Please remove them and try again.",
      extra: { unavailable },
    };
  }

  const changed = valid.lines
    .filter((l) => l.seenUnitPricePence !== undefined && l.seenUnitPricePence !== toPence(items.get(l.itemId)!.unitPrice))
    .map((l) => {
      const item = items.get(l.itemId)!;
      return { itemId: l.itemId, name: item.name, seenUnitPricePence: l.seenUnitPricePence, unitPricePence: toPence(item.unitPrice) };
    });
  if (changed.length > 0) {
    return { ok: false, status: 409, error: "Some prices have changed since you added them. Please review your basket.", extra: { changed } };
  }

  const quote = quotePence(valid.lines, (id) => items.get(id));
  if (quote.subtotalPence > MAX_SUBTOTAL_PENCE) {
    return { ok: false, status: 400, error: "That basket is larger than we can take online. Please contact us." };
  }
  return { ok: true, quote, items, lines: valid.lines };
}

// What couples are shown. Commission is Styled's margin and stays server-side.
export function publicQuote(quote: PenceQuote) {
  return {
    lines: quote.lines.map((l) => ({
      itemId: l.item.id,
      name: l.item.name,
      supplier: l.item.supplier,
      unit: l.item.unit,
      quantity: l.quantity,
      unitPricePence: l.unitPricePence,
      lineTotalPence: l.lineTotalPence,
    })),
    subtotalPence: quote.subtotalPence,
    depositPence: quote.depositPence,
    balancePence: quote.subtotalPence - quote.depositPence,
    bySupplier: quote.bySupplier.map((g) => ({
      supplier: g.supplier,
      area: g.area,
      totalPence: g.totalPence,
    })),
  };
}
