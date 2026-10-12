import type { CatalogueItem, Category } from "./types";
import { suggestedQty } from "./quote";

// Which catalogue pieces may appear in a generated picture.
//
// The rule: a piece can be in the picture only if the couple could actually order
// it for the quantity their wedding needs. So a piece is left out when it's
// withdrawn, blocked or sold out on their wedding date, or when the supplier
// simply doesn't have enough of it for their guest count. Made-to-order pieces
// (no stock limit) are always allowed.
//
// This file is pure (no database, no network) so the rule can be tested directly;
// lib/server/look.ts feeds it the live catalogue and availability. It is also
// client-safe: the studio uses the report types to show "In this picture".

export type ExclusionReason =
  | "withdrawn" // no longer sold (switched off or removed)
  | "blocked" // supplier or product is unavailable on the date
  | "short" // not enough free on the date for the quantity needed
  | "capacity"; // supplier never has enough for this guest count (no date to check)

// What the database says about one product on the wedding date.
// effectiveCapacity: null = not limited by stock, 0 = blocked that day.
export interface DayAvailability {
  effectiveCapacity: number | null;
  available: number | null;
}

export interface LookItem {
  id: string;
  name: string;
  supplier: string;
  category: Category;
  unitPricePence: number;
  unit: string;
  quantity: number; // what this wedding would normally order (per guest, per table, ...)
  image?: string;
  // How we know it's orderable: checked against the date, or only against the
  // supplier's overall stock because no date was given.
  basis: "date" | "stock";
  source: "chosen" | "substitute" | "auto";
}

export interface LookExclusion {
  itemId: string;
  name: string;
  reason: ExclusionReason;
  requestedQty: number;
  availableUnits: number | null;
  substituteId?: string;
  substituteName?: string;
}

export interface LookReport {
  date: string | null; // the wedding date it was checked against
  checked: boolean; // true if availability was checked against a real date
  guestCount: number;
  items: LookItem[];
  excluded: LookExclusion[];
  // Categories with nothing orderable: left plain in the picture rather than invented.
  leftPlain: Category[];
}

// A catalogue item as the composer needs it. `capacity` is the supplier's daily
// stock (null = made to order).
export type LookCatalogueItem = CatalogueItem & { capacity: number | null };

export interface ComposeOptions {
  catalogue: LookCatalogueItem[]; // active products from active suppliers, in shop order
  // Per-product availability for the date, or null when no usable date was given.
  availability: Map<string, DayAvailability> | null;
  date: string | null;
  guestCount: number;
  chosenIds: string[];
  styleId: string | null;
  categories: Category[]; // decor categories that make up this scene
  // Refinements keep exactly what the couple has, so they don't add or swap pieces.
  autoFill?: boolean;
  substitute?: boolean;
}

interface Verdict {
  orderable: boolean;
  reason?: ExclusionReason;
  availableUnits: number | null;
}

function judge(item: LookCatalogueItem, opts: ComposeOptions): Verdict {
  const required = suggestedQty(item, opts.guestCount);

  if (opts.availability) {
    const a = opts.availability.get(item.id);
    // Unknown to the availability check: treat as unavailable rather than guess.
    if (!a) return { orderable: false, reason: "withdrawn", availableUnits: null };
    if (a.effectiveCapacity === null || a.available === null) return { orderable: true, availableUnits: null };
    if (a.effectiveCapacity === 0) return { orderable: false, reason: "blocked", availableUnits: 0 };
    if (a.available < required) return { orderable: false, reason: "short", availableUnits: a.available };
    return { orderable: true, availableUnits: a.available };
  }

  // No date: all we can say is whether the supplier could ever cover this wedding.
  if (item.capacity === null) return { orderable: true, availableUnits: null };
  if (item.capacity < required) return { orderable: false, reason: "capacity", availableUnits: item.capacity };
  return { orderable: true, availableUnits: item.capacity };
}

