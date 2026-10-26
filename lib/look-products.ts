import type { CatalogueItem } from "./types";
import type { LookReport } from "./look";

/** Recorded products stay tied to their version. Demo images have suggestions only. */
export function productsForLook(opts: {
  catalogue: CatalogueItem[];
  itemIds: string[];
  report?: LookReport;
  illustrative: boolean;
  styleId?: string;
}): { items: CatalogueItem[]; suggested: boolean; missing: number } {
  const recorded = [...new Set([...opts.itemIds, ...(opts.report?.items.map(i => i.id) || [])])];
  const byId = new Map(opts.catalogue.map(i => [i.id, i]));
  if (!opts.illustrative) {
    const items = recorded.flatMap(id => byId.has(id) ? [byId.get(id)!] : []);
    return { items, suggested: false, missing: recorded.length - items.length };
  }
  // A stock demo image was not generated from supplier products. Offer a small,
  // style-matched selection without claiming those exact pieces are pictured.
  const candidates = opts.catalogue.filter(i => i.slot && opts.styleId && i.styles.includes(opts.styleId));
  const slots = new Set<string>();
  const items = candidates.filter(i => {
    if (slots.has(i.slot!)) return false;
    slots.add(i.slot!);
    return true;
  }).slice(0, 8);
  return { items, suggested: true, missing: 0 };
}
