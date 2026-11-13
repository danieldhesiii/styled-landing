"use client";
import BookingOperations from "@/components/booking/BookingOperations";
import { useEffect, useState } from "react";
import { vendorApi } from "@/lib/vendor-client";
import { dateRangeLabel } from "@/lib/booking-dates";
import { SupportButton } from "@/components/support/SupportProvider";
type Line = {
  id: string;
  name: string;
  quantity: number;
  status: string;
  note: string | null;
  neededDate: string | null;
  returnDate: string | null;
};
type Order = {
  orderId: string;
  reference: string;
  status: string;
  weddingDate: string | null;
  venue: string | null;
  actionable: boolean;
  outstandingTasks: string[];
  lines: Line[];
};
export default function SupplierRequests() {
  const [orders, setOrders] = useState<Order[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [filter, setFilter] = useState("action"),
    [search, setSearch] = useState("");
  async function load() {
    setError("");
    setLoading(true);
    try {
      const r = await vendorApi("/api/vendor/orders");
      if (!r.ok) throw Error(r.data?.error || "Could not load requests.");
      setOrders(r.data.orders);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load requests.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  const pending = (o: Order) =>
    o.outstandingTasks.length > 0;
  const visible = orders.filter(
    (o) =>
      (filter === "all" ||
        (filter === "action" && pending(o)) ||
        (filter === "upcoming" &&
          ["confirmed", "deposit_paid"].includes(o.status))) &&
      `${o.reference} ${o.venue || ""} ${o.lines.map((l) => l.name).join(" ")}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <h1 className="font-serif text-4xl">Booking requests</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink/65">
        Check your items and hire dates, then respond to Styled. Your
        availability response is one step towards a final booking.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        {[
          ["action", `Needs response (${orders.filter(pending).length})`],
          ["upcoming", "Confirmed bookings"],
          ["all", "All requests"],
        ].map(([key, label]) => (
          <button
            aria-pressed={filter === key}
            key={key}
            onClick={() => setFilter(key)}
            className={`min-h-11 rounded-full px-4 py-2 text-sm ${filter === key ? "bg-ink text-cream" : "border border-sand bg-white"}`}
          >
            {label}
          </button>
        ))}
        <button
          disabled={loading}
          className="ml-auto min-h-11 text-sm underline"
          onClick={() => void load()}
        >
          Refresh
        </button>
      </div>
      <label className="mt-5 block text-sm">
        Find a request
        <input
          type="search"
          className="mt-2 min-h-11 w-full rounded-xl border border-sand bg-white px-3"
          placeholder="Reference, venue or product"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-blush/30 p-4 text-sm">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status" className="mt-6">
          Loading requests…
        </p>
      ) : !visible.length ? (
        <div className="mt-7 rounded-2xl border border-dashed border-sand p-7">
          <h2 className="font-serif text-2xl">
            {filter === "action" ? "You’re up to date" : "No matching requests"}
          </h2>
          <p className="mt-3 text-sm text-ink/65">
            {filter === "action"
              ? "New requests for your products will appear here. Use All requests to check previous responses."
              : "Try another search or view All requests."}
          </p>
        </div>
      ) : (
        <div className="mt-7 space-y-5">
          {visible.map((o) => (
            <div key={o.orderId}><RequestCard order={o} onSaved={load} /><div className="px-5 pb-4">{o.outstandingTasks.length > 0 && <div className="mt-4 rounded-xl bg-sand/40 p-4 text-sm"><p className="font-medium">Still needed before Styled can issue a full quote</p><ul className="mt-2 list-disc pl-5">{o.outstandingTasks.map(task => <li key={task}>{task}</li>)}</ul><p className="mt-2">Open Supplier quote and booking details to add your prices and terms.</p></div>}<BookingOperations orderId={o.orderId} role="supplier" onSaved={()=>void load()}/></div></div>
          ))}
        </div>
      )}
      <p className="mt-7 text-sm text-ink/60">
        Need to change a confirmed booking?{" "}
        <SupportButton label="Contact Styled" className="min-h-11 underline" />{" "}
        with its reference. A message or availability change does not cancel a
        booking.
      </p>
    </>
  );
}
function RequestCard({
  order: o,
  onSaved,
}: {
  order: Order;
  onSaved: () => Promise<void>;
}) {
  const [selected, setSelected] = useState<string[]>(
    o.lines.filter((l) => l.status === "pending").map((l) => l.id),
  );
  const [note, setNote] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function respond(status: string, lineIds: string[]) {
    if (!lineIds.length || busy) return;
    if (status === "declined" && note.trim().length < 3) {
      setError(
        "Tell Styled why, or suggest alternative dates or products, before declining.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const r = await vendorApi(
        `/api/vendor/orders/${o.orderId}/lines`,
        "PATCH",
        { lineIds, supplierStatus: status, note: note.trim() },
      );
      if (!r.ok) throw Error(r.data?.error || "Could not save your response.");
      await onSaved();
      setNote("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save your response.",
      );
    } finally {
      setBusy(false);
    }
  }
  const waiting = o.lines
    .filter((l) => l.status === "pending")
    .map((l) => l.id);
  const chosen = waiting.filter((id) => selected.includes(id));
  return (
    <article className="rounded-2xl border border-sand bg-white p-5 sm:p-6">
      <header className="flex flex-wrap justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl">{o.reference}</h2>
          <p className="mt-1 text-sm text-ink/65">
            {o.venue || "Venue to be confirmed"}
          </p>
        </div>
        <span className="h-fit rounded-full bg-sand/60 px-3 py-2 text-xs">
          {({requested:"Awaiting Styled review",confirmed:"Booking confirmed",deposit_paid:"Deposit recorded",declined:"Request declined",cancelled:"Request cancelled"} as Record<string,string>)[o.status]||o.status}
        </span>
      </header>
      <p className="mt-3 text-sm text-ink/65">
        Event: {dateRangeLabel(o.weddingDate, o.weddingDate)}
      </p>
      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-blush/30 p-3 text-sm">
          {error}
        </p>
      )}
      <ul className="mt-4 divide-y divide-sand">
        {o.lines.map((l) => (
          <li key={l.id} className="py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <label className="flex min-h-11 items-center gap-3 font-medium">
                  {o.actionable && l.status === "pending" && (
                    <input
                      aria-label={`Include ${l.name} in response`}
                      type="checkbox"
                      disabled={busy}
                      checked={selected.includes(l.id)}
                      onChange={(e) =>
                        setSelected((ids) =>
                          e.target.checked
                            ? [...ids, l.id]
                            : ids.filter((id) => id !== l.id),
                        )
                      }
                    />
                  )}
                  {l.quantity} × {l.name}
                </label>
                <p className="mt-1 text-sm text-ink/65">
                  Hire: {dateRangeLabel(l.neededDate, l.returnDate)}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-1 text-xs ${l.status === "confirmed" ? "bg-sage/20" : l.status === "declined" ? "bg-blush/30" : "bg-sand/50"}`}
              >
                {l.status === "confirmed"
                  ? "Availability confirmed"
                  : l.status === "declined"
                    ? "Unavailable"
                    : "Needs response"}
              </span>
            </div>
            {l.note && (
              <p className="mt-2 whitespace-pre-wrap break-words text-sm text-ink/65">
                Response to Styled: {l.note}
              </p>
            )}
            {o.actionable && l.status !== "pending" && (
              <button
                disabled={busy}
                onClick={() => void respond("pending", [l.id])}
                className="mt-2 min-h-11 text-xs underline"
              >
                Reopen this item for review
              </button>
            )}
          </li>
        ))}
      </ul>
      {o.actionable && waiting.length > 0 && (
        <details className="mt-3 border-t border-sand pt-4">
          <summary className="cursor-pointer py-2 text-sm font-medium">
            Respond to {chosen.length} selected item
            {chosen.length === 1 ? "" : "s"}
          </summary>
          <label className="mt-4 block text-sm">
            Note to Styled (required if unavailable)
            <textarea
              maxLength={1000}
              rows={3}
              value={note}
              disabled={busy}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Include delivery details, clarification or alternative dates/products."
              className="mt-2 w-full rounded-xl border border-sand p-3"
            />
          </label>
          <p className="mt-2 text-xs text-ink/60">
            This note helps the Styled team coordinate the request. It does not
            move dates or substitute products automatically.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              disabled={busy || !chosen.length}
              onClick={() => void respond("confirmed", chosen)}
              className="min-h-11 rounded-full bg-ink px-5 py-3 text-sm text-cream disabled:opacity-50"
            >
              {busy ? "Saving…" : "Confirm availability"}
            </button>
            <button
              disabled={busy || !chosen.length}
              onClick={() => void respond("declined", chosen)}
              className="min-h-11 rounded-full border border-sand px-5 py-3 text-sm disabled:opacity-50"
            >
              Cannot supply
            </button>
          </div>
        </details>
      )}
    </article>
  );
}
