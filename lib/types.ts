// Core domain types for the Styled purchasing app.
//
// A couple browses a catalogue of real supplier products grouped by category,
// adds what they want to their design, and gets a live itemised quote grouped by
// supplier. Quantities are derived from the guest count (per guest / per table)
// so the basket always reflects a real, deliverable order.

export type QtyRule = "per_guest" | "per_table" | "fixed" | "per_venue";

// Shop categories — how a couple browses. Covers the full range of things a
// wedding needs, not just what appears in the render.
export type Category =
  | "backdrops"
  | "florals"
  | "centrepieces"
  | "furniture"
  | "linen_tableware"
  | "lighting"
  | "signage"
  | "bar"
  | "attire"
  | "stationery"
  | "cake_favours";

// A "slot" is a visual position in the styled render. Only render-placeable
// items have one; shop-only items (attire, stationery, cake) do not.
export type Slot =
  | "ceremony_backdrop"
  | "centrepieces"
  | "chairs"
  | "tables_linen"
  | "lighting"
  | "florals"
  | "signage"
  | "bar";

// Live stock status from the vendor (placeholder data for now — see lib/stock).
export type StockStatus = "in_stock" | "low_stock" | "made_to_order";

export interface CatalogueItem {
  id: string;
  name: string;
  category: Category;
  slot?: Slot; // present when the item appears in the render
  supplier: string;
  supplierArea: string;
  unitPrice: number; // GBP per unit
  unit: string; // e.g. "each", "per table", "package"
  qtyRule: QtyRule;
  styles: string[]; // style ids this item suits
  icon: string; // emoji fallback when there's no photo
  swatch: string; // hex colour used in the preview / fallback
  image?: string; // real catalogue photo (public path)
  rating: number; // supplier item rating out of 5
  reviewCount: number;
  leadTimeDays: number; // how far ahead it must be booked
  stock: StockStatus; // live availability (placeholder for now)
  note?: string;
}

export interface CategoryMeta {
  category: Category;
  label: string;
  blurb: string;
  icon: string;
}

export interface StylePreset {
  id: string;
  name: string;
  tagline: string;
  palette: string[]; // hex colours
  wash: string; // overlay tint applied to the venue photo in the preview
  render?: string; // illustrative styled-room image (public path)
}

export interface SampleVenue {
  id: string;
  name: string;
  area: string;
  kind: string;
  gradient: string; // CSS gradient fallback when there's no photo
  image?: string; // real empty-venue photo (public path)
  tour?: boolean; // whether a 3D look-around is available (placeholder)
}

// A line in the basket: an item + chosen quantity.
export interface BasketLine {
  itemId: string;
  quantity: number;
}

export interface QuoteLine {
  item: CatalogueItem;
  quantity: number;
  lineTotal: number;
}

export interface Quote {
  lines: QuoteLine[];
  subtotal: number;
  commission: number; // what the platform earns (internal, not shown to couples)
  deposit: number; // what the couple pays now to secure the date
  bySupplier: { supplier: string; area: string; total: number; lines: QuoteLine[] }[];
}

export interface Order {
  id: string;
  createdAt: string;
  coupleName: string;
  email: string;
  phone: string;
  weddingDate: string;
  venue: string;
  styleId: string;
  guestCount: number;
  subtotal: number;
  deposit: number;
  commission: number;
  itemIds: string[];
  status: "requested" | "confirmed" | "declined";
}
