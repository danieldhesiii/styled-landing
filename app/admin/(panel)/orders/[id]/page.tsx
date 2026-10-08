"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import StatusPill from "@/components/admin/StatusPill";
import { adminApi, ago, dateTime, daysUntil, longDay, money } from "@/lib/admin-client";
import { availabilityLabel, type ItemAvailability } from "@/lib/availability";

interface Line {
  id: string;
  product_id: string | null;
  product_name: string;
  supplier_name: string;
  unit: string | null;
  unit_price_pence: number;
  quantity: number;
  line_total_pence: number;
  supplier_status: "pending" | "confirmed" | "declined";
  supplier_note: string | null;
  supplier_decided_at: string | null;
  needed_date: string | null;
}
interface OrderEvent {
  id: string;
  type: string;
  actor_label: string | null;
  detail: { message?: string; note?: string; from?: string; forced?: boolean; lines?: { name: string; supplier: string }[]; line_count?: number } | null;
  created_at: string;
}
interface Order {
  id: string;
  reference: string;
  status: string;
  created_at: string;
  couple_name: string;
  email: string;
  phone: string | null;
  wedding_date: string | null;
  venue_label: string | null;
  style_id: string | null;
  guest_count: number | null;
  notes: string | null;
  staff_notes: string | null;
  couple_message: string | null;
  subtotal_pence: number;
  deposit_pence: number;
  commission_pence: number;
}
interface Detail {
  order: Order;
  lines: Line[];
  events: OrderEvent[];
  availability: Record<string, ItemAvailability>;
  renderUrl: string | null;
}

const LINE_PILL: Record<Line["supplier_status"], string> = { pending: "pending", confirmed: "confirmed", declined: "declined" };
const LINE_LABEL: Record<Line["supplier_status"], string> = { pending: "Waiting", confirmed: "Confirmed", declined: "Declined" };
const TONE: Record<string, string> = { ok: "text-sage", warn: "text-clay", bad: "text-red-700", muted: "text-ink/40" };

