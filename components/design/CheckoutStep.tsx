"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BasketLine } from "@/lib/types";
import { buildQuote, formatGBP } from "@/lib/quote";
import { useCatalogue } from "@/components/catalogue/CatalogueProvider";
import { useBasketAvailability } from "@/components/availability/useAvailability";
import { availabilityLabel } from "@/lib/availability";

interface Props {
  basket: BasketLine[];
  weddingDate: string;
  onWeddingDate: (date: string) => void;
  styleId: string;
  guestCount: number;
  venueLabel: string;
  onBack: () => void;
  onOrdered: () => void; // called once an order is placed, so the basket can be cleared
}

// The server's exact quote (whole pence). Checkout shows these numbers, because
// they are what the order will be charged at.
interface ServerQuote {
  lines: { itemId: string; unitPricePence: number }[];
  subtotalPence: number;
  depositPence: number;
  bySupplier: { supplier: string; totalPence: number }[];
}

interface PlacedOrder {
  reference: string;
  email: string;
  depositPence: number;
  bySupplier: { supplier: string; totalPence: number }[];
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CheckoutStep({
  basket,
  weddingDate,
  onWeddingDate,
  styleId,
  guestCount,
  venueLabel,
  onBack,
  onOrdered,
}: Props) {
  const { getItem, refresh } = useCatalogue();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);
  const [serverQuote, setServerQuote] = useState<ServerQuote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Bumped to re-check availability after the server says something sold out.
  const [availabilityNonce, setAvailabilityNonce] = useState(0);
  const availability = useBasketAvailability(weddingDate, basket, availabilityNonce);
  const unavailable = basket.filter((l) => availability.lines[l.itemId]?.status === "unavailable");

  // One key per checkout: a double click or a retry returns the same order
  // instead of creating a second.
  const idempotencyKey = useRef<string>(crypto.randomUUID());

  const nameOf = useCallback((id: string) => getItem(id)?.name ?? id, [getItem]);

