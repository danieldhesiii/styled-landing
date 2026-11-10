"use client";

import { useEffect, useState } from "react";
import { vendorApi } from "@/lib/vendor-client";
import { longDay } from "@/lib/admin-client";

type Product = { id: string; name: string; capacity: number | null };
type Limit = { id: string; product_id: string; day: string; blocked: boolean; units_available: number | null; note: string | null };
const field = "mt-1 w-full rounded-xl border border-sand bg-white px-3 py-2.5 text-sm";

export default function ProductDayLimits() {
  const [products, setProducts] = useState<Product[]>([]);
  const [limits, setLimits] = useState<Limit[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [productId, setProductId] = useState("");
  const [day, setDay] = useState("");
  const [units, setUnits] = useState("");
  const [note, setNote] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const product = products.find(p => p.id === productId);

  async function load() {
    try {
      const r = await vendorApi("/api/vendor/availability/products");
      if (!r.ok) throw Error(r.data?.error || "Could not load product limits.");
      setProducts(r.data.products); setLimits(r.data.limits); setLoaded(true);
      return true;
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load product limits."); return false; }
  }
  useEffect(() => { void load(); }, []);

  async function save(target: { productId: string; day: string; units: number | null; note?: string }) {
    setBusy(true); setError(""); setNotice("");
    try {
      const r = await vendorApi("/api/vendor/availability/products", "POST", target);
      if (!r.ok) throw Error(r.data?.error || "Could not save the date limit.");
      const refreshed = await load();
      if (refreshed) setNotice(target.units === null ? "Date exception removed. Normal stock and whole-business blocks still apply." : "Date limit saved. Existing bookings are unchanged; Styled reservations are deducted from this total.");
      if (target.units !== null) { setUnits(""); setNote(""); }
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save the date limit."); }
    finally { setBusy(false); }
  }

  return <section aria-labelledby="product-date-limits" className="mt-6 rounded-3xl border border-sand bg-white p-5 shadow-sm">
    <h2 id="product-date-limits" className="font-serif text-xl">Stock for a specific date</h2>
    <p className="mt-2 text-sm text-ink/65">Reduce one product&apos;s stock when it is booked elsewhere. Enter the total you can supply that day, before Styled bookings are deducted. Use zero to close just that product.</p>
    {error && <p role="alert" className="mt-3 text-sm text-red-800">{error} <button type="button" disabled={busy} className="min-h-11 underline" onClick={() => { setError(""); void load(); }}>Reload product limits</button></p>}
    {notice && <p role="status" className="mt-3 rounded-xl bg-sage/15 p-3 text-sm">{notice}</p>}
    {!loaded ? <p role="status" className="mt-4 text-sm text-ink/60">{error ? "Product limits unavailable." : "Loading products…"}</p> : !products.length ? <p className="mt-4 text-sm text-ink/60">Add a product in Products to set its date limits.</p> : <>
      <form className="mt-5 grid gap-3 sm:grid-cols-2" onSubmit={e => { e.preventDefault(); if (units.trim() !== "") void save({ productId, day, units: Number(units), note }); }}>
        <label className="text-sm sm:col-span-2">Product<select required disabled={busy} value={productId} onChange={e => { setProductId(e.target.value); setUnits(""); }} className={field}><option value="">Choose a product</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label className="text-sm">Date<input type="date" required min={today} disabled={busy} value={day} onChange={e => setDay(e.target.value)} className={field}/></label>
        <label className="text-sm">Total stock for this date<input type="number" inputMode="numeric" min="0" max={product?.capacity ?? 0} step="1" required disabled={busy || !product} value={units} onChange={e => setUnits(e.target.value)} className={field}/></label>
        {product && <p className="text-xs text-ink/60 sm:col-span-2">{product.capacity === null ? "Made to order: use zero to close this date, or set normal stock in Products first." : `Normal stock: ${product.capacity}. This date limit cannot increase it.`} A whole-business block still closes all products.</p>}
        <label className="text-sm sm:col-span-2">Note (optional)<input maxLength={300} disabled={busy} value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. two arches booked elsewhere" className={field}/></label>
        <button type="submit" disabled={busy || !productId || !day || units.trim() === ""} className="min-h-11 justify-self-start rounded-full bg-ink px-5 py-2.5 text-sm text-cream disabled:opacity-40">{busy ? "Saving…" : "Save date limit"}</button>
      </form>
      {limits.length > 0 && <ul className="mt-5 divide-y divide-sand border-t border-sand">{limits.map(l => <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div className="min-w-0"><p className="break-words text-sm font-medium">{products.find(p => p.id === l.product_id)?.name || "Product"}</p><p className="mt-1 text-sm text-ink/65">{longDay(l.day)} · {l.blocked ? "Closed" : `${l.units_available} total units`}</p>{l.note && <p className="mt-1 break-words text-xs text-ink/55">{l.note}</p>}</div><div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => { setProductId(l.product_id); setDay(l.day); setUnits(String(l.blocked ? 0 : l.units_available)); setNote(l.note || ""); setNotice("Date limit loaded above. Change it and choose Save date limit."); }} className="min-h-11 rounded-full border border-sand px-4 text-sm">Edit</button><button type="button" disabled={busy} onClick={() => void save({ productId: l.product_id, day: l.day, units: null })} className="min-h-11 rounded-full border border-sand px-4 text-sm">Use normal stock</button></div></li>)}</ul>}
    </>}
    <p className="mt-4 text-xs text-ink/55">Changing a limit does not cancel or amend existing requests. Review any affected requests before confirming availability.</p>
  </section>;
}
