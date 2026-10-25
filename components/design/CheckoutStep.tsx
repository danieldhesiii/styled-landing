"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BasketLine } from "@/lib/types";
import { buildQuote, formatGBP } from "@/lib/quote";
import { useCatalogue } from "@/components/catalogue/CatalogueProvider";
import { useBasketAvailability } from "@/components/availability/useAvailability";
import { useUser } from "@/components/session/useUser";
import { availabilityLabel } from "@/lib/availability";

import ContextHelp from "@/components/ui/ContextHelp";
import ItemHireDates from "@/components/wedding/ItemHireDates";
import { hireDateError, itemHireDates, type HireDates } from "@/lib/booking-dates";
import DeliveryDates from "@/components/wedding/DeliveryDates";
import {
  deliveryDay,
  deliveryError,
  type PlanningDetails,
} from "@/lib/wedding";
interface Props extends PlanningDetails {
  eventName?: string;
  onDates: (p: Partial<PlanningDetails> & { weddingDate?: string }) => void;
  basket: BasketLine[];
  onItemDates: (itemId: string, dates?: HireDates) => void;
  weddingDate: string;
  onWeddingDate: (date: string) => void;
  styleId: string;
  guestCount: number;
  venueLabel: string;
  onBack: () => void;
  onOrdered: () => void; // called once an order is placed, so the basket can be cleared
}

// Current catalogue estimate in whole pence; final supplier terms are agreed manually.
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

const fmtDate = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

