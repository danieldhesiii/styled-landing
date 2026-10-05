import type { CatalogueItem, Category, QtyRule, Slot, StockStatus } from "@/lib/types";
import { createAnonClient } from "@/lib/supabase/anon";

// The live catalogue, read from the database as a signed-out visitor, so only
// active products from active suppliers come back. Always fresh: quotes and
// orders must never be priced from a stale copy.

export interface ServerCatalogueItem extends CatalogueItem {
  supplierId: string;
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
  suppliers: { id: string; name: string; area: string } | null;
}

const COLUMNS =
  "id, name, category, slot, unit_price_pence, unit, qty_rule, styles, image, rating, review_count, lead_time_days, stock, capacity, note, icon, swatch, updated_at, suppliers(id, name, area)";

export async function loadCatalogue(): Promise<ServerCatalogueItem[]> {
  const { data, error } = await createAnonClient()
    .from("products")
    .select(COLUMNS)
    .order("sort_order", { ascending: true })
    .returns<ProductRow[]>();
  if (error) throw new Error(`Couldn't load the catalogue: ${error.message}`);

  return (data ?? [])
    .filter((r) => r.suppliers) // supplier switched off: product is unavailable too
    .map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category as Category,
      slot: (r.slot ?? undefined) as Slot | undefined,
      supplier: r.suppliers!.name,
      supplierArea: r.suppliers!.area,
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
      supplierId: r.suppliers!.id,
      updatedAt: r.updated_at,
    }));
}

export async function loadItemsById(ids: string[]): Promise<Map<string, ServerCatalogueItem>> {
  const wanted = new Set(ids);
  const all = await loadCatalogue();
  return new Map(all.filter((i) => wanted.has(i.id)).map((i) => [i.id, i]));
}
