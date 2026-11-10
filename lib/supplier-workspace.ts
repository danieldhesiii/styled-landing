import { VENDOR_CATEGORY_VALUES } from "./vendor-categories";
import { QTY_RULE_VALUES } from "./product-options";
import { STYLES } from "./styles";
export type SupplierServices = {
  coverage: string;
  delivery: boolean;
  collection: boolean;
  setup: boolean;
  minimumOrder: string;
  deliveryNotes: string;
  returnNotes: string;
  depositPercent: string;
  balanceDays: string;
  cancellation: string;
  damage: string;
};
export const EMPTY_SERVICES: SupplierServices = {
  coverage: "",
  delivery: false,
  collection: false,
  setup: false,
  minimumOrder: "",
  deliveryNotes: "",
  returnNotes: "",
  depositPercent: "",
  balanceDays: "",
  cancellation: "",
  damage: "",
};
export const SERVICE_LABELS: Record<string, string> = {
  coverage: "Areas you serve",
  deliveryNotes: "Delivery, collection and setup",
  returnNotes: "Returns and collection arrangements",
  cancellation: "Changes and cancellation",
  damage: "Damage and missing items",
};
export function money(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d{1,7}(\.\d{1,2})?$/.test(value.trim()))
    return null;
  const n = Math.round(Number(value) * 100);
  return n <= 100000000 ? n : null;
}
export function servicesInput(input: unknown): SupplierServices | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const b = input as Record<string, unknown>;
  const result = { ...EMPTY_SERVICES };
  for (const k of ["delivery", "collection", "setup"] as const) {
    if (typeof b[k] !== "boolean") return null;
    result[k] = b[k];
  }
  for (const k of Object.keys(EMPTY_SERVICES).filter(
    (k) => !["delivery", "collection", "setup"].includes(k),
  ) as (keyof Omit<SupplierServices, "delivery" | "collection" | "setup">)[]) {
    if (typeof b[k] !== "string") return null;
    const v = (b[k] as string).trim();
    if (v.includes("\0") || v.length > (k === "coverage" ? 300 : 1500))
      return null;
    result[k] = v;
  }
  if (result.minimumOrder && money(result.minimumOrder) === null) return null;
  if (
    result.depositPercent &&
    (!/^\d{1,3}(\.\d{1,2})?$/.test(result.depositPercent) ||
      Number(result.depositPercent) > 100)
  )
    return null;
  if (
    result.balanceDays &&
    (!/^\d{1,3}$/.test(result.balanceDays) || Number(result.balanceDays) > 365)
  )
    return null;
  return result;
}
export type ProductDetails = {
  dimensions: string;
  material: string;
  hireUnits: string;
  deliveryTerms: string;
  damageTerms: string;
};
export const EMPTY_PRODUCT_DETAILS: ProductDetails = {
  dimensions: "",
  material: "",
  hireUnits: "",
  deliveryTerms: "",
  damageTerms: "",
};
export type ProductDraft = {
  name: string;
  category: string;
  unitPrice: string;
  unit: string;
  qtyRule: string;
  capacity: string;
  leadTimeDays: string;
  note: string;
  styles: string[];
  details: ProductDetails;
};
export const EMPTY_PRODUCT: ProductDraft = {
  name: "",
  category: "backdrops",
  unitPrice: "",
  unit: "each",
  qtyRule: "fixed",
  capacity: "",
  leadTimeDays: "",
  note: "",
  styles: [],
  details: EMPTY_PRODUCT_DETAILS,
};
export function productInput(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const b = input as ProductDraft;
  if (
    typeof b.name !== "string" ||
    b.name.trim().length < 2 ||
    b.name.length > 160 ||
    !VENDOR_CATEGORY_VALUES.has(b.category) ||
    !QTY_RULE_VALUES.has(b.qtyRule) ||
    typeof b.unit !== "string" ||
    !b.unit.trim() ||
    b.unit.length > 40 ||
    typeof b.note !== "string" ||
    b.note.length > 500 ||
    /[\x00]/.test(b.name + b.note + b.unit)
  )
    return null;
  const price = money(b.unitPrice);
  if (price === null) return null;
  if (
    typeof b.capacity !== "string" ||
    (b.capacity !== "" &&
      (!/^\d{1,6}$/.test(b.capacity) || Number(b.capacity) > 100000))
  )
    return null;
  if (
    typeof b.leadTimeDays !== "string" ||
    (b.leadTimeDays !== "" &&
      (!/^\d{1,3}$/.test(b.leadTimeDays) || Number(b.leadTimeDays) > 365))
  )
    return null;
  if (
    !Array.isArray(b.styles) ||
    b.styles.length > 12 ||
    b.styles.some(
      (v) => typeof v !== "string" || !STYLES.some((s) => s.id === v),
    )
  )
    return null;
  if (!b.details || typeof b.details !== "object" || Array.isArray(b.details))
    return null;
  const details = { ...EMPTY_PRODUCT_DETAILS };
  for (const k of Object.keys(details) as (keyof ProductDetails)[]) {
    const v = b.details[k];
    if (
      typeof v !== "string" ||
      v.length >
        (["dimensions", "material", "hireUnits"].includes(k) ? 200 : 1500) ||
      v.includes("\0")
    )
      return null;
    details[k] = v.trim();
  }
  return {
    name: b.name.trim(),
    category: b.category,
    unit_price_pence: price,
    unit: b.unit.trim(),
    qty_rule: b.qtyRule,
    capacity: b.capacity === "" ? null : Number(b.capacity),
    stock: b.capacity === "" ? "made_to_order" : "in_stock",
    lead_time_days: b.leadTimeDays === "" ? 0 : Number(b.leadTimeDays),
    note: b.note.trim() || null,
    styles: [...new Set(b.styles)],
    details,
  };
}
