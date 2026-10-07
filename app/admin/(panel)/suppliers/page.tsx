"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminApi } from "@/lib/admin-client";

interface Supplier {
  id: string;
  name: string;
  area: string;
  contactEmail: string | null;
  active: boolean;
  products: number;
  activeProducts: number;
}

const FIELD =
  "mt-1.5 w-full rounded-xl border border-sand bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-clay/30";
const LABEL = "block text-sm font-medium text-ink";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", area: "", contactEmail: "", applicationId: "" });

  useEffect(() => {
    adminApi("/api/admin/suppliers").then((r) => {
      if (!r.ok) return setError(r.data?.error ?? "Couldn't load suppliers.");
      setSuppliers(r.data.suppliers as Supplier[]);
    });
    // Prefill when arriving from an accepted vendor application.
    const q = new URLSearchParams(window.location.search);
    if (q.get("new")) {
      setForm({
        name: q.get("name") ?? "",
        area: q.get("area") ?? "",
        contactEmail: q.get("email") ?? "",
        applicationId: q.get("application") ?? "",
      });
      setOpen(true);
    }
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const r = await adminApi("/api/admin/suppliers", "POST", form);
    setBusy(false);
    if (!r.ok) return setError(r.data?.error ?? "Couldn't create the supplier.");
    // Straight to the new supplier so staff can add their products.
    window.location.assign(`/admin/suppliers/${r.data.supplier.id}`);
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl text-ink">Suppliers</h1>
          <p className="mt-1 text-sm text-ink/50">
            {suppliers === null
              ? "Loading…"
              : `${suppliers.length} ${suppliers.length === 1 ? "supplier" : "suppliers"} on the marketplace`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="rounded-full bg-ink px-5 py-2.5 text-sm text-cream hover:bg-ink/90"
        >
          {open ? "Close" : "Add supplier"}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      )}

      {open && (
        <form onSubmit={create} className="mt-6 rounded-3xl border border-sand bg-white p-6 shadow-sm">
          <h2 className="font-serif text-xl text-ink">New supplier</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="s-name" className={LABEL}>Business name</label>
              <input id="s-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={FIELD} />
            </div>
            <div>
              <label htmlFor="s-area" className={LABEL}>Area covered</label>
              <input id="s-area" required placeholder="e.g. London & Essex" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} className={FIELD} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="s-email" className={LABEL}>Contact email <span className="text-ink/40">(optional)</span></label>
              <input id="s-email" type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} className={FIELD} />
            </div>
          </div>
          <button type="submit" disabled={busy} className="mt-5 rounded-full bg-ink px-6 py-2.5 text-sm text-cream hover:bg-ink/90 disabled:bg-ink/30">
            {busy ? "Creating…" : "Create & add products"}
          </button>
        </form>
      )}

      {suppliers && suppliers.length === 0 && !error && !open && (
        <div className="mt-10 rounded-3xl border border-dashed border-sand px-6 py-14 text-center text-sm text-ink/50">
          No suppliers yet. Accept a vendor application, or add one here, then give them products to list.
        </div>
      )}

      {suppliers && suppliers.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-3xl border border-sand bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sand text-left text-xs uppercase tracking-wider text-ink/40">
                <th className="px-5 py-3 font-medium">Supplier</th>
                <th className="px-5 py-3 font-medium">Area</th>
                <th className="px-5 py-3 text-right font-medium">Products</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {suppliers.map((s) => (
                <tr key={s.id} className="transition-colors hover:bg-cream/60">
                  <td className="px-5 py-3">
                    <Link href={`/admin/suppliers/${s.id}`} className="font-medium text-ink hover:text-clay">{s.name}</Link>
                    {s.contactEmail && <div className="text-xs text-ink/40">{s.contactEmail}</div>}
                  </td>
                  <td className="px-5 py-3 text-ink/60">{s.area}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-ink/70">
                    {s.activeProducts}/{s.products} live
                  </td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${s.active ? "bg-sage/20 text-green-800" : "bg-ink/10 text-ink/50"}`}>
                      {s.active ? "Active" : "Off"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
