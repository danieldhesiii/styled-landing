"use client";
import { useEffect, useState } from "react";
import BookingOperations from "@/components/booking/BookingOperations";
import { dateRangeLabel } from "@/lib/booking-dates";
import { formatGBP } from "@/lib/quote";

// What a couple sees of their order: where it's up to, what each supplier has
// said, and any message from their stylist. Staff-only details never reach here.

export interface OrderViewLine {
  name: string;
  supplier: string;
  unit: string | null;
  quantity: number;
  lineTotalPence: number | null;
  requestOnly?: boolean;
  priceOnRequest?: boolean;
  supplierStatus: "pending" | "confirmed" | "declined";
  neededDate: string | null;
  returnDate?: string | null;
}

export interface OrderView {
  bookingPhase?: string;
  hasUnpricedLines?: boolean;
  requestOnly?: boolean;
  id: string;
  reference: string;
  status: "requested" | "confirmed" | "declined" | "cancelled" | "deposit_paid";
  coupleMessage: string | null;
  createdAt: string;
  coupleName: string;
  weddingDate: string | null;
  venueLabel: string | null;
  subtotalPence: number;
  depositPence: number;
  balancePence: number;
  lines: OrderViewLine[];
}

const BANNER: Record<
  OrderView["status"],
  { title: string; body: string; tone: string }
> = {
  requested: {
    title: "Awaiting manual confirmation",
    body: "Styled is checking with suppliers. Nothing is booked yet.",
    tone: "border-clay/30 bg-clay/10",
  },
  confirmed: {
    title: "Confirmed",
    body: "Availability confirmed. Check the final quote and agreed payment and delivery arrangements.",
    tone: "border-sage/40 bg-sage/15",
  },
  declined: {
    title: "We couldn't take this order",
    body: "See the message from Styled below for the reason and next steps.",
    tone: "border-red-200 bg-red-50",
  },
  cancelled: {
    title: "Cancelled",
    body: "This order has been cancelled.",
    tone: "border-ink/15 bg-ink/5",
  },
  deposit_paid: {
    title: "Deposit received",
    body: "Deposit marked as received. Check your agreed quote and payment confirmation.",
    tone: "border-sage/40 bg-sage/15",
  },
};

function formatDay(day: string | null) {
  if (!day) return "Date to be confirmed";
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

const LINE_BADGE: Record<
  OrderViewLine["supplierStatus"],
  { label: string; cls: string }
> = {
  confirmed: { label: "Availability agreed", cls: "bg-sage/15 text-sage" },
  pending: { label: "Waiting for supplier", cls: "bg-ink/5 text-ink/50" },
  declined: { label: "Not available", cls: "bg-red-100 text-red-700" },
};

export default function OrderStatusCard({ order: initialOrder }: { order: OrderView }) {
  const [order, setOrder] = useState(initialOrder);
  const [refreshError, setRefreshError] = useState("");
  useEffect(() => { setOrder(initialOrder); }, [initialOrder]);
  async function refreshSummary(bookingPhase: string) {
    try {
      const response = await fetch(`/api/orders/${initialOrder.id}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.order) throw Error("Could not refresh the summary.");
      setOrder({ ...result.order, bookingPhase });
      setRefreshError("");
    } catch { setRefreshError("Your change was saved. Refresh updates to reload the request summary."); }
  }
  const banner = { ...BANNER[order.status] };
  if (order.status === "requested" && order.bookingPhase === "quoted") {
    banner.title = "Your quote is ready";
    banner.body = "Review the hire dates, full price and supplier terms below.";
  } else if (order.status === "requested" && order.bookingPhase === "accepted") {
    banner.title = "Quote accepted";
    banner.body = "Styled is arranging final confirmation. Your booking reference and agreed terms will appear here.";
  }
  const groups = new Map<string, OrderViewLine[]>();
  for (const l of order.lines)
    groups.set(l.supplier, [...(groups.get(l.supplier) ?? []), l]);

  return (
    <article className="overflow-hidden rounded-3xl border border-sand bg-white shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-sand px-6 py-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink/40">
            Reference
          </p>
          <p className="font-serif text-2xl text-ink">{order.reference}</p>
        </div>
        <div className="text-right text-sm text-ink/60">
          <p>{order.coupleName}</p>
          <p>{formatDay(order.weddingDate)}</p>
          {order.venueLabel && (
            <p className="text-ink/40">{order.venueLabel}</p>
          )}
        </div>
      </div>

      <div className={`mx-6 mt-5 rounded-2xl border px-5 py-4 ${banner.tone}`}>
        <p className="font-medium text-ink">{banner.title}</p>
        <p className="mt-1 text-sm text-ink/65">{banner.body}</p>
        {order.coupleMessage && (
          <p className="mt-3 border-l-2 border-clay/50 pl-3 text-sm text-ink">
            <span className="block text-sm uppercase tracking-wide text-ink/40">
              Message from Styled
            </span>
            {order.coupleMessage}
          </p>
        )}
      </div>

      <div className="px-6 pb-4"><BookingOperations orderId={order.id} role="customer" phaseHint={order.bookingPhase} onSaved={refreshSummary}/>{refreshError&&<p role="status" className="mt-3 text-xs text-clay">{refreshError}</p>}</div>
      <div className="space-y-5 px-6 py-5">
        {[...groups].map(([supplier, lines]) => {
          const declined = lines.some((l) => l.supplierStatus === "declined");
          const allIn = lines.every((l) => !l.requestOnly && l.supplierStatus === "confirmed");
          const badge = declined
            ? LINE_BADGE.declined
            : allIn
              ? LINE_BADGE.confirmed
              : LINE_BADGE.pending;
          return (
            <section key={supplier}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-medium text-ink">{supplier}</h3>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-sm font-medium ${badge.cls}`}
                >
                  {badge.label}
                </span>
              </div>
              <ul className="mt-2 divide-y divide-sand rounded-xl border border-sand">
                {lines.map((l, i) => (
                  <li
                    key={i}
                    className="flex flex-col items-start justify-between gap-2 px-3 py-3 text-sm sm:flex-row sm:items-center sm:gap-3"
                  >
                    <span className="text-ink/80">
                      {l.name}
                      <span className="text-ink/40"> × {l.quantity}</span>
                      <span className="mt-1 block text-xs text-clay">Requested hire: {dateRangeLabel(l.neededDate, l.returnDate ?? order.weddingDate)}</span>
                    </span>
                    <span className="flex w-full items-center justify-between gap-2 sm:w-auto">
                      {lines.length > 1 && l.supplierStatus !== "pending" && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-sm font-medium ${LINE_BADGE[l.supplierStatus].cls}`}
                        >
                          {LINE_BADGE[l.supplierStatus].label}
                        </span>
                      )}
                      <span className="ml-auto tabular-nums text-ink">
                        {l.priceOnRequest || l.lineTotalPence === null ? "Price on request" : formatGBP(l.lineTotalPence / 100)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <div className="border-t border-sand bg-cream/50 px-6 py-4 text-sm">
        <div className="flex justify-between">
          <span className="text-ink/60">Estimated item total</span>
          <span className="font-serif text-lg text-ink">
            {order.hasUnpricedLines ? order.subtotalPence > 0 ? `${formatGBP(order.subtotalPence / 100)} + quote pending` : "Awaiting quote" : formatGBP(order.subtotalPence / 100)}
          </span>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-ink/70">
          Estimate only, not an amount due or payment receipt. Check the full quote for fees, deposits and payment dates.
        </p>
        <a href="/service-info#support" className="mt-2 inline-block text-xs text-ink underline">Ask about your quote or request</a>
      </div>
    </article>
  );
}