function eventText(e: OrderEvent): string {
  const names = Array.isArray(e.detail?.lines) ? e.detail.lines.map((l) => l.name).join(", ") : "";
  switch (e.type) {
    case "placed":
      return "Order placed by the couple";
    case "line_confirmed":
      return `Supplier confirmed: ${names}`;
    case "line_declined":
      return `Supplier declined: ${names}`;
    case "line_reset":
      return `Set back to waiting: ${names}`;
    case "status_confirmed":
      return e.detail?.forced ? "Order confirmed (despite an availability warning)" : "Order confirmed";
    case "status_declined":
      return "Order declined";
    case "status_cancelled":
      return "Order cancelled";
    case "message_to_couple":
      return "Message sent to the couple";
    case "staff_notes_updated":
      return "Internal notes updated";
    default:
      return e.type;
  }
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [d, setD] = useState<Detail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [conflicts, setConflicts] = useState<boolean>(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [declineLine, setDeclineLine] = useState<{ ids: string[]; label: string; note: string } | null>(null);
  const [mode, setMode] = useState<null | "decline" | "cancel">(null);
  const [decisionMessage, setDecisionMessage] = useState("");
  const [message, setMessage] = useState<string | null>(null); // draft; null = untouched
  const [notes, setNotes] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await adminApi(`/api/admin/orders/${id}`);
    if (!r.ok) return setLoadError(r.status === 404 ? "Order not found." : (r.data?.error ?? "Couldn't load this order."));
    setLoadError(null);
    setD(r.data as Detail);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Run a change, show what the server says, and adopt the refreshed order it returns.
  async function run(key: string, call: () => ReturnType<typeof adminApi>, onSuccess?: () => void) {
    setBusy(key);
    setNotice(null);
    setProblems([]);
    setConflicts(false);
    const r = await call();
    setBusy(null);
    if (r.ok) {
      setD(r.data as Detail);
      onSuccess?.();
      return true;
    }
    setNotice(r.data?.error ?? "That didn't work. Please try again.");
    if (Array.isArray(r.data?.blocking)) {
      setProblems(r.data.blocking.map((b: { name: string; supplier: string; status: string }) => `${b.name} (${b.supplier}) is ${b.status === "declined" ? "declined" : "still waiting"}`));
    }
    if (Array.isArray(r.data?.conflicts)) {
      setProblems(r.data.conflicts.map((c: { name: string; requested: number; availableUnits: number }) => `${c.name}: the order needs ${c.requested} but only ${c.availableUnits} are free now`));
      setConflicts(true);
    }
    return false;
  }

  const setLines = (ids: string[], supplierStatus: Line["supplier_status"], note?: string) =>
    run(`lines:${ids.join()}:${supplierStatus}`, () => adminApi(`/api/admin/orders/${id}/lines`, "PATCH", { lineIds: ids, supplierStatus, ...(note !== undefined ? { note } : {}) }));

  const groups = useMemo(() => {
    const m = new Map<string, Line[]>();
    for (const l of d?.lines ?? []) m.set(l.supplier_name, [...(m.get(l.supplier_name) ?? []), l]);
    return [...m];
  }, [d?.lines]);

  if (loadError) {
    return (
      <div>
        <Link href="/admin" className="text-sm text-ink/50 hover:text-ink">← All orders</Link>
        <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{loadError}</p>
      </div>
    );
  }
  if (!d) return <p className="text-sm text-ink/40">Loading order…</p>;

  const { order, lines, events, availability, renderUrl } = d;
  const requested = order.status === "requested";
  const confirmedCount = lines.filter((l) => l.supplier_status === "confirmed").length;
  const allConfirmed = lines.length > 0 && confirmedCount === lines.length;
  const away = daysUntil(order.wedding_date);
  const balance = order.subtotal_pence - order.deposit_pence;
  const messageValue = message ?? order.couple_message ?? "";
  const notesValue = notes ?? order.staff_notes ?? "";

  return (
    <div>
      <Link href="/admin" className="text-sm text-ink/50 hover:text-ink">← All orders</Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-sm text-ink/45">{order.reference}</p>
          <h1 className="font-serif text-4xl text-ink">{order.couple_name}</h1>
          <p className="mt-1 text-sm text-ink/50">
            Placed {ago(order.created_at)} · {longDay(order.wedding_date)}
            {away !== null && away >= 0 ? ` (in ${away} days)` : ""}
          </p>
        </div>
        <StatusPill status={order.status} />
      </div>

      {notice && (
        <div role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
          <p className="font-medium">{notice}</p>
          {problems.length > 0 && (
            <ul className="mt-1 list-disc pl-5">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
          {conflicts && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => run("force", () => adminApi(`/api/admin/orders/${id}`, "PATCH", { status: "confirmed", coupleMessage: decisionMessage.trim() || undefined, force: true }))}
              className="mt-3 rounded-full bg-red-800 px-4 py-1.5 text-xs text-white hover:bg-red-900 disabled:opacity-50"
            >
              Confirm anyway
            </button>
          )}
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* ---------------------------------------------------------- suppliers */}
        <section aria-label="Suppliers and items" className="space-y-5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-2xl text-ink">Suppliers</h2>
            <span className="text-sm text-ink/50">
              {confirmedCount} of {lines.length} items confirmed
            </span>
          </div>

          {groups.map(([supplier, ls]) => {
            const pending = ls.filter((l) => l.supplier_status !== "confirmed");
            // A supplier's delivery date (shared by its lines); flag when it's not the wedding day.
            const deliveryDate = ls[0]?.needed_date ?? null;
            const differentDay = deliveryDate && deliveryDate !== order.wedding_date;
            return (
              <div key={supplier} className="overflow-hidden rounded-3xl border border-sand bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sand bg-cream/50 px-5 py-3">
                  <div>
                    <p className="font-medium text-ink">{supplier}</p>
                    <p className="text-xs text-ink/45">
                      {money(ls.reduce((s, l) => s + l.line_total_pence, 0))}
                      {differentDay && <span className="ml-2 text-clay">Deliver {longDay(deliveryDate)}</span>}
                    </p>
                  </div>
                  {requested && pending.length > 0 && (
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => setLines(pending.map((l) => l.id), "confirmed")}
                      className="rounded-full bg-sage px-4 py-1.5 text-xs font-medium text-white hover:bg-sage/90 disabled:opacity-50"
                    >
                      {busy?.startsWith("lines:") ? "Saving…" : `Supplier confirmed all${pending.length < ls.length ? ` (${pending.length} left)` : ""}`}
                    </button>
                  )}
                </div>
                <ul className="divide-y divide-sand">
                  {ls.map((l) => {
                    const a = l.product_id ? availability[l.product_id] : undefined;
                    const lab = a ? availabilityLabel(a) : null;
                    const showDecline = declineLine?.ids.includes(l.id);
                    return (
                      <li key={l.id} className="px-5 py-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-ink">{l.product_name}</p>
                            <p className="text-xs text-ink/50">
                              {l.quantity} × {money(l.unit_price_pence)}
                              {l.unit ? ` ${l.unit}` : ""} = <span className="text-ink">{money(l.line_total_pence)}</span>
                            </p>
                            {lab && order.wedding_date && (
                              <p className={`mt-0.5 text-xs ${TONE[lab.tone]}`}>
                                {lab.tone === "ok" ? "✓ " : lab.tone === "bad" ? "⚠ " : ""}
                                {lab.label.replace("your date", "the wedding date")}
                              </p>
                            )}
                            {!order.wedding_date && <p className="mt-0.5 text-xs text-ink/40">No date, so availability couldn&apos;t be checked</p>}
                            {l.supplier_note && <p className="mt-1 text-xs italic text-ink/50">Note: {l.supplier_note}</p>}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <StatusPill status={LINE_PILL[l.supplier_status]} label={LINE_LABEL[l.supplier_status]} />
                            {requested && (
                              <div className="flex flex-wrap justify-end gap-1.5">
                                {l.supplier_status !== "confirmed" && (
                                  <button type="button" disabled={busy !== null} onClick={() => setLines([l.id], "confirmed")} className="rounded-full border border-sage/50 px-3 py-1 text-xs text-sage hover:bg-sage/10 disabled:opacity-50">
                                    Confirm
                                  </button>
                                )}
                                {l.supplier_status !== "declined" && (
                                  <button type="button" disabled={busy !== null} onClick={() => setDeclineLine({ ids: [l.id], label: l.product_name, note: "" })} className="rounded-full border border-red-300 px-3 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50">
                                    Decline…
                                  </button>
                                )}
                                {l.supplier_status !== "pending" && (
                                  <button type="button" disabled={busy !== null} onClick={() => setLines([l.id], "pending")} className="rounded-full border border-ink/15 px-3 py-1 text-xs text-ink/60 hover:border-ink/40 disabled:opacity-50">
                                    Reset
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        {showDecline && (
                          <div className="mt-3 rounded-xl bg-red-50 p-3">
                            <label htmlFor={`why-${l.id}`} className="text-xs font-medium text-red-900">
                              Why can&apos;t {supplier} supply {declineLine!.label}? (internal)
                            </label>
                            <textarea
                              id={`why-${l.id}`}
                              value={declineLine!.note}
                              onChange={(e) => setDeclineLine({ ...declineLine!, note: e.target.value })}
                              rows={2}
                              className="mt-1.5 w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-red-300"
                            />
                            <div className="mt-2 flex gap-2">
                              <button
                                type="button"
                                disabled={busy !== null}
                                onClick={async () => {
                                  if (await setLines(declineLine!.ids, "declined", declineLine!.note.trim() || undefined)) setDeclineLine(null);
                                }}
                                className="rounded-full bg-red-700 px-4 py-1.5 text-xs text-white hover:bg-red-800 disabled:opacity-50"
                              >
                                Mark as declined
                              </button>
                              <button type="button" onClick={() => setDeclineLine(null)} className="rounded-full px-3 py-1.5 text-xs text-ink/60 hover:text-ink">
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}

          {/* -------------------------------------------------------- history */}
          <div>
            <h2 className="font-serif text-2xl text-ink">History</h2>
            <ol className="mt-3 space-y-3 border-l border-sand pl-5">
              {[...events].reverse().map((e) => (
                <li key={e.id} className="relative text-sm">
                  <span className="absolute -left-[1.62rem] top-1.5 h-2 w-2 rounded-full bg-clay" aria-hidden />
                  <p className="text-ink">{eventText(e)}</p>
                  {(e.detail?.message || e.detail?.note) && <p className="mt-0.5 border-l-2 border-sand pl-2 text-xs italic text-ink/55">{e.detail.message ?? e.detail.note}</p>}
                  <p className="text-xs text-ink/40">
                    {e.actor_label ?? "The couple"} · {dateTime(e.created_at)}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------------------------------------------------------- side panel */}
        <aside className="space-y-5">
          {/* decisions */}
          <section aria-label="Decide" className="rounded-3xl border border-sand bg-white p-5 shadow-sm">
            <h2 className="font-serif text-xl text-ink">Decision</h2>
            {requested ? (
              <>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink/10" aria-hidden>
                  <div className="h-full bg-sage transition-all" style={{ width: `${lines.length ? (confirmedCount / lines.length) * 100 : 0}%` }} />
                </div>
                <p className="mt-2 text-xs text-ink/50">
                  {allConfirmed ? "Every supplier has confirmed." : `${lines.length - confirmedCount} item${lines.length - confirmedCount === 1 ? "" : "s"} still need a supplier to confirm.`}
                </p>
                <button
                  type="button"
                  disabled={!allConfirmed || busy !== null}
                  onClick={() => run("confirm", () => adminApi(`/api/admin/orders/${id}`, "PATCH", { status: "confirmed", coupleMessage: decisionMessage.trim() || undefined }))}
                  className="mt-4 w-full rounded-full bg-ink px-5 py-2.5 text-sm text-cream hover:bg-ink/90 disabled:bg-ink/25"
                >
                  {busy === "confirm" ? "Confirming…" : "Confirm order"}
                </button>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setMode(mode === "decline" ? null : "decline")} className="rounded-full border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50">
                    Decline…
                  </button>
                  <button type="button" onClick={() => setMode(mode === "cancel" ? null : "cancel")} className="rounded-full border border-ink/15 px-4 py-2 text-sm text-ink/70 hover:border-ink/40">
                    Cancel…
                  </button>
                </div>
              </>
            ) : order.status === "confirmed" ? (
              <>
                <p className="mt-2 text-sm text-ink/60">Confirmed. Every supplier has the date.</p>
                <button type="button" onClick={() => setMode(mode === "cancel" ? null : "cancel")} className="mt-3 w-full rounded-full border border-ink/15 px-4 py-2 text-sm text-ink/70 hover:border-ink/40">
                  Cancel order…
                </button>
              </>
            ) : (
              <p className="mt-2 text-sm text-ink/60">This order is {order.status.replace("_", " ")}. No further action is needed.</p>
            )}

            {mode && (
              <div className={`mt-4 rounded-xl p-3 ${mode === "decline" ? "bg-red-50" : "bg-sand/60"}`}>
                <label htmlFor="decision-msg" className="text-xs font-medium text-ink">
                  Message to the couple {mode === "decline" ? "(required: say why)" : "(optional)"}
                </label>
                <textarea
                  id="decision-msg"
                  rows={3}
                  value={decisionMessage}
                  onChange={(e) => setDecisionMessage(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-sand bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-clay/30"
                />
                <button
                  type="button"
                  disabled={busy !== null || (mode === "decline" && !decisionMessage.trim())}
                  onClick={() =>
                    run(mode, () => adminApi(`/api/admin/orders/${id}`, "PATCH", { status: mode === "decline" ? "declined" : "cancelled", coupleMessage: decisionMessage.trim() || undefined }), () => {
                      setMode(null);
                      setDecisionMessage("");
                    })
                  }
                  className="mt-2 w-full rounded-full bg-ink px-4 py-2 text-sm text-cream hover:bg-ink/90 disabled:bg-ink/25"
                >
                  {mode === "decline" ? "Decline this order" : "Cancel this order"}
                </button>
              </div>
            )}
          </section>

          {/* the couple */}
          <section aria-label="Couple" className="rounded-3xl border border-sand bg-white p-5 shadow-sm">
            <h2 className="font-serif text-xl text-ink">The couple</h2>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-ink/50">Email</dt><dd><a className="text-clay underline-offset-2 hover:underline" href={`mailto:${order.email}`}>{order.email}</a></dd></div>
              {order.phone && <div className="flex justify-between gap-3"><dt className="text-ink/50">Phone</dt><dd><a className="text-clay hover:underline" href={`tel:${order.phone}`}>{order.phone}</a></dd></div>}
              <div className="flex justify-between gap-3"><dt className="text-ink/50">Wedding</dt><dd className="text-right text-ink">{longDay(order.wedding_date)}</dd></div>
              {order.venue_label && <div className="flex justify-between gap-3"><dt className="text-ink/50">Venue</dt><dd className="text-right text-ink">{order.venue_label}</dd></div>}
              {order.guest_count && <div className="flex justify-between gap-3"><dt className="text-ink/50">Guests</dt><dd className="text-ink">{order.guest_count}</dd></div>}
              {order.style_id && <div className="flex justify-between gap-3"><dt className="text-ink/50">Style</dt><dd className="text-ink">{order.style_id.replace("_", " ")}</dd></div>}
            </dl>
            {order.notes && <p className="mt-3 rounded-xl bg-cream px-3 py-2 text-sm text-ink/70">“{order.notes}”</p>}
          </section>

          {renderUrl && (
            <section aria-label="Their design" className="overflow-hidden rounded-3xl border border-sand bg-white shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={renderUrl} alt="The room the couple designed" className="w-full object-cover" />
              <p className="px-5 py-3 text-xs text-ink/50">The room they designed in the studio.</p>
            </section>
          )}

          {/* money */}
          <section aria-label="Money" className="rounded-3xl border border-sand bg-white p-5 shadow-sm">
            <h2 className="font-serif text-xl text-ink">Money</h2>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-ink/50">Order total</dt><dd className="font-serif text-lg text-ink">{money(order.subtotal_pence)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink/50">Deposit</dt><dd className="text-clay">{money(order.deposit_pence)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink/50">Balance</dt><dd className="text-ink">{money(balance)}</dd></div>
              <div className="flex justify-between border-t border-sand pt-1.5"><dt className="text-ink/50">Styled&apos;s commission</dt><dd className="text-ink">{money(order.commission_pence)}</dd></div>
            </dl>
            <p className="mt-2 text-[11px] text-ink/40">Payments aren&apos;t connected yet, so nothing has been charged.</p>
          </section>

          {/* messages and notes */}
          <section aria-label="Messages and notes" className="rounded-3xl border border-sand bg-white p-5 shadow-sm">
            <h2 className="font-serif text-xl text-ink">Message to the couple</h2>
            <p className="mt-1 text-xs text-ink/45">Shown on their order page. Not an email.</p>
            <textarea
              aria-label="Message to the couple"
              rows={3}
              value={messageValue}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-2 w-full rounded-xl border border-sand bg-cream/50 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-clay/30"
            />
            <button
              type="button"
              disabled={busy !== null || message === null || message === (order.couple_message ?? "")}
              onClick={() => run("message", () => adminApi(`/api/admin/orders/${id}`, "PATCH", { coupleMessage: message!.trim() || null }), () => setMessage(null))}
              className="mt-2 rounded-full bg-ink px-4 py-1.5 text-xs text-cream hover:bg-ink/90 disabled:bg-ink/25"
            >
              {busy === "message" ? "Saving…" : "Save message"}
            </button>

            <h2 className="mt-6 font-serif text-xl text-ink">Internal notes</h2>
            <p className="mt-1 text-xs text-ink/45">Only staff can see these.</p>
            <textarea
              aria-label="Internal notes"
              rows={3}
              value={notesValue}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-2 w-full rounded-xl border border-sand bg-cream/50 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-clay/30"
            />
            <button
              type="button"
              disabled={busy !== null || notes === null || notes === (order.staff_notes ?? "")}
              onClick={() => run("notes", () => adminApi(`/api/admin/orders/${id}`, "PATCH", { staffNotes: notes!.trim() || null }), () => setNotes(null))}
              className="mt-2 rounded-full border border-ink/20 px-4 py-1.5 text-xs text-ink hover:border-ink/50 disabled:opacity-40"
            >
              {busy === "notes" ? "Saving…" : "Save notes"}
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}
