import {namedProducts, rankProducts, ProductMatchError} from "@/lib/product-matching";
import {parseSupplierScope,scopeSupplierItems} from "@/lib/supplier-scope";
import {venueCatalogue} from "./venue-catalogue";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  loadCatalogue,
  SCENE_CATEGORIES,
  type ServerCatalogueItem,
} from "@/lib/server/catalogue";
import { loadAvailability } from "@/lib/server/availability";
import { composeLook, type DayAvailability, type LookReport } from "@/lib/look";
import { isValidDay, todayUtc } from "@/lib/availability";
import type { SceneId } from "@/lib/scenes";

// Decide which catalogue pieces a render may show, from the LIVE catalogue and
// the LIVE availability for the couple's wedding date. See lib/look.ts for the
// rule. Used by /api/generate so nothing appears in a picture that the couple
// couldn't go on to order.

export interface OrderableLook {
  items: ServerCatalogueItem[];
  report: LookReport;
  namedIds?: string[];
  excludedNamedIds?:string[];
}

// A wedding date we can check against: a real calendar day, today or later.
export function usableDate(value: unknown): string | null {
  return isValidDay(value) && value >= todayUtc() ? value : null;
}

export async function composeOrderableLook(opts: {
  brief?:string;
  venueSlug?:string;
  supplierId?:string|null;
  styleId: string | null;
  chosenIds: string[];
  setting: SceneId;
  weddingDate: string | null;
  deliveryDate?: string | null;
  guestCount: number;
  selectionMode?: "manual" | "auto";
  autoFill?: boolean;
  substitute?: boolean;
}): Promise<OrderableLook> {
  const all = await loadCatalogue();
  const supplierId=parseSupplierScope(opts.supplierId);
  const scopedCatalogue=scopeSupplierItems(opts.venueSlug?(await venueCatalogue(opts.venueSlug,all)).items:all,supplierId);
  const allNamed=namedProducts(opts.brief||"",all);
  if(allNamed.items.some(item=>!scopedCatalogue.some(allowed=>allowed.id===item.id)))throw new ProductMatchError('A named product is outside this venue or supplier selection. Choose an eligible product.');
  const matches=namedProducts(opts.brief||"",scopedCatalogue);
  const catalogue=rankProducts(scopedCatalogue.filter(item=>!matches.excludedIds.includes(item.id)),opts.brief||"",opts.styleId);
  const namedIds=matches.items.map(item=>item.id);
  const manual = opts.selectionMode === "manual";
  if (manual && (matches.items.some(item => !opts.chosenIds.includes(item.id)) || opts.chosenIds.some(id => matches.excludedIds.includes(id)))) {
    throw new ProductMatchError('Your description conflicts with your selected products. Update your selection or use Choose for me.');
  }
  const chosenIds = manual ? [...new Set(opts.chosenIds)] : [...namedIds, ...opts.chosenIds.filter(id => {
    if (matches.excludedIds.includes(id)) return false;
    const previous = scopedCatalogue.find(item => item.id === id);
    return !previous || !matches.items.some(named => named.slot ? named.slot === previous.slot : !previous.slot && named.category === previous.category);
  })];
  // Manual mode checks only the selected orderable products. Preview-only
  // references are handled separately and never receive fabricated stock checks.
  const composedCatalogue = manual ? catalogue.filter(item => chosenIds.includes(item.id)) : catalogue;
  const date = usableDate(opts.weddingDate);

  let availability: Map<string, DayAvailability> | null = null;
  if (date && composedCatalogue.length > 0) {
    const raw = await loadAvailability(
      createAdminClient(),
      composedCatalogue.map((i) => i.id),
      date,
      undefined,
      opts.deliveryDate || date,
    );
    availability = new Map(
      [...raw].map(([id, a]) => [
        id,
        { effectiveCapacity: a.effectiveCapacity, available: a.available },
      ]),
    );
  }

  const { items, report } = composeLook({
    catalogue: composedCatalogue,
    availability,
    date,
    guestCount: opts.guestCount,
    chosenIds,
    styleId: opts.styleId,
    categories: SCENE_CATEGORIES[opts.setting],
    autoFill: manual ? false : opts.autoFill,
    substitute: chosenIds.length ? false : opts.substitute,
  });

  const unavailableSelections = (report.excluded || []).filter(item => chosenIds.includes(item.itemId));
  if (unavailableSelections.length) {
    throw new ProductMatchError(`${unavailableSelections.map(item => item.name).join(', ')} cannot be supplied for these dates or quantities. Review your selected products before trying again.`);
  }

  const missingNamed=matches.items.filter(item=>!items.some(chosen=>chosen.id===item.id));
  if(missingNamed.length) throw new ProductMatchError(`${missingNamed.map(item=>item.name).join(', ')} cannot be supplied for these dates or quantities. Change the request rather than substituting a different named product.`);
  report.supplierId=supplierId;
  report.venueSlug=opts.venueSlug||null;
  const byId = new Map(catalogue.map((i) => [i.id, i]));
  return { items: items.map((i) => byId.get(i.id)!), report, namedIds, excludedNamedIds:matches.excludedIds };
}
