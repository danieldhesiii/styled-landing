// Option lists for creating catalogue products. Shared by the admin product form
// (the dropdowns) and the server route (validation), so the two can't drift.
// Categories are reused from lib/vendor-categories.ts.

export const QTY_RULES: { value: string; label: string }[] = [
  { value: "fixed", label: "Fixed quantity (set by the couple)" },
  { value: "per_guest", label: "Per guest" },
  { value: "per_table", label: "Per table" },
  { value: "per_venue", label: "One per venue" },
];

// A render "slot" places the product in the styled picture. Shop-only items
// (attire, stationery, cake) have none.
export const SLOTS: { value: string; label: string }[] = [
  { value: "", label: "Not shown in the render" },
  { value: "ceremony_backdrop", label: "Ceremony backdrop" },
  { value: "centrepieces", label: "Centrepieces" },
  { value: "chairs", label: "Chairs" },
  { value: "tables_linen", label: "Tables & linen" },
  { value: "lighting", label: "Lighting" },
  { value: "florals", label: "Florals" },
  { value: "signage", label: "Signage" },
  { value: "bar", label: "Bar" },
];

export const QTY_RULE_VALUES = new Set(QTY_RULES.map((r) => r.value));
export const SLOT_VALUES = new Set(SLOTS.map((s) => s.value).filter(Boolean));
