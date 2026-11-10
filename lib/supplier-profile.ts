import type { CatalogueItem } from "./types";

export function supplierProfileId(item: CatalogueItem) {
  return item.supplierId || (item.id.startsWith("demo-crescent-moon-") ? "crescent-moon" : undefined);
}
