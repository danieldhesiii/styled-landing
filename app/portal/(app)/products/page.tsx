"use client";

import { useEffect, useState } from "react";
import { vendorApi } from "@/lib/vendor-client";
import { money } from "@/lib/admin-client";
import { vendorCategoryLabel } from "@/lib/vendor-categories";

interface Product {
  id: string;
  name: string;
  category: string;
  unit: string;
  unitPricePence: number;
  qtyRule: string;
  capacity: number | null;
  leadTimeDays: number;
  active: boolean;
}

export default function PortalProductsPage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ unitPrice: "", capacity: "" });
  const [saving, setSaving] = useState(false);

  function load() {
    vendorApi("/api/vendor/products").then((r) => {
      if (!r.ok) return setError(r.data?.error ?? "Couldn't load your products.");
      setProducts(r.data.products as Product[]);
    });
  }
  useEffect(() => { load(); }, []);

  function startEdit(p: Product) {
    setEditing(p.id);
    setDraft({ unitPrice: (p.unitPricePence / 100).toString(), capacity: p.capacity === null ? "" : String(p.capacity) });
    setError(null);
  }

  async function patch(id: string, body: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    const r = await vendorApi(`/api/vendor/products/${id}`, "PATCH", body);
    setSaving(false);
    if (!r.ok) return setError(r.data?.error ?? "Couldn't update the product.");
    return true;
  }

  async function toggle(p: Product) {
    const ok = await patch(p.id, { active: !p.active });
    if (ok) setProducts((prev) => (prev ?? []).map((x) => (x.id === p.id ? { ...x, active: !x.active } : x)));
  }

  async function saveEdit(id: string) {
    const ok = await patch(id, { unitPrice: draft.unitPrice, capacity: draft.capacity });
    if (ok) { setEditing(null); load(); }
  }

  return (
    <div>
      <h1 className="font-serif text-4xl text-ink">Products</h1>
      <p className="mt-1 text-sm text-ink/50">
        {products === null
          ? "Loading…"
          : products.length === 0
            ? "You don't have any products on Styled yet."
            : "Set your prices, how many you can supply per day, and what's shown in the shop."}
      </p>

      {error && (
        <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      )}

      {products && products.length === 0 && !error && (
        <div className="mt-10 rounded-3xl border border-dashed border-sand px-6 py-14 text-center text-sm text-ink/50">
          The Styled team adds your pieces to the catalogue. Once they do, you can manage them here.
        </div>
      )}

      {products && products.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-3xl border border-sand bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sand text-left text-xs uppercase tracking-wider text-ink/40">
                <th className="px-5 py-3 font-medium">Product</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 text-right font-medium">Price</th>
                <th className="px-5 py-3 text-right font-medium">Per day</th>
                <th className="px-5 py-3 font-medium">In shop</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {products.map((p) => (
                <tr key={p.id} className="align-top transition-colors hover:bg-cream/40">
                  <td className="px-5 py-3 font-medium text-ink">
                    {p.name}
                    <div className="text-xs font-normal text-ink/40">{p.unit}</div>
                  </td>
                  <td className="px-5 py-3 text-ink/60">{vendorCategoryLabel(p.category)}</td>
                  {editing === p.id ? (
                    <>
                      <td className="px-5 py-3 text-right">
                        <input type="number" min="0" step="0.01" value={draft.unitPrice}
                          onChange={(e) => setDraft({ ...draft, unitPrice: e.target.value })}
                          className="w-24 rounded-lg border border-sand px-2 py-1 text-right text-sm focus:outline-none focus:ring-2 focus:ring-clay/30" />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <input type="number" min="0" step="1" placeholder="made to order" value={draft.capacity}
                          onChange={(e) => setDraft({ ...draft, capacity: e.target.value })}
                          className="w-28 rounded-lg border border-sand px-2 py-1 text-right text-sm focus:outline-none focus:ring-2 focus:ring-clay/30" />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2">
                          <button type="button" disabled={saving} onClick={() => saveEdit(p.id)}
                            className="rounded-full bg-ink px-3 py-1 text-xs text-cream hover:bg-ink/90 disabled:opacity-40">Save</button>
                          <button type="button" onClick={() => setEditing(null)}
                            className="rounded-full border border-sand px-3 py-1 text-xs text-ink/60 hover:text-ink">Cancel</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-5 py-3 text-right tabular-nums text-ink/70">{money(p.unitPricePence)}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-ink/60">{p.capacity ?? "—"}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 text-xs text-ink/60">
                            <input type="checkbox" checked={p.active} onChange={() => toggle(p)} disabled={saving}
                              className="h-4 w-4 rounded border-sand text-clay focus:ring-clay/30" />
                            {p.active ? "Live" : "Hidden"}
                          </label>
                          <button type="button" onClick={() => startEdit(p)} className="text-xs text-clay hover:underline">Edit</button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
