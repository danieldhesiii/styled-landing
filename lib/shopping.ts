import type { ItemAvailability } from "./availability";
import type { CatalogueItem } from "./types";

/** Stock ceilings apply to the whole delivery window, never a fabricated stock label. */
export function quantityLimit(a?: ItemAvailability): number {
  if (a?.reason === "blocked") return 0;
  if (a?.availableUnits != null && Number.isFinite(a.availableUnits))
    return Math.max(0, Math.min(10000, Math.floor(a.availableUnits)));
  return a?.status === "unavailable" ? 0 : 10000;
}
export function validQuantity(n: number, a?: ItemAvailability): boolean {
  return Number.isInteger(n) && n >= 1 && n <= quantityLimit(a);
}
export function imageDisclosure(item: CatalogueItem): string {
  if (!item.image) return "No product photograph supplied";
  if (item.imageKind === "illustrative" || item.image.startsWith("/img/items/"))
    return "Illustrative catalogue image, not a supplier photograph";
  return item.imageKind === "supplier"
    ? "Supplier product photograph"
    : "Image source unverified. Confirm appearance with the supplier.";
}
export function reviewDisclosure(item: CatalogueItem): string {
  if (!item.reviewsVerified) return "No verified reviews available";
  return item.reviewCount > 0 && Number.isFinite(item.rating)
    ? `★ ${item.rating.toFixed(1)} (${item.reviewCount} verified reviews)`
    : "No verified reviews available";
}

export function basketBlocker(input: {
  count: number;
  catalogueLoading: boolean;
  catalogueError: string | null;
  dateProblem: string | null;
  missing: boolean;
  invalid: boolean;
  availabilityError: string | null;
  availabilityLoading: boolean;
  checked: boolean;
  stockBlocked: boolean;
}): string | null {
  if (!input.count) return "Add pieces to your basket first.";
  if (input.catalogueLoading)
    return "Loading catalogue before checking your basket.";
  if (input.catalogueError)
    return "Catalogue unavailable. Retry loading before continuing.";
  if (input.dateProblem) return input.dateProblem;
  if (input.missing) return "Remove pieces that are no longer listed.";
  if (input.invalid) return "Choose whole quantities from 1 to 10,000.";
  if (input.availabilityError) return input.availabilityError;
  if (input.availabilityLoading || !input.checked)
    return "Checking your quantities and dates before continuing.";
  if (input.stockBlocked)
    return "Some pieces cannot meet your quantities or dates. Reduce quantities, remove pieces or change dates.";
  return null;
}
