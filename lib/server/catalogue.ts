import {linkedCrescentProduct,crescentTestSupplier} from "./crescent-call-demo";
import {money} from "@/lib/supplier-workspace";
import type { CatalogueItem, Category, QtyRule, Slot, StockStatus } from "@/lib/types";
import type { SceneId } from "@/lib/scenes";
import { createAnonClient } from "@/lib/supabase/anon";

// The live catalogue, read from the database as a signed-out visitor, so only
// active products from active suppliers come back. Always fresh: quotes and
// orders must never be priced from a stale copy.

export interface ServerCatalogueItem extends CatalogueItem {
  supplierServiceArea?: string;
  capacity: number | null; // units the supplier can provide per day; null = made to order
  supplierId: string;
  supplierLogo?: string;
  updatedAt: string;
}

interface ProductRow {
  id: string;
  name: string;
  category: string;
  slot: string | null;
  unit_price_pence: number;
  unit: string;
  qty_rule: string;
  styles: string[] | null;
  image: string | null;
  rating: number | string | null;
  review_count: number | null;
  lead_time_days: number | null;
  stock: string;
  capacity: number | null;
  note: string | null;
  icon: string;
  swatch: string;
  updated_at: string;
  details: {dimensions?:string;material?:string;hireUnits?:string;deliveryTerms?:string;damageTerms?:string} | null;
  suppliers: { id: string; name: string; area: string; logo_url: string | null; service_details?:{minimumOrder?:string;coverage?:string} } | null;
}

const COLUMNS =
  "id, name, category, slot, unit_price_pence, unit, qty_rule, styles, image, rating, review_count, lead_time_days, stock, capacity, note, icon, swatch, updated_at, details, suppliers(id, name, area, logo_url, service_details)";

export async function loadCatalogue(supplierId?: string): Promise<ServerCatalogueItem[]> {
  const client = createAnonClient();
  const rows: ProductRow[] = [];
  const batchSize = 500;
  for (let start = 0; ; start += batchSize) {
    let query = client.from("products").select(COLUMNS);
    if (supplierId) query = query.eq("supplier_id", supplierId);
    const { data, error } = await query
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true })
      .range(start, start + batchSize - 1)
      .returns<ProductRow[]>();
    if (error) throw new Error(`Couldn't load the catalogue: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < batchSize) break;
  }

  return rows
    .filter((r) => r.suppliers && r.category !== "stationery") // supplier switched off: product is unavailable too
    .map((r) => ({
      ...(linkedCrescentProduct(r.id) && r.suppliers!.id === crescentTestSupplier ? {imageKind:"supplier_reference" as const} : {}),
      id: r.id,
      name: r.name,
      category: r.category as Category,
      slot: (r.slot ?? undefined) as Slot | undefined,
      supplier: r.suppliers!.name,
      supplierArea: r.suppliers!.area,
      supplierServiceArea: r.suppliers!.service_details?.coverage || undefined,
      unitPrice: r.unit_price_pence / 100,
      unit: r.unit,
      qtyRule: r.qty_rule as QtyRule,
      styles: r.styles ?? [],
      icon: r.icon,
      swatch: r.swatch,
      image: r.image ?? undefined,
      rating: Number(r.rating ?? 0),
      reviewCount: r.review_count ?? 0,
      leadTimeDays: r.lead_time_days ?? 0,
      // Not limited by stock = made to order. (Day-by-day availability is separate:
      // see /api/availability.) The seed's placeholder stock label is no longer used.
      stock: (r.capacity === null ? "made_to_order" : "in_stock") as StockStatus,
      note: r.note ?? undefined,
      dimensions:r.details?.dimensions||undefined,material:r.details?.material||undefined,hireUnits:r.details?.hireUnits||undefined,deliveryTerms:r.details?.deliveryTerms||undefined,damageTerms:r.details?.damageTerms||undefined,
      capacity: r.capacity,
      supplierId: r.suppliers!.id,
      supplierMinimumPence: money(r.suppliers!.service_details?.minimumOrder||"")||undefined,
      supplierLogo: r.suppliers!.logo_url ?? undefined,
      updatedAt: r.updated_at,
    }));
}

export async function loadItemsById(ids: string[]): Promise<Map<string, ServerCatalogueItem>> {
  const wanted = new Set(ids);
  const all = await loadCatalogue();
  return new Map(all.filter((i) => wanted.has(i.id)).map((i) => [i.id, i]));
}

// The decor categories that appear in each wedding scene. We compose a render
// only from catalogue pieces across these categories, so everything in the
// picture is real and buyable, and "Shop this look" can list exactly them. The
// set depends on the scene: a reception has dining tables, centrepieces and
// tableware; a ceremony has chairs and an arch but no dining; a party leans on a
// bar, lighting and lounge furniture; a proposal is just florals and lighting.
export const SCENE_CATEGORIES: Record<SceneId, Category[]> = {
  reception: ["backdrops", "florals", "centrepieces", "furniture", "linen_tableware", "lighting", "signage"],
  ceremony: ["backdrops", "florals", "furniture", "lighting", "signage"],
  party: ["backdrops", "florals", "furniture", "lighting", "signage", "bar"],
  drinks: ["florals", "furniture", "lighting", "signage", "bar"],
  proposal: ["backdrops", "florals", "lighting"],
};

// DEPRECATED for renders: this ignores stock and the wedding date. Renders now use
// composeOrderableLook (lib/server/look.ts), which only picks pieces the couple can
// actually order. Kept only so nothing else that imports it breaks.
// Choose the catalogue pieces a render will be built from: everything the couple
// has already chosen, plus one style-matched piece for each relevant decor
// category they haven't covered — so the picture is a complete look made entirely
// of real products. With no preset style, the first piece in each category is used.
export async function selectLookItems(opts: {
  styleId: string | null;
  chosenIds: string[];
  setting?: SceneId;
}): Promise<ServerCatalogueItem[]> {
  const categories = SCENE_CATEGORIES[opts.setting ?? "reception"] ?? SCENE_CATEGORIES.reception;
  const all = await loadCatalogue();
  const byId = new Map(all.map((i) => [i.id, i]));
  const chosen = opts.chosenIds
    .map((id) => byId.get(id))
    .filter((i): i is ServerCatalogueItem => !!i);
  const covered = new Set(chosen.map((i) => i.category));
  const picks = [...chosen];
  for (const cat of categories) {
    if (covered.has(cat)) continue;
    const inCat = all.filter((i) => i.category === cat);
    const match =
      (opts.styleId ? inCat.find((i) => i.styles.includes(opts.styleId!)) : undefined) ?? inCat[0];
    if (match) picks.push(match);
  }
  return picks;
}