  // Ask the server for the exact quote (and show an instant estimate meanwhile).
  const fetchQuote = useCallback(async () => {
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ basket }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        const gone: string[] = data?.unavailable ?? [];
        setError(
          gone.length > 0
            ? `These items are no longer available: ${gone.map(nameOf).join(", ")}. Please remove them from your design.`
            : (data?.error ?? "Couldn't price your design. Please try again.")
        );
        return;
      }
      setServerQuote(data.quote as ServerQuote);
    } catch {
      setError("Couldn't reach the server to price your design. Please try again.");
    }
  }, [basket, nameOf]);

  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  const preview = useMemo(() => buildQuote(basket, getItem), [basket, getItem]);
  const view = serverQuote
    ? {
        subtotal: serverQuote.subtotalPence / 100,
        deposit: serverQuote.depositPence / 100,
        groups: serverQuote.bySupplier.map((g) => ({ supplier: g.supplier, total: g.totalPence / 100 })),
      }
    : {
        subtotal: preview.subtotal,
        deposit: preview.deposit,
        groups: preview.bySupplier.map((g) => ({ supplier: g.supplier, total: g.total })),
      };

  async function placeOrder() {
    if (!serverQuote || submitting) return;
    setError(null);
    if (!name.trim()) return setError("Please tell us your names.");
    if (!EMAIL.test(email.trim())) return setError("Please enter a valid email address.");
    if (unavailable.length > 0) {
      return setError("Some items aren't available on your wedding date. Please adjust them below first.");
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // The prices shown above, so we refuse (rather than overcharge) if one moved meanwhile.
          basket: basket.map((l) => ({
            itemId: l.itemId,
            quantity: l.quantity,
            seenUnitPricePence: serverQuote.lines.find((q) => q.itemId === l.itemId)?.unitPricePence,
          })),
          coupleName: name.trim(),
          email: email.trim(),
          weddingDate: weddingDate || undefined,
          styleId,
          guestCount,
          venueLabel,
          idempotencyKey: idempotencyKey.current,
        }),
      });
      const data = await res.json();

      if (res.ok && data?.order) {
        setPlaced(data.order as PlacedOrder);
        onOrdered();
        return;
      }

      if (res.status === 409 && data?.changed) {
        // A price moved since the quote was shown: refresh everything and let them decide.
        setServerQuote(null);
        setError("Some prices changed while you were checking out. We've updated your total, so please review it and confirm again.");
        await Promise.all([fetchQuote(), refresh()]);
      } else if (res.status === 422 && data?.tooSoon) {
        const items = (data.tooSoon as { name: string; leadTimeDays: number }[])
          .map((t) => `${t.name} (needs ${t.leadTimeDays} days' notice)`)
          .join(", ");
        setError(`Your wedding date is too soon for: ${items}.`);
      } else if (res.status === 409 && data?.soldOut) {
        // Someone else took the last units, or stock changed, since availability was checked.
        const items = (data.soldOut as { name: string; availableUnits: number }[])
          .map((s) => `${s.name} (${s.availableUnits > 0 ? `only ${s.availableUnits} left` : "none left"})`)
          .join(", ");
        setError(`These items aren't available on your wedding date: ${items}. Please lower the quantity, remove them, or choose another date.`);
        setAvailabilityNonce((n) => n + 1);
      } else if (data?.unavailable?.length) {
        setError(`These items are no longer available: ${(data.unavailable as string[]).map(nameOf).join(", ")}. Please remove them from your design.`);
      } else {
        setError(data?.error ?? "Couldn't place your order. Please try again.");
      }
    } catch {
      setError("Couldn't reach the server. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (placed) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sage/15 text-2xl">
          ✓
        </div>
        <h1 className="mt-6 font-serif text-3xl text-ink">Your date is being secured.</h1>
        <p className="mt-2 text-sm text-ink/50">
          Reference <span className="font-medium text-ink">{placed.reference}</span>
        </p>
        <p className="mt-3 text-ink/60">
          A stylist will confirm availability with each of your {placed.bySupplier.length}{" "}
          suppliers and email {placed.email} within one working day. Nothing is
          charged until every piece is confirmed for your date.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a
            href="/order"
            className="rounded-full bg-ink px-6 py-3 text-sm text-cream hover:bg-ink/90"
          >
            Track your order
          </a>
          <button
            type="button"
            onClick={onBack}
            className="rounded-full border border-ink/20 px-6 py-3 text-sm text-ink hover:border-ink/40"
          >
            Back to your design
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl py-10">
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-ink/50 hover:text-ink"
      >
        ← Back to your design
      </button>
      <h1 className="mt-4 font-serif text-4xl text-ink">Reserve your design.</h1>
      <p className="mt-2 text-ink/60">
        Pay a deposit to hold every supplier for your date. The balance is due six
        weeks before the wedding.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* Details form */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-ink">Your names</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex & Sam"
              className="mt-2 w-full rounded-xl border border-sand bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-clay/30"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-ink">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="mt-2 w-full rounded-xl border border-sand bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-clay/30"
            />
          </div>
          <div>
            <label htmlFor="checkout-date" className="text-sm font-medium text-ink">
              Wedding date
            </label>
            <input
              id="checkout-date"
              type="date"
              value={weddingDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => onWeddingDate(e.target.value)}
              className="mt-2 w-full rounded-xl border border-sand bg-white px-4 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-clay/30"
            />
            <p className="mt-1.5 text-xs text-ink/45">
              {!weddingDate
                ? "Add it so we can check every supplier is free on your day. Without it, your stylist will ask."
                : availability.loading
                  ? "Checking every supplier for your date…"
                  : availability.error
                    ? availability.error
                    : unavailable.length > 0
                      ? "Some items need attention for this date:"
                      : "Every item is free on this date."}
            </p>
            {unavailable.length > 0 && (
              <ul className="mt-2 space-y-1 rounded-xl bg-red-50 px-4 py-3 text-xs text-red-800">
                {unavailable.map((l) => (
                  <li key={l.itemId}>
                    <span className="font-medium">{nameOf(l.itemId)}</span>:{" "}
                    {availabilityLabel(availability.lines[l.itemId]).label}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-xl border border-dashed border-sand bg-cream/50 p-4 text-sm text-ink/50">
            Card payment is a placeholder in this preview — the deposit step will
            connect to our payment provider before launch. No card is charged.
          </div>
          {error && (
            <p role="alert" className="rounded-xl bg-blush/30 px-4 py-3 text-sm text-ink/80">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={placeOrder}
            disabled={!serverQuote || submitting || basket.length === 0 || unavailable.length > 0}
            className="w-full rounded-full bg-ink px-6 py-3.5 text-cream hover:bg-ink/90 disabled:bg-ink/30"
          >
            {submitting
              ? "Placing your order…"
              : serverQuote
                ? `Pay ${formatGBP(view.deposit)} deposit`
                : "Preparing your quote…"}
          </button>
        </div>

        {/* Order summary */}
        <aside className="h-fit rounded-2xl border border-sand bg-white p-5 shadow-sm">
          <h2 className="font-serif text-lg text-ink">Order summary</h2>
          <div className="mt-4 space-y-3">
            {view.groups.map((g) => (
              <div key={g.supplier} className="flex justify-between text-sm">
                <span className="text-ink/60">{g.supplier}</span>
                <span className="text-ink">{formatGBP(g.total)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-sand pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-ink/60">Estimated total</span>
              <span className="font-serif text-lg text-ink">{formatGBP(view.subtotal)}</span>
            </div>
            <div className="mt-1 flex justify-between text-sm">
              <span className="text-ink/60">Deposit due now</span>
              <span className="text-clay">{formatGBP(view.deposit)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
