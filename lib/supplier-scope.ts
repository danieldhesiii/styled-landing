export function parseSupplierScope(raw: unknown): string | null {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)) throw Error("Choose a valid supplier.");
  return raw;
}
export function scopeSupplierItems<T extends {supplierId?: string}>(items:T[], supplierId:string|null):T[]{
  return supplierId ? items.filter(i=>i.supplierId===supplierId) : items;
}
