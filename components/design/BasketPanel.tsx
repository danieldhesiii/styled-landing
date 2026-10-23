"use client";

import HelpButton from "@/components/help/HelpButton";
import { useMemo, useState } from "react";
import type { BasketLine } from "@/lib/types";
import { buildQuote, formatGBP, DEPOSIT_RATE } from "@/lib/quote";
import { useCatalogue } from "@/components/catalogue/CatalogueProvider";
import { useBasketAvailability } from "@/components/availability/useAvailability";
import { availabilityLabel } from "@/lib/availability";
import { deliveryError } from "@/lib/wedding";
import { basketBlocker, quantityLimit } from "@/lib/shopping";

interface Props {
  basket: BasketLine[];
  guestCount: number;
  budget: number | null;
  weddingDate: string;
  deliveryDate?: string;
  onQty: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
  onCheckout: () => void;
  onChangeDates?: () => void;
  onBrowse?: () => void;
}

export default function BasketPanel({
  basket,
  guestCount,
  budget,
  weddingDate,
  deliveryDate,
  onQty,
  onRemove,
  onCheckout,
  onChangeDates,
  onBrowse,
}: Props) {
  const {
    getItem,
    loading: catalogueLoading,
    error: catalogueError,
  } = useCatalogue();
  const [refreshKey, setRefreshKey] = useState(0);
  // Instant preview while editing; checkout asks the server for the exact quote.
  const quote = useMemo(() => buildQuote(basket, getItem), [basket, getItem]);
  // Does everything in the basket fit on the wedding date, at these quantities?
  const availability = useBasketAvailability(
    weddingDate,
    basket,
    refreshKey,
    deliveryDate ?? weddingDate,
  );
  const dateProblem = deliveryError(weddingDate, deliveryDate ?? weddingDate);
  const missing = basket.filter((line) => !getItem(line.itemId));
  const invalid = basket.some(
    (line) =>
      !Number.isInteger(line.quantity) ||
      line.quantity < 1 ||
      line.quantity > 10000,
  );
  const stockBlocked =
    !availability.allAvailable ||
    basket.some((line) => {
      const a = availability.lines[line.itemId];
      return (
        !a || a.status === "unavailable" || line.quantity > quantityLimit(a)
      );
    });
  const blocker = basketBlocker({
    count: basket.length,
    catalogueLoading,
    catalogueError,
    dateProblem,
    missing: missing.length > 0,
    invalid,
    availabilityError: availability.error,
    availabilityLoading: availability.loading,
    checked: availability.checked,
    stockBlocked,
  });
  const tables = Math.max(1, Math.ceil(guestCount / 10));
  const hasBudget = budget != null && budget > 0;
  const overBudget = hasBudget && quote.subtotal > budget;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-sand px-5 py-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-xl text-ink">Your basket</h2>
          <span className="text-xs text-ink/40">
            {guestCount} guests · {tables} tables
          </span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-ink/60">
          Your choices before submission. Adding pieces here does not create an
          order or confirm a booking.
        </p>
        <div className="mt-2">
          <HelpButton
            topic="basket"
            label="How the basket works"
            className="text-xs text-ink/60 underline"
          />
        </div>
        {hasBudget && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-ink/50">Budget {formatGBP(budget)}</span>
              <span className={overBudget ? "text-clay" : "text-sage"}>
                {overBudget
                  ? `${formatGBP(quote.subtotal - budget)} over`
                  : `${formatGBP(budget - quote.subtotal)} to spare`}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sand">
              <div
                className={`h-full rounded-full ${overBudget ? "bg-clay" : "bg-sage"}`}
                style={{
                  width: `${Math.min(100, budget ? (quote.subtotal / budget) * 100 : 0)}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {!catalogueLoading && !catalogueError && missing.length > 0 && (
        <div role="alert" className="px-5 py-3 text-sm text-clay">
          {missing.map((line) => (
            <p key={line.itemId}>
              Piece no longer listed{" "}
              <button
                type="button"
                onClick={() => onRemove(line.itemId)}
                className="min-h-11 underline"
              >
                Remove missing piece
              </button>
            </p>
          ))}
        </div>
      )}
      {/* Lines grouped by supplier */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {quote.lines.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <span className="text-3xl">🧺</span>
            <p className="mt-3 text-sm text-ink/50">
              Your design is empty. Add pieces from the catalogue and they'll
              appear here with live pricing.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {quote.bySupplier.map((group) => (
              <div key={group.supplier}>
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {group.supplier}
                    </p>
                    <p className="text-[11px] text-ink/40">{group.area}</p>
                  </div>
                  <span className="font-serif text-sm text-ink">
                    {formatGBP(group.total)}
                  </span>
                </div>
                <div className="mt-2 space-y-2">
                  {group.lines.map((line) => (
                    <div key={line.item.id}>
                      <div className="flex items-center gap-2 rounded-xl border border-sand bg-cream/50 px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-ink">
                            {line.item.name}
                          </p>
                          <p className="text-[11px] text-ink/40">
                            {formatGBP(line.item.unitPrice)} {line.item.unit}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              onQty(
                                line.item.id,
                                Math.max(1, line.quantity - 1),
                              )
                            }
                            className="h-11 w-11 rounded-full border border-sand text-ink/60 hover:border-clay hover:text-clay"
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <span className="w-7 text-center text-xs tabular-nums text-ink">
                            {line.quantity}
                          </span>
                          <button
                            type="button"
                            disabled={
                              catalogueLoading ||
                              !!catalogueError ||
                              line.quantity >=
                                quantityLimit(availability.lines[line.item.id])
                            }
                            onClick={() =>
                              onQty(line.item.id, line.quantity + 1)
                            }
                            className="h-11 w-11 rounded-full border border-sand text-ink/60 hover:border-clay hover:text-clay"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                        <span className="w-14 text-right text-xs font-medium text-ink tabular-nums">
                          {formatGBP(line.lineTotal)}
                        </span>
                        <button
                          type="button"
                          onClick={() => onRemove(line.item.id)}
                          className="min-h-11 min-w-11 text-ink/30 hover:text-clay"
                          aria-label={`Remove ${line.item.name}`}
                        >
                          ×
                        </button>
                      </div>
                      {(() => {
                        const a = availability.lines[line.item.id];
                        if (
                          !a ||
                          a.status === "available" ||
                          a.status === "made_to_order"
                        )
                          return null;
                        const { label } = availabilityLabel(a);
                        return (
                          <div
                            className={`mt-2 pl-3 text-[11px] ${a.status === "unavailable" ? "text-red-700" : "text-clay"}`}
                          >
                            {label}
                            {a.status === "unavailable"
                              ? ". Lower the quantity, remove it, or change your date."
                              : ""}
                            {a.status === "unavailable" &&
                              quantityLimit(a) > 0 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onQty(line.item.id, quantityLimit(a))
                                  }
                                  className="ml-2 min-h-11 underline"
                                >
                                  Use available quantity: {quantityLimit(a)}
                                </button>
                              )}
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Totals + checkout */}
      <div className="border-t border-sand px-5 py-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-ink/60">Estimated total</span>
          <span className="font-serif text-2xl text-ink">
            {formatGBP(quote.subtotal)}
          </span>
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="text-xs text-ink/40">
            Illustrative deposit ({Math.round(DEPOSIT_RATE * 100)}%)
          </span>
          <span className="text-sm text-clay">{formatGBP(quote.deposit)}</span>
        </div>
        {blocker && (
          <div
            id="basket-blocker"
            role="status"
            className="mt-3 text-xs text-clay"
          >
            {blocker}
          </div>
        )}
        <div className="mt-2 flex flex-wrap gap-3 text-xs">
          {onChangeDates && (
            <button
              type="button"
              onClick={onChangeDates}
              className="min-h-11 underline"
            >
              Change dates
            </button>
          )}
          {onBrowse && (
            <button
              type="button"
              onClick={onBrowse}
              className="min-h-11 underline"
            >
              Find alternatives
            </button>
          )}
          {availability.error && (
            <button
              type="button"
              onClick={() => setRefreshKey((key) => key + 1)}
              className="min-h-11 underline"
            >
              Retry availability check
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            if (!blocker) onCheckout();
          }}
          aria-describedby={blocker ? "basket-blocker" : undefined}
          disabled={!!blocker}
          className="mt-4 w-full rounded-full bg-ink px-5 py-3 text-sm text-cream transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:bg-ink/30"
        >
          Request supplier confirmation
        </button>
        <p className="mt-2 text-center text-[11px] text-ink/40">
          The server rechecks pricing and availability at submission. No booking
          is confirmed here.
        </p>
      </div>
    </div>
  );
}
