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
    <div className="mt-auto space-y-3 pt-4">
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
        <div className="rounded-xl border border-sage/30 bg-sage/10 p-3">
          <div className="mb-2 flex min-h-8 items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-medium text-ink">
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  d="m3 8 3 3 7-7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              In basket
            </span>
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                aria-label={`Remove ${item.name} from basket`}
                className="min-h-11 px-1 text-xs text-ink/70 underline underline-offset-4 hover:text-ink"
              >
                Remove
              </button>
            )}
          </div>
          <div
            role="group"
            aria-label={`Basket quantity for ${item.name}`}
            className="flex min-w-0 items-center overflow-hidden rounded-full border border-sage/30 bg-white"
          >
            <button
              type="button"
              disabled={blocked || !onQty || line.quantity <= 1}
              onClick={() => {
                if (validQuantity(line.quantity - 1, availability))
                  onQty?.(item.id, line.quantity - 1);
              }}
              aria-label={`Decrease quantity of ${item.name}`}
              className="h-11 w-11 shrink-0 text-lg hover:bg-sage/10 disabled:opacity-30"
            >
              −
            </button>
            <input
              type="number"
              min={1}
              max={limit || 1}
              value={String(line.quantity)}
              inputMode="numeric"
              disabled={blocked || !onQty}
              aria-label={`Quantity of ${item.name}`}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (validQuantity(n, availability)) onQty?.(item.id, n);
              }}
              className="h-11 min-w-0 flex-1 bg-transparent px-1 text-center text-sm font-medium tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button
              type="button"
              disabled={blocked || !onQty || line.quantity >= limit}
              onClick={() => {
                if (validQuantity(line.quantity + 1, availability))
                  onQty?.(item.id, line.quantity + 1);
              }}
              aria-label={`Increase quantity of ${item.name}`}
              className="h-11 w-11 shrink-0 text-lg hover:bg-sage/10 disabled:opacity-30"
            >
              +
            </button>
          </div>
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
