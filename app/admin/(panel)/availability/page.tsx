"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import StatusPill from "@/components/admin/StatusPill";
import { adminApi, shortDay } from "@/lib/admin-client";
import { CATEGORY_META } from "@/lib/categories";

interface ProductRow {
  id: string;
  name: string;
  category: string;
  unit: string;
  capacity: number | null;
  active: boolean;
  supplierId: string;
  supplier: string;
  area: string;
  upcomingOverrides: number;
}
interface ProductDetail {
  product: { id: string; name: string; unit: string; capacity: number | null; active: boolean; supplierId: string; supplier: string; area: string };
  overrides: { id: string; day: string; blocked: boolean; unitsAvailable: number | null; note: string | null }[];
  supplierOverrides: { id: string; day: string; note: string | null }[];
  bookings: { day: string; units: number; orders: { id: string; reference: string; status: string; coupleName: string; quantity: number }[] }[];
}
interface Affected {
  id: string;
  reference: string;
  status: string;
  coupleName: string;
}

const today = () => new Date().toISOString().slice(0, 10);

export default function AvailabilityPage() {
  const [products, setProducts] = useState<ProductRow[] | null>(null);
  const [filter, setFilter] = useState("");
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [affected, setAffected] = useState<{ day: string; orders: Affected[] } | null>(null);
  const [busy, setBusy] = useState(false);

  // forms
  const [capDraft, setCapDraft] = useState("");
  const [unlimited, setUnlimited] = useState(false);
  const [mode, setMode] = useState<"block" | "units">("block");
  const [day, setDay] = useState("");
  const [units, setUnits] = useState("");
  const [note, setNote] = useState("");
  const [supDay, setSupDay] = useState("");
  const [supNote, setSupNote] = useState("");

  const loadList = useCallback(async () => {
    const r = await adminApi("/api/admin/availability");
    if (!r.ok) return setError(r.data?.error ?? "Couldn't load products.");
    setError(null);
    setProducts(r.data.products);
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    const r = await adminApi(`/api/admin/products/${id}`);
    if (!r.ok) return setError(r.data?.error ?? "Couldn't load that product.");
    setError(null);
    const d = r.data as ProductDetail;
    setDetail(d);
    setCapDraft(d.product.capacity === null ? "" : String(d.product.capacity));
    setUnlimited(d.product.capacity === null);
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    setNotice(null);
    setAffected(null);
    setDetail(null);
    if (selected) loadDetail(selected);
  }, [selected, loadDetail]);

  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return (products ?? []).filter(
      (p) =>
        (category === "all" || p.category === category) &&
        (!q || p.name.toLowerCase().includes(q) || p.supplier.toLowerCase().includes(q))
    );
  }, [products, filter, category]);

  async function act(call: () => ReturnType<typeof adminApi>, done: string, after?: (data: Record<string, unknown>) => void) {
    setBusy(true);
    setNotice(null);
    setAffected(null);
    const r = await call();
    setBusy(false);
    if (!r.ok) {
      setNotice(r.data?.error ?? "That didn't work. Please try again.");
      return false;
    }
    setNotice(done);
    after?.(r.data);
    if (selected) await loadDetail(selected);
    await loadList();
    return true;
  }

  const saveCapacity = () => {
    const value = unlimited ? null : Number(capDraft);
    if (!unlimited && (capDraft.trim() === "" || !Number.isInteger(value))) return setNotice("Enter a whole number, or tick “No limit”.");
    return act(() => adminApi(`/api/admin/products/${selected}`, "PATCH", { capacity: value }), "Capacity saved.");
  };

  const addOverride = async () => {
    if (!day) return setNotice("Choose a date.");
    const body =
      mode === "block"
        ? { productId: selected, day, blocked: true, note: note.trim() || undefined }
        : { productId: selected, day, blocked: false, unitsAvailable: Number(units), note: note.trim() || undefined };
    if (mode === "units" && (units.trim() === "" || !Number.isInteger(Number(units)))) return setNotice("Enter how many units are available that day.");
    const ok = await act(
      () => adminApi("/api/admin/overrides", "POST", body),
      mode === "block" ? `${shortDay(day)} is now blocked for this product.` : `Only ${units} available on ${shortDay(day)}.`,
      (data) => {
        const orders = (data.affectedOrders as Affected[]) ?? [];
        if (orders.length) setAffected({ day, orders });
      }
    );
    if (ok) {
      setDay("");
      setUnits("");
      setNote("");
    }
  };

  const blockSupplier = async () => {
    if (!supDay || !detail) return setNotice("Choose a date.");
    const ok = await act(
      () => adminApi("/api/admin/overrides", "POST", { supplierId: detail.product.supplierId, day: supDay, blocked: true, note: supNote.trim() || undefined }),
      `${detail.product.supplier} is now blocked on ${shortDay(supDay)}.`,
      (data) => {
        const orders = (data.affectedOrders as Affected[]) ?? [];
        if (orders.length) setAffected({ day: supDay, orders });
      }
    );
    if (ok) {
      setSupDay("");
      setSupNote("");
    }
  };

  const remove = (id: string) => act(() => adminApi(`/api/admin/overrides/${id}`, "DELETE"), "Removed.");

  const input = "rounded-lg border border-sand bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-clay/30";

  return (
    <div>
      <h1 className="font-serif text-4xl text-ink">Availability</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink/50">
        How much of each product a supplier can provide on any one day, plus days they&apos;re away. Couples see this as soon as they pick a wedding date, and orders can&apos;t be placed beyond it.
      </p>

      {error && (
        <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* ------------------------------------------------------- product list */}
        <section aria-label="Products" className="rounded-3xl border border-sand bg-white shadow-sm">
          <div className="space-y-2 border-b border-sand p-4">
            <input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search products or suppliers"
              aria-label="Search products"
              className={`${input} w-full`}
            />
            <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category" className={`${input} w-full`}>
              <option value="all">All categories</option>
              {CATEGORY_META.map((c) => (
                <option key={c.category} value={c.category}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          {products === null ? (
            <p className="p-4 text-sm text-ink/40">Loading…</p>
          ) : shown.length === 0 ? (
            <p className="p-4 text-sm text-ink/40">Nothing matches.</p>
          ) : (
            <ul className="max-h-[70vh] divide-y divide-sand overflow-y-auto">
              {shown.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(p.id)}
                    aria-current={selected === p.id}
                    className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors ${selected === p.id ? "bg-cream" : "hover:bg-cream/60"}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-ink">{p.name}</span>
                      <span className="block truncate text-xs text-ink/45">{p.supplier}</span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1 text-[11px]">
                      <span className="rounded-full bg-ink/5 px-2 py-0.5 text-ink/60">{p.capacity === null ? "No limit" : `${p.capacity}/day`}</span>
                      {!p.active && <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-700">Hidden</span>}
                      {p.upcomingOverrides > 0 && <span className="text-clay">{p.upcomingOverrides} blocked/changed</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ------------------------------------------------------- one product */}
        <section aria-label="Product availability" className="min-w-0">
          {!selected && (
            <div className="rounded-3xl border border-dashed border-sand px-6 py-16 text-center text-sm text-ink/45">
              Choose a product to set its capacity and block days.
            </div>
          )}
          {selected && !detail && !error && <p className="text-sm text-ink/40">Loading…</p>}
          {detail && (
            <div className="space-y-5">
              <div className="rounded-3xl border border-sand bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-serif text-2xl text-ink">{detail.product.name}</h2>
                    <p className="text-sm text-ink/50">
                      {detail.product.supplier} · {detail.product.area}
                    </p>
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-ink/70">
                    <input
                      type="checkbox"
                      checked={detail.product.active}
                      disabled={busy}
                      onChange={(e) => act(() => adminApi(`/api/admin/products/${selected}`, "PATCH", { active: e.target.checked }), e.target.checked ? "Now showing in the shop." : "Hidden from the shop.")}
                    />
                    Show in the shop
                  </label>
                </div>

                {notice && (
                  <p role="status" className="mt-4 rounded-xl bg-cream px-4 py-2.5 text-sm text-ink/80">
                    {notice}
                  </p>
                )}
                {affected && (
                  <div role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-900">
                    <p className="font-medium">
                      {affected.orders.length} order{affected.orders.length === 1 ? " is" : "s are"} already booked on {shortDay(affected.day)}:
                    </p>
                    <ul className="mt-1 list-disc pl-5">
                      {affected.orders.map((o) => (
                        <li key={o.id}>
                          <Link className="underline" href={`/admin/orders/${o.id}`}>
                            {o.reference}
                          </Link>{" "}
                          · {o.coupleName} · {o.status}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-1 text-xs">Contact them or reassign. Existing orders aren&apos;t changed automatically.</p>
                  </div>
                )}

                <h3 className="mt-6 text-sm font-medium text-ink">Capacity per day</h3>
                <p className="text-xs text-ink/45">How many units of this the supplier can provide on a single day.</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    aria-label="Capacity per day"
                    disabled={unlimited}
                    value={capDraft}
                    onChange={(e) => setCapDraft(e.target.value)}
                    className={`${input} w-32 disabled:bg-ink/5`}
                  />
                  <label className="flex items-center gap-2 text-sm text-ink/70">
                    <input type="checkbox" checked={unlimited} onChange={(e) => setUnlimited(e.target.checked)} />
                    No limit (made to order)
                  </label>
                  <button type="button" disabled={busy} onClick={saveCapacity} className="rounded-full bg-ink px-5 py-2 text-sm text-cream hover:bg-ink/90 disabled:bg-ink/30">
                    Save capacity
                  </button>
                </div>
              </div>

              {/* blocked / changed days for this product */}
              <div className="rounded-3xl border border-sand bg-white p-6 shadow-sm">
                <h3 className="font-serif text-xl text-ink">Blocked and changed days</h3>
                {detail.overrides.length === 0 ? (
                  <p className="mt-2 text-sm text-ink/45">None coming up.</p>
                ) : (
                  <ul className="mt-3 divide-y divide-sand rounded-xl border border-sand">
                    {detail.overrides.map((o) => (
                      <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                        <span>
                          <span className="font-medium text-ink">{shortDay(o.day)}</span>{" "}
                          <span className="text-ink/60">{o.blocked ? "Blocked" : `Only ${o.unitsAvailable} available`}</span>
                          {o.note && <span className="text-ink/40"> · {o.note}</span>}
                        </span>
                        <button type="button" disabled={busy} onClick={() => remove(o.id)} className="text-xs text-ink/50 hover:text-red-700">
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-4 flex flex-wrap items-end gap-3">
                  <div>
                    <label htmlFor="ov-day" className="block text-xs text-ink/50">Date</label>
                    <input id="ov-day" type="date" min={today()} value={day} onChange={(e) => setDay(e.target.value)} className={input} />
                  </div>
                  <div>
                    <label htmlFor="ov-mode" className="block text-xs text-ink/50">What changes</label>
                    <select id="ov-mode" value={mode} onChange={(e) => setMode(e.target.value as "block" | "units")} className={input}>
                      <option value="block">Not available at all</option>
                      <option value="units">Fewer units than usual</option>
                    </select>
                  </div>
                  {mode === "units" && (
                    <div>
                      <label htmlFor="ov-units" className="block text-xs text-ink/50">Units available</label>
                      <input id="ov-units" type="number" min={0} value={units} onChange={(e) => setUnits(e.target.value)} className={`${input} w-28`} />
                    </div>
                  )}
                  <div className="min-w-[10rem] flex-1">
                    <label htmlFor="ov-note" className="block text-xs text-ink/50">Note (optional)</label>
                    <input id="ov-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. away for repair" className={`${input} w-full`} />
                  </div>
                  <button type="button" disabled={busy} onClick={addOverride} className="rounded-full bg-ink px-5 py-2 text-sm text-cream hover:bg-ink/90 disabled:bg-ink/30">
                    Add
                  </button>
                </div>
              </div>

              {/* whole supplier */}
              <div className="rounded-3xl border border-sand bg-white p-6 shadow-sm">
                <h3 className="font-serif text-xl text-ink">{detail.product.supplier}: days away</h3>
                <p className="text-xs text-ink/45">Blocks every product from this supplier on that day.</p>
                {detail.supplierOverrides.length > 0 && (
                  <ul className="mt-3 divide-y divide-sand rounded-xl border border-sand">
                    {detail.supplierOverrides.map((o) => (
                      <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                        <span>
                          <span className="font-medium text-ink">{shortDay(o.day)}</span>
                          {o.note && <span className="text-ink/40"> · {o.note}</span>}
                        </span>
                        <button type="button" disabled={busy} onClick={() => remove(o.id)} className="text-xs text-ink/50 hover:text-red-700">
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-4 flex flex-wrap items-end gap-3">
                  <div>
                    <label htmlFor="sup-day" className="block text-xs text-ink/50">Date</label>
                    <input id="sup-day" type="date" min={today()} value={supDay} onChange={(e) => setSupDay(e.target.value)} className={input} />
                  </div>
                  <div className="min-w-[10rem] flex-1">
                    <label htmlFor="sup-note" className="block text-xs text-ink/50">Note (optional)</label>
                    <input id="sup-note" value={supNote} onChange={(e) => setSupNote(e.target.value)} placeholder="e.g. on holiday" className={`${input} w-full`} />
                  </div>
                  <button type="button" disabled={busy} onClick={blockSupplier} className="rounded-full border border-ink/20 px-5 py-2 text-sm text-ink hover:border-ink/50 disabled:opacity-40">
                    Block supplier
                  </button>
                </div>
              </div>

              {/* bookings */}
              <div className="rounded-3xl border border-sand bg-white p-6 shadow-sm">
                <h3 className="font-serif text-xl text-ink">Booked</h3>
                <p className="text-xs text-ink/45">Upcoming orders holding this product. Declined items and cancelled or declined orders don&apos;t count.</p>
                {detail.bookings.length === 0 ? (
                  <p className="mt-3 text-sm text-ink/45">Nothing booked yet.</p>
                ) : (
                  <ul className="mt-3 divide-y divide-sand rounded-xl border border-sand">
                    {detail.bookings.map((b) => (
                      <li key={b.day} className="px-4 py-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-ink">{shortDay(b.day)}</span>
                          <span className="tabular-nums text-ink/60">
                            {b.units}
                            {detail.product.capacity !== null ? ` of ${detail.product.capacity}` : ""} booked
                          </span>
                        </div>
                        <ul className="mt-1.5 space-y-1">
                          {b.orders.map((o) => (
                            <li key={o.id} className="flex items-center justify-between gap-2 text-xs text-ink/60">
                              <Link href={`/admin/orders/${o.id}`} className="underline-offset-2 hover:underline">
                                {o.reference} · {o.coupleName} · {o.quantity}
                              </Link>
                              <StatusPill status={o.status} />
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
