"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { BasketLine, CatalogueItem } from "@/lib/types";
import type { ItemAvailability } from "@/lib/availability";
import { useCatalogue } from "@/components/catalogue/CatalogueProvider";
import { canRequestItem, purchaseAvailability, quantityLimit, validQuantity } from "@/lib/shopping";
import { oneDayDemoTotal } from "@/lib/demo-pricing";
import { formatGBP } from "@/lib/quote";

export interface ProductPurchaseProps {
  compact?: boolean;
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
  compact = false,
  item,
  line,
  availability: suppliedAvailability,
  onAdd,
  onRemove,
  onQty,
  onChangeDates,
  onAlternatives,
}: ProductPurchaseProps) {
  const catalogue = useCatalogue();
  const availability = purchaseAvailability(item, suppliedAvailability);
  const [quantity, setQuantity] = useState(1);
  useEffect(() => setQuantity(1), [item.id]);
  const blocked = catalogue.loading || !!catalogue.error;
  const limit = quantityLimit(availability);
  const short = availability?.status === "unavailable";
  if (!canRequestItem(item)) return <ProductCharges item={item} compact={compact} />;
  return (
    <div className="mt-auto space-y-3 pt-4">
      {item.demoOnly && !compact && <ProductCharges item={item} />}
      {item.requestOnly && <p className="text-sm text-ink/60">Availability and final quote on request.</p>}
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
            ? `Only ${limit} available for these dates.`
            : "Unavailable for these dates."}
        </p>
      )}
      {line ? (
        <div className={`rounded-xl border border-sage/30 bg-sage/10 ${compact ? "p-2 sm:p-3" : "p-3"}`}>
          <div className="mb-2 flex min-h-8 items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-medium text-ink">
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className={compact ? "hidden h-4 w-4 sm:block" : "h-4 w-4"}
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
                {compact ? <><span aria-hidden="true" className="inline-flex min-w-11 justify-center text-lg sm:hidden">×</span><span className="hidden sm:inline">Remove</span></> : "Remove"}
              </button>
            )}
          </div>
          <div
            role="group"
            aria-label={`Basket quantity for ${item.name}`}
            className="flex min-w-0 items-center overflow-hidden rounded-lg border border-sage/30 bg-white"
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
        <>
        {!compact && onQty && <label className="block text-sm">Quantity
          <input type="number" min={1} max={Math.max(1, limit)} inputMode="numeric" value={quantity} disabled={blocked || limit === 0}
            onChange={(event) => setQuantity(Number(event.target.value))}
            className="mt-2 block min-h-11 w-full rounded-lg border border-sand bg-white px-3 tabular-nums" />
          {limit > 0 && !validQuantity(quantity, availability) && <span role="status" className="mt-1 block text-xs text-clay">Choose a whole quantity from 1 to {limit}.</span>}
        </label>}
        <button
          type="button"
          disabled={blocked || limit === 0 || (short && !onQty) || (!compact && !!onQty && !validQuantity(quantity, availability))}
          onClick={() => {
            if (blocked) return;
            onAdd(item);
            if (!compact && onQty) onQty(item.id, quantity);
            else if (short && limit > 0) onQty?.(item.id, limit);
          }}
          className="min-h-11 w-full rounded-lg bg-ink px-4 py-2 text-sm text-cream transition-colors hover:bg-ink/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-50"
        >
          {limit === 0
            ? "Unavailable for these dates"
            : short && compact
              ? `Add available quantity: ${limit}`
              : "Add to basket"}
        </button>
        </>
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
          {!onChangeDates && <Link href="/design?tab=wedding" className="inline-flex min-h-11 items-center underline">Review dates in Wedding plan</Link>}
        </div>
      )}
    </div>
  );
}

/** Show the same available charge breakdown on public and studio details. */
export function ProductCharges({ item, compact = false }: { item: CatalogueItem; compact?: boolean }) {
    const total = oneDayDemoTotal(item);
    return (
      <div className="mt-auto rounded-xl border border-clay/20 bg-sand/40 p-3 text-sm">
        {total !== null && item.demoPricing ? (
          <>
            {compact ? (
              <p className="mt-2 text-xs text-ink/70">
                Includes hire, delivery, setup, collection and a refundable damage deposit.
              </p>
            ) : (
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-3"><dt>Hire, per day</dt><dd>{formatGBP(item.demoPricing.dailyHireGBP)}</dd></div>
                <div className="flex justify-between gap-3"><dt>Delivery, setup and collection</dt><dd>{formatGBP(item.demoPricing.deliverySetupCollectionGBP)}</dd></div>
                <div className="flex justify-between gap-3"><dt>Refundable damage deposit</dt><dd>{formatGBP(item.demoPricing.damageDepositGBP)}</dd></div>
                <div className="flex justify-between gap-3 border-t border-sand pt-2 font-semibold"><dt>One-day estimate</dt><dd>{formatGBP(total)}</dd></div>
              </dl>
            )}
          </>
        ) : (
          <p className="mt-2 text-xs leading-relaxed text-ink/70">
            Ask for a complete hire quote.
          </p>
        )}
      </div>
    );
}
