import { formatGBP } from "@/lib/quote";

// What a couple sees of their order: where it's up to, what each supplier has
// said, and any message from their stylist. Staff-only details never reach here.

export interface OrderViewLine {
  name: string;
  supplier: string;
  unit: string | null;
  quantity: number;
  lineTotalPence: number;
  supplierStatus: "pending" | "confirmed" | "declined";
  neededDate: string | null;
}

export interface OrderView {
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

const BANNER: Record<OrderView["status"], { title: string; body: string; tone: string }> = {
  requested: {
    title: "We're confirming your suppliers",
    body: "A stylist is checking each supplier is free on your date. You'll see each one tick off below, and any message from us will appear here.",
    tone: "border-clay/30 bg-clay/10",
  },
  confirmed: {
    title: "Confirmed",
    body: "Every supplier has confirmed your date.",
    tone: "border-sage/40 bg-sage/15",
  },
  declined: {
    title: "We couldn't take this order",
    body: "We're sorry. Your stylist has explained why below.",
    tone: "border-red-200 bg-red-50",
  },
  cancelled: {
    title: "Cancelled",
    body: "This order has been cancelled.",
    tone: "border-ink/15 bg-ink/5",
  },
  deposit_paid: {
    title: "Deposit received",
    body: "Your deposit has been received and your date is secured.",
    tone: "border-sage/40 bg-sage/15",
  },
};

function formatDay(day: string | null) {
  if (!day) return "Date to be confirmed";
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

const LINE_BADGE: Record<OrderViewLine["supplierStatus"], { label: string; cls: string }> = {
  confirmed: { label: "Confirmed", cls: "bg-sage/15 text-sage" },
  pending: { label: "Waiting for supplier", cls: "bg-ink/5 text-ink/50" },
  declined: { label: "Not available", cls: "bg-red-100 text-red-700" },
};

export default function OrderStatusCard({ order }: { order: OrderView }) {
  const banner = BANNER[order.status];
  const groups = new Map<string, OrderViewLine[]>();
  for (const l of order.lines) groups.set(l.supplier, [...(groups.get(l.supplier) ?? []), l]);

  return (
    <article className="overflow-hidden rounded-3xl border border-sand bg-white shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-sand px-6 py-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink/40">Reference</p>
          <p className="font-serif text-2xl text-ink">{order.reference}</p>
        </div>
        <div className="text-right text-sm text-ink/60">
          <p>{order.coupleName}</p>
          <p>{formatDay(order.weddingDate)}</p>
          {order.venueLabel && <p className="text-ink/40">{order.venueLabel}</p>}
        </div>
      </div>

      <div className={`mx-6 mt-5 rounded-2xl border px-5 py-4 ${banner.tone}`}>
        <p className="font-medium text-ink">{banner.title}</p>
        <p className="mt-1 text-sm text-ink/65">{banner.body}</p>
        {order.coupleMessage && (
          <p className="mt-3 border-l-2 border-clay/50 pl-3 text-sm text-ink">
            <span className="block text-[11px] uppercase tracking-wide text-ink/40">Message from your stylist</span>
            {order.coupleMessage}
          </p>
        )}
      </div>

      <div className="space-y-5 px-6 py-5">
        {[...groups].map(([supplier, lines]) => {
          const declined = lines.some((l) => l.supplierStatus === "declined");
          const allIn = lines.every((l) => l.supplierStatus === "confirmed");
          const badge = declined ? LINE_BADGE.declined : allIn ? LINE_BADGE.confirmed : LINE_BADGE.pending;
          // All of a supplier's lines share a delivery date; show it when it isn't
          // the wedding day.
          const deliveryDate = lines[0]?.neededDate ?? null;
          const differentDay = deliveryDate && deliveryDate !== order.weddingDate;
          return (
            <section key={supplier}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-medium text-ink">{supplier}</h3>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${badge.cls}`}>{badge.label}</span>
              </div>
              {differentDay && (
                <p className="mt-0.5 text-xs text-clay">Delivery: {formatDay(deliveryDate)}</p>
              )}
              <ul className="mt-2 divide-y divide-sand rounded-xl border border-sand">
                {lines.map((l, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="text-ink/80">
                      {l.name}
                      <span className="text-ink/40"> × {l.quantity}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      {l.supplierStatus !== "pending" && (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${LINE_BADGE[l.supplierStatus].cls}`}>
                          {LINE_BADGE[l.supplierStatus].label}
                        </span>
                      )}
                      <span className="tabular-nums text-ink">{formatGBP(l.lineTotalPence / 100)}</span>
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
          <span className="text-ink/60">Total</span>
          <span className="font-serif text-lg text-ink">{formatGBP(order.subtotalPence / 100)}</span>
        </div>
        <div className="mt-1 flex justify-between">
          <span className="text-ink/60">Deposit</span>
          <span className="text-clay">{formatGBP(order.depositPence / 100)}</span>
        </div>
        <div className="mt-1 flex justify-between">
          <span className="text-ink/60">Balance (due six weeks before)</span>
          <span className="text-ink">{formatGBP(order.balancePence / 100)}</span>
        </div>
      </div>
    </article>
  );
}
