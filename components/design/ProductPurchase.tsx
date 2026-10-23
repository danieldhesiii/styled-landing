"use client";
import type { BasketLine, CatalogueItem } from "@/lib/types";
import type { ItemAvailability } from "@/lib/availability";
import { useCatalogue } from "@/components/catalogue/CatalogueProvider";
import { quantityLimit, validQuantity } from "@/lib/shopping";

export interface ProductPurchaseProps {
  item: CatalogueItem;
  line?: BasketLine;
  availability?: ItemAvailability;
  onAdd: (item: CatalogueItem) => void;
  onRemove?: (id: string) => void;
  onQty?: (id: string, quantity: number) => void;
  onChangeDates?: () => void;
  onAlternatives?: () => void;
}
export default function ProductPurchase({
  item,
  line,
  availability,
  onAdd,
  onRemove,
  onQty,
  onChangeDates,
  onAlternatives,
}: ProductPurchaseProps) {
  const catalogue = useCatalogue();
  const blocked = catalogue.loading || !!catalogue.error;
  const limit = quantityLimit(availability);
  const short = availability?.status === "unavailable";
  return (
    <div className="mt-4 space-y-3">
      {blocked && (
        <p role="status" className="text-xs text-clay">
          {catalogue.loading
            ? "Loading catalogue. Please wait before changing products."
            : "Catalogue unavailable. Retry loading before changing products."}
        </p>
      )}
      {short && (
        <p role="status" className="text-xs text-clay">
          {limit > 0
            ? `Only ${limit} available for these dates. The suggested quantity is ${availability.requiredQty}.`
            : "Unavailable for these dates."}
        </p>
      )}
      {line ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-xs">
            Basket quantity{" "}
            <input
              type="number"
              min={1}
              max={limit || 1}
              value={line.quantity}
              disabled={blocked || !onQty}
              aria-label={`Quantity of ${item.name}`}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (validQuantity(n, availability)) onQty?.(item.id, n);
              }}
              className="ml-2 min-h-11 w-20 rounded-lg border border-sand p-2"
            />
          </label>
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="min-h-11 text-xs underline"
            >
              Remove
            </button>
          )}
          {!blocked && line.quantity > limit && limit > 0 && onQty && (
            <button
              type="button"
              onClick={() => onQty(item.id, limit)}
              className="min-h-11 text-xs underline"
            >
              Use available quantity: {limit}
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={blocked || limit === 0 || (short && !onQty)}
          onClick={() => {
            if (blocked) return;
            onAdd(item);
            if (short && limit > 0) onQty?.(item.id, limit);
          }}
          className="min-h-11 w-full rounded-full bg-ink px-4 py-2 text-sm text-cream disabled:opacity-50"
        >
          {limit === 0
            ? "Unavailable for these dates"
            : short
              ? `Add available quantity: ${limit}`
              : "Add to basket"}
        </button>
      )}
      {short && (
        <div className="flex flex-wrap gap-4 text-xs">
          {onChangeDates && (
            <button
              type="button"
              onClick={onChangeDates}
              className="min-h-11 underline"
            >
              Change dates
            </button>
          )}
          {onAlternatives && (
            <button
              type="button"
              onClick={onAlternatives}
              className="min-h-11 underline"
            >
              Find alternatives
            </button>
          )}
          {!onChangeDates && (
            <p>Change your dates in the planning controls to check again.</p>
          )}
        </div>
      )}
    </div>
  );
}
