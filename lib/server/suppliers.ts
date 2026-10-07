import { loadCatalogue, type ServerCatalogueItem } from "@/lib/server/catalogue";

// Public supplier profiles, derived from the live catalogue. Because they come
// from loadCatalogue (the signed-out view), only active products from active
// suppliers are ever included — a switched-off supplier simply has no page.
// Nothing sensitive (commission, private contact) is ever read here.

export interface PublicSupplier {
  id: string;
  name: string;
  area: string;
  logoUrl?: string;
  productCount: number;
}

export interface PublicSupplierProfile extends PublicSupplier {
  products: ServerCatalogueItem[];
}

function group(items: ServerCatalogueItem[]): Map<string, ServerCatalogueItem[]> {
  const by = new Map<string, ServerCatalogueItem[]>();
  for (const item of items) {
    const list = by.get(item.supplierId) ?? [];
    list.push(item);
    by.set(item.supplierId, list);
  }
  return by;
}

// Every supplier with at least one shoppable product, alphabetical.
export async function loadPublicSuppliers(): Promise<PublicSupplier[]> {
  const items = await loadCatalogue();
  const by = group(items);
  const suppliers: PublicSupplier[] = [];
  for (const [id, list] of by) {
    suppliers.push({
      id,
      name: list[0].supplier,
      area: list[0].supplierArea,
      logoUrl: list[0].supplierLogo,
      productCount: list.length,
    });
  }
  return suppliers.sort((a, b) => a.name.localeCompare(b.name));
}

// One supplier's public profile, or null if they're off / have no live products.
export async function loadPublicSupplier(id: string): Promise<PublicSupplierProfile | null> {
  const items = await loadCatalogue();
  const mine = items.filter((i) => i.supplierId === id);
  if (mine.length === 0) return null;
  return {
    id,
    name: mine[0].supplier,
    area: mine[0].supplierArea,
    logoUrl: mine[0].supplierLogo,
    productCount: mine.length,
    products: mine,
  };
}