export default function CheckoutStep({
  eventName,
  basket,
  onItemDates,
  weddingDate,
  onWeddingDate,
  deliveryDate,
  returnDate,
  deliverySameDay,
  onDates,
  styleId,
  guestCount,
  venueLabel,
  onBack,
  onOrdered,
}: Props) {
  const { getItem, refresh } = useCatalogue();
  const { email: accountEmail } = useUser();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  // Prefill the email for a signed-in couple so they don't retype it.
  useEffect(() => {
    if (accountEmail) setEmail((e) => e || accountEmail);
  }, [accountEmail]);
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);
  const [serverQuote, setServerQuote] = useState<ServerQuote | null>(null);
  // Shared planning defaults with optional independent dates on each basket line.
  const delivery = deliveryDay({ weddingDate, deliveryDate, deliverySameDay });
  const defaults = { start: delivery, end: returnDate || weddingDate };
  const dateProblem = deliveryError(weddingDate, delivery) || basket.map(line => {
    const d = itemHireDates(line, defaults);
    return hireDateError(d.start, d.end);
  }).find(Boolean);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Bumped to re-check availability after the server says something sold out.
  const [availabilityNonce, setAvailabilityNonce] = useState(0);
  const availability = useBasketAvailability(
    weddingDate,
    basket,
    availabilityNonce,
    delivery,
    returnDate || weddingDate,
  );
  const unavailable = basket.filter(
    (l) => availability.lines[l.itemId]?.status === "unavailable",
  );

  // One key per checkout: a double click or a retry returns the same order
  // instead of creating a second.
  const idempotencyKey = useRef<string>(crypto.randomUUID());

  const nameOf = useCallback(
    (id: string) => getItem(id)?.name ?? id,
    [getItem],
  );

  // Refresh the catalogue estimate before accepting a request.
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
            : (data?.error ?? "Couldn't price your design. Please try again."),
        );
        return;
      }
      setServerQuote(data.quote as ServerQuote);
    } catch {
      setError(
        "Couldn't reach the server to price your design. Please try again.",
      );
    }
  }, [basket, nameOf]);

  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  const preview = useMemo(() => buildQuote(basket, getItem), [basket, getItem]);
  const view = serverQuote
    ? {
        subtotal: serverQuote.subtotalPence / 100,
        groups: serverQuote.bySupplier.map((g) => ({
          supplier: g.supplier,
          total: g.totalPence / 100,
        })),
      }
    : {
        subtotal: preview.subtotal,
        groups: preview.bySupplier.map((g) => ({
          supplier: g.supplier,
          total: g.total,
        })),
      };

  async function placeOrder() {
    if (!serverQuote || submitting) return;
    setError(null);
    const dateIssue = dateProblem;
    if (dateIssue) return setError(dateIssue);
    if (!name.trim()) return setError("Please tell us your names.");
    if (!EMAIL.test(email.trim()))
      return setError("Please enter a valid email address.");
    if (unavailable.length > 0) {
      return setError(
        "Some items aren't available for their requested hire periods. Please adjust them below first.",
      );
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // The estimate shown above, so a price change requires another review.
          basket: basket.map((l) => ({
            itemId: l.itemId,
            quantity: l.quantity,
            seenUnitPricePence: serverQuote.lines.find(
              (q) => q.itemId === l.itemId,
            )?.unitPricePence,
          })),
          coupleName: name.trim(),
          email: email.trim(),
          weddingDate: weddingDate || undefined,
          deliveryDate: delivery,
          returnDate: defaults.end,
          itemDates: Object.fromEntries(basket.filter(l => l.hireDates).map(l => [l.itemId, l.hireDates])),
          styleId,
          guestCount,
          venueLabel,
          ...(eventName ? {notes:`Event plan: ${eventName}`} : {}),
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
        setError(
          "Some prices changed while you were checking out. We've updated your total, so please review it and confirm again.",
        );
        await Promise.all([fetchQuote(), refresh()]);
      } else if (res.status === 422 && data?.tooSoon) {
        const items = (data.tooSoon as { name: string; leadTimeDays: number }[])
          .map((t) => `${t.name} (needs ${t.leadTimeDays} days' notice)`)
          .join(", ");
        setError(`Your delivery date is too soon for: ${items}.`);
      } else if (res.status === 409 && data?.soldOut) {
        // Someone else took the last units, or stock changed, since availability was checked.
        const items = (
          data.soldOut as { name: string; availableUnits: number }[]
        )
          .map(
            (s) =>
              `${s.name} (${s.availableUnits > 0 ? `only ${s.availableUnits} left` : "none left"})`,
          )
          .join(", ");
        setError(
          `These items aren't available for their requested hire periods: ${items}. Please lower the quantity, remove them, or choose another date.`,
        );
        setAvailabilityNonce((n) => n + 1);
      } else if (data?.unavailable?.length) {
        setError(
          `These items are no longer available: ${(data.unavailable as string[]).map(nameOf).join(", ")}. Please remove them from your design.`,
        );
      } else {
        setError(data?.error ?? "Couldn't place your order. Please try again.");
      }
    } catch {
      setError(
        "Couldn't reach the server. Please check your connection and try again.",
      );
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
        <h1 className="mt-6 font-serif text-3xl text-ink">
          Your request is with Styled.
        </h1>
        <p className="mt-2 text-sm text-ink/50">
          Reference{" "}
          <span className="font-medium text-ink">{placed.reference}</span>
        </p>
        <p className="mt-3 text-ink/60">
          A stylist will confirm availability with each of your{" "}
          {placed.bySupplier.length} suppliers and contact {placed.email} about
          a final quote and the next steps. Agree payment and delivery or collection before booking. This request does not reserve stock. No payment has been taken.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a
            href="/design?tab=orders"
            className="rounded-full bg-ink px-6 py-3 text-sm text-cream hover:bg-ink/90"
          >
            View my orders
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
      <h1 className="mt-4 font-serif text-4xl text-ink">
        Request supplier confirmation.
      </h1>
      <p className="mt-2 text-ink/60">
        Suppliers confirm availability and a final quote before you book. No payment is taken now.
      </p>

      <p className="mt-3 text-sm text-ink/70">{eventName && <strong>{eventName}. </strong>}Allow time for supplier lead times, delivery and setup.</p>
      <ContextHelp title="Before sending your request">
        <p>Request well ahead of the event and agree any essential arrival deadline in writing. This request does not reserve stock. Other event baskets are submitted separately.</p>
      </ContextHelp>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* Details form */}
        <div className="space-y-4">
          <div>
            <label htmlFor="checkout-names" className="text-sm font-medium text-ink">Your names</label>
            <input
              id="checkout-names"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex & Sam"
              className="mt-2 w-full rounded-xl border border-sand bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-clay/30"
            />
          </div>
          <div>
            <label htmlFor="checkout-email" className="text-sm font-medium text-ink">Email</label>
            <input
              id="checkout-email"
              autoComplete="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="mt-2 w-full rounded-xl border border-sand bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-clay/30"
            />
          </div>
          <div>
            <label
              htmlFor="checkout-date"
              className="text-sm font-medium text-ink"
            >
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
                ? "Add your wedding and delivery dates so we can check availability."
                : availability.loading
                  ? "Checking every supplier for your date…"
                  : availability.error
                    ? availability.error
                    : unavailable.length > 0
                      ? "Some items need attention for this date:"
                      : "Availability checked for each item’s complete hire period."}
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
          <section className="space-y-3 rounded-xl border border-sand p-4">
            <h2 className="font-serif text-xl">Dates for your items</h2>
            <p className="text-xs text-ink/60">All items use your default hire dates unless you choose different dates below. The final quote may vary with the hire period.</p>
            {basket.map(line => <div key={line.itemId}>
              <h3 className="mt-3 text-sm font-medium">{nameOf(line.itemId)}</h3>
              <ItemHireDates line={line} name={nameOf(line.itemId)} defaults={defaults}
                onChange={onItemDates} id={`checkout-${line.itemId}`} />
            </div>)}
          </section>
          <div className="rounded-xl border border-dashed border-sand bg-cream/50 p-4 text-sm text-ink/50">
            This form submits a request for manual review. Your final quote, any deposit, payment dates and delivery or collection costs must be agreed separately. No payment is taken here.
          </div>
          {error && (
            <p
              role="alert"
              className="rounded-xl bg-blush/30 px-4 py-3 text-sm text-ink/80"
            >
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={placeOrder}
            disabled={
              !serverQuote ||
              submitting ||
              basket.length === 0 ||
              unavailable.length > 0 ||
              availability.loading ||
              !availability.checked ||
              !!availability.error ||
              !!dateProblem
            }
            className="w-full rounded-full bg-ink px-6 py-3.5 text-cream hover:bg-ink/90 disabled:bg-ink/30"
          >
            {submitting
              ? "Submitting your request…"
              : serverQuote
                ? "Submit request for manual review"
                : "Preparing your quote…"}
          </button>
        </div>

        {/* Order summary */}
        <aside className="h-fit rounded-2xl border border-sand bg-white p-5 shadow-sm">
          <h2 className="font-serif text-lg text-ink">Selection estimate</h2>
          <div className="mt-4 space-y-3">
            {view.groups.map((g) => (
              <div key={g.supplier} className="flex justify-between text-sm">
                <span className="text-ink/60">{g.supplier}</span>
                <span className="text-ink">{formatGBP(g.total)}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 border-t border-sand pt-5">
            <DeliveryDates
              weddingDate={weddingDate}
              deliverySameDay={deliverySameDay}
              deliveryDate={deliveryDate}
              returnDate={returnDate}
              onChange={onDates}
              id="checkout"
            />
          </div>

          <div className="mt-4 border-t border-sand pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-ink/60">Estimated total</span>
              <span className="font-serif text-lg text-ink">
                {formatGBP(view.subtotal)}
              </span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-ink/70">Item estimate only. Delivery or collection charges and any deposit are confirmed in the final quote, not charged here. <a href="/service-info" className="underline">Service information</a>.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
