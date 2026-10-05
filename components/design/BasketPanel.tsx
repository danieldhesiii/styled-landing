"use client";

import { useMemo } from "react";
import type { BasketLine } from "@/lib/types";
import { buildQuote, formatGBP, DEPOSIT_RATE } from "@/lib/quote";
import { useCatalogue } from "@/components/catalogue/CatalogueProvider";
import { useBasketAvailability } from "@/components/availability/useAvailability";
import { availabilityLabel } from "@/lib/availability";

interface Props {
  basket: BasketLine[];
  guestCount: number;
  budget: number | null;
  weddingDate: string;
  onQty: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
  onCheckout: () => void;
}

export default function BasketPanel({
  basket,
  guestCount,
  budget,
  weddingDate,
  onQty,
  onRemove,
  onCheckout,
}: Props) {
  const { getItem } = useCatalogue();
  // Instant preview while editing; checkout asks the server for the exact quote.
  const quote = useMemo(() => buildQuote(basket, getItem), [basket, getItem]);
  // Does everything in the basket fit on the wedding date, at these quantities?
  const availability = useBasketAvailability(weddingDate, basket);
  const tables = Math.max(1, Math.ceil(guestCount / 10));
  const overBudget = budget != null && quote.subtotal > budget;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-sand px-5 py-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-xl text-ink">Your design</h2>
          <span className="text-xs text-ink/40">
            {guestCount} guests · {tables} tables
          </span>
        </div>
        {budget != null && (
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
                style={{ width: `${Math.min(100, budget ? (quote.subtotal / budget) * 100 : 0)}%` }}
              />
            </div>
          </div>
        )}
      </div>

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
                    <p className="text-sm font-medium text-ink">{group.supplier}</p>
                    <p className="text-[11px] text-ink/40">{group.area}</p>
                  </div>
                  <span className="font-serif text-sm text-ink">{formatGBP(group.total)}</span>
                </div>
                <div className="mt-2 space-y-2">
                  {group.lines.map((line) => (
                    <div key={line.item.id}>
                    <div className="flex items-center gap-2 rounded-xl border border-sand bg-cream/50 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-ink">{line.item.name}</p>
                        <p className="text-[11px] text-ink/40">
                          {formatGBP(line.item.unitPrice)} {line.item.unit}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onQty(line.item.id, Math.max(1, line.quantity - 1))}
                          className="h-6 w-6 rounded-full border border-sand text-ink/60 hover:border-clay hover:text-clay"
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span className="w-7 text-center text-xs tabular-nums text-ink">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onQty(line.item.id, line.quantity + 1)}
                          className="h-6 w-6 rounded-full border border-sand text-ink/60 hover:border-clay hover:text-clay"
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
                        className="text-ink/30 hover:text-clay"
                        aria-label="Remove"
                      >
                        ×
                      </button>
                    </div>
                    {(() => {
                      const a = availability.lines[line.item.id];
                      if (!a || a.status === "available" || a.status === "made_to_order") return null;
                      const { label } = availabilityLabel(a);
                      return (
                        <p
                          className={`-mt-1 pl-3 text-[11px] ${a.status === "unavailable" ? "text-red-700" : "text-clay"}`}
                        >
                          {label}
                          {a.status === "unavailable" ? ". Lower the quantity, remove it, or change your date." : ""}
                        </p>
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
          <span className="font-serif text-2xl text-ink">{formatGBP(quote.subtotal)}</span>
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="text-xs text-ink/40">
            Deposit to secure your date ({Math.round(DEPOSIT_RATE * 100)}%)
          </span>
          <span className="text-sm text-clay">{formatGBP(quote.deposit)}</span>
        </div>
        <button
          type="button"
          onClick={onCheckout}
          disabled={quote.lines.length === 0}
          className="mt-4 w-full rounded-full bg-ink px-5 py-3 text-sm text-cream transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:bg-ink/30"
        >
          Reserve this design
        </button>
        <p className="mt-2 text-center text-[11px] text-ink/40">
          No card charged until a stylist confirms every supplier for your date.
        </p>
      </div>
    </div>
  );
}