const toLookItem = (item: LookCatalogueItem, opts: ComposeOptions, source: LookItem["source"]): LookItem => ({
  id: item.id,
  name: item.name,
  supplier: item.supplier,
  category: item.category,
  unitPricePence: Math.round(item.unitPrice * 100),
  unit: item.unit,
  quantity: suggestedQty(item, opts.guestCount),
  image: item.image,
  basis: opts.availability ? "date" : "stock",
  source,
});

export function composeLook(opts: ComposeOptions): { items: LookCatalogueItem[]; report: LookReport } {
  const { catalogue, chosenIds, styleId, categories } = opts;
  const autoFill = opts.autoFill !== false;
  const allowSubstitute = opts.substitute !== false;

  const byId = new Map(catalogue.map((i) => [i.id, i]));
  const verdicts = new Map(catalogue.map((i) => [i.id, judge(i, opts)]));
  const orderable = (i: LookCatalogueItem) => verdicts.get(i.id)!.orderable;

  const picks: { item: LookCatalogueItem; source: LookItem["source"] }[] = [];
  const picked = new Set<string>();
  const excluded: LookExclusion[] = [];
  const add = (item: LookCatalogueItem, source: LookItem["source"]) => {
    picks.push({ item, source });
    picked.add(item.id);
  };

  // Rank substitutes: matches the style, then the same render position, then
  // nearest in price. Stable on shop order for ties.
  const bestSubstitute = (wanted: LookCatalogueItem): LookCatalogueItem | undefined => {
    const pool = catalogue.filter(
      (c) => c.category === wanted.category && c.id !== wanted.id && orderable(c) && !picked.has(c.id)
    );
    const score = (c: LookCatalogueItem) =>
      (styleId && c.styles.includes(styleId) ? 0 : 1) * 1_000_000 +
      (c.slot === wanted.slot ? 0 : 1) * 100_000 +
      Math.min(99_999, Math.round(Math.abs(c.unitPrice - wanted.unitPrice) * 100));
    return [...pool].sort((a, b) => score(a) - score(b))[0];
  };

  // 1. What the couple chose.
  for (const id of [...new Set(chosenIds)]) {
    const item = byId.get(id);
    if (!item) {
      excluded.push({ itemId: id, name: "An item that's no longer sold", reason: "withdrawn", requestedQty: 0, availableUnits: null });
      continue;
    }
    const v = verdicts.get(id)!;
    if (v.orderable) {
      add(item, "chosen");
      continue;
    }
    const sub = allowSubstitute ? bestSubstitute(item) : undefined;
    excluded.push({
      itemId: item.id,
      name: item.name,
      reason: v.reason ?? "short",
      requestedQty: suggestedQty(item, opts.guestCount),
      availableUnits: v.availableUnits,
      ...(sub ? { substituteId: sub.id, substituteName: sub.name } : {}),
    });
    if (sub) add(sub, "substitute");
  }

  // 2. Fill each scene category the couple hasn't covered, from orderable pieces only.
  const leftPlain: Category[] = [];
  if (autoFill) {
    const covered = new Set(picks.map((p) => p.item.category));
    for (const cat of categories) {
      if (covered.has(cat)) continue;
      const pool = catalogue.filter((i) => i.category === cat && orderable(i) && !picked.has(i.id));
      const match = (styleId ? pool.find((i) => i.styles.includes(styleId)) : undefined) ?? pool[0];
      if (match) add(match, "auto");
      else leftPlain.push(cat);
    }
  }

  return {
    items: picks.map((p) => p.item),
    report: {
      date: opts.date,
      checked: opts.availability !== null,
      guestCount: opts.guestCount,
      items: picks.map((p) => toLookItem(p.item, opts, p.source)),
      excluded,
      leftPlain,
    },
  };
}

// Plain-English reason for the studio's "Left out" list.
export function exclusionText(e: LookExclusion): string {
  switch (e.reason) {
    case "blocked":
      return "isn't available on your wedding date";
    case "short":
      return e.availableUnits
        ? `only ${e.availableUnits} free on your date, and your wedding needs ${e.requestedQty}`
        : "is fully booked on your date";
    case "capacity":
      return `the supplier doesn't have enough for ${e.requestedQty}`;
    default:
      return "is no longer available";
  }
}
