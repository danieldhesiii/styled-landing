// The product categories a vendor can apply under. Shared by the public
// application form (the dropdown) and the server route (validation), so the two
// never drift. These mirror the `Category` union in lib/types.ts.
export const VENDOR_CATEGORIES: { value: string; label: string }[] = [
  { value: "backdrops", label: "Backdrops & arches" },
  { value: "florals", label: "Florals" },
  { value: "centrepieces", label: "Centrepieces" },
  { value: "furniture", label: "Furniture & seating" },
  { value: "linen_tableware", label: "Linen & tableware" },
  { value: "lighting", label: "Lighting" },
  { value: "signage", label: "Signage" },
  { value: "bar", label: "Bar & drinks" },
  { value: "attire", label: "Attire" },
  { value: "stationery", label: "Stationery" },
  { value: "cake_favours", label: "Cake & favours" },
];

export const VENDOR_CATEGORY_VALUES = new Set(VENDOR_CATEGORIES.map((c) => c.value));

export function vendorCategoryLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return VENDOR_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}
