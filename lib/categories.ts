import type { Category, CategoryMeta } from "./types";

// Shop categories: how a couple browses the catalogue. This is interface copy
// (labels and blurbs), so it lives in code. The products themselves live in the
// database; see lib/catalogue.ts for the seed data and README note there.

export const CATEGORY_META: CategoryMeta[] = [
  { category: "backdrops", label: "Backdrops & arches", blurb: "The focal point you'll say 'I do' in front of.", icon: "⛩️" },
  { category: "florals", label: "Florals", blurb: "Bouquets, ceremony arrangements and table flowers.", icon: "💐" },
  { category: "centrepieces", label: "Centrepieces", blurb: "What sits on each guest table.", icon: "🕯️" },
  { category: "furniture", label: "Furniture", blurb: "Chairs and tables, delivered and set up.", icon: "🪑" },
  { category: "linen_tableware", label: "Linen & tableware", blurb: "Linen, napkins, glassware and place settings.", icon: "🍽️" },
  { category: "lighting", label: "Lighting", blurb: "Transforms the room once the sun goes down.", icon: "💡" },
  { category: "signage", label: "Signage", blurb: "Welcome signs and personal touches.", icon: "🪞" },
  { category: "bar", label: "Bar & drinks", blurb: "A statement bar for drinks and cocktails.", icon: "🍸" },
  { category: "attire", label: "Attire", blurb: "Gowns, suits and dresses for the whole party.", icon: "👰" },
  { category: "stationery", label: "Stationery", blurb: "Invitations, place cards and table plans.", icon: "✉️" },
  { category: "cake_favours", label: "Cake & favours", blurb: "The centrepiece cake and gifts for your guests.", icon: "🎂" },
];

export function categoryMeta(category: Category): CategoryMeta {
  return CATEGORY_META.find((c) => c.category === category)!;
}
