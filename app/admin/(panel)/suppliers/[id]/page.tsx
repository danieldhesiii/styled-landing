"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { adminApi, money } from "@/lib/admin-client";
import { vendorCategoryLabel, VENDOR_CATEGORIES } from "@/lib/vendor-categories";
import { QTY_RULES, SLOTS } from "@/lib/product-options";
import { STYLES } from "@/lib/styles";

interface Supplier {
  id: string;
  name: string;
  area: string;
  contactEmail: string | null;
  logoUrl: string | null;
  commissionRate: number | null;
  active: boolean;
}
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

const FIELD =
  "mt-1.5 w-full rounded-xl border border-sand bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-clay/30";
const LABEL = "block text-sm font-medium text-ink";

const BLANK_PRODUCT = {
  name: "", category: "", unitPrice: "", unit: "each", qtyRule: "fixed",
  capacity: "", leadTimeDays: "", slot: "", icon: "", swatch: "", image: "", note: "",
  styles: [] as string[],
};

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [edit, setEdit] = useState({ name: "", area: "", contactEmail: "", logoUrl: "", commissionRate: "" });
  const [savingSupplier, setSavingSupplier] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [product, setProduct] = useState({ ...BLANK_PRODUCT });
  const [addingProduct, setAddingProduct] = useState(false);

  const [logins, setLogins] = useState<{ userId: string; email: string }[]>([]);
  const [loginEmail, setLoginEmail] = useState("");
  const [creatingLogin, setCreatingLogin] = useState(false);
  const [newCredential, setNewCredential] = useState<{ email: string; password: string } | null>(null);

  function load() {
    adminApi(`/api/admin/suppliers/${id}`).then((r) => {
      if (r.status === 404) return setNotFound(true);
      if (!r.ok) return setError(r.data?.error ?? "Couldn't load the supplier.");
      const s = r.data.supplier as Supplier;
      setSupplier(s);
      setEdit({
        name: s.name,
        area: s.area,
        contactEmail: s.contactEmail ?? "",
        logoUrl: s.logoUrl ?? "",
        commissionRate: s.commissionRate === null ? "" : String(s.commissionRate),
      });
      setProducts(r.data.products as Product[]);
    });
  }
  function loadLogins() {
    adminApi(`/api/admin/suppliers/${id}/users`).then((r) => {
      if (r.ok) setLogins(r.data.users as { userId: string; email: string }[]);
    });
  }
  useEffect(() => { if (id) { load(); loadLogins(); } /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  async function createLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNewCredential(null);
    setCreatingLogin(true);
    const r = await adminApi(`/api/admin/suppliers/${id}/users`, "POST", { email: loginEmail });
    setCreatingLogin(false);
    if (!r.ok) return setError(r.data?.error ?? "Couldn't create the login.");
    if (r.data.password) setNewCredential({ email: r.data.email, password: r.data.password });
    setLoginEmail("");
    loadLogins();
  }

  async function saveSupplier(patch: Record<string, unknown>) {
    setSavingSupplier(true);
    setError(null);
    const r = await adminApi(`/api/admin/suppliers/${id}`, "PATCH", patch);
    setSavingSupplier(false);
    if (!r.ok) return setError(r.data?.error ?? "Couldn't update the supplier.");
    load();
  }

  async function toggleProduct(p: Product) {
    const r = await adminApi(`/api/admin/products/${p.id}`, "PATCH", { active: !p.active });
    if (!r.ok) return setError(r.data?.error ?? "Couldn't update the product.");
    setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, active: !x.active } : x)));
  }

  async function addProduct(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAddingProduct(true);
    const r = await adminApi("/api/admin/products", "POST", { supplierId: id, ...product });
    setAddingProduct(false);
    if (!r.ok) return setError(r.data?.error ?? "Couldn't add the product.");
    setProduct({ ...BLANK_PRODUCT });
    setShowAdd(false);
    load();
  }

  if (notFound) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-ink/50">That supplier doesn't exist.</p>
        <Link href="/admin/suppliers" className="mt-4 inline-block text-sm text-clay hover:underline">← All suppliers</Link>
      </div>
    );
  }
  if (!supplier) return <p className="text-sm text-ink/40">Loading…</p>;

  const pset = new Set(product.styles);
  const liveNote =
    product.capacity.trim() === "" ? "Made to order (not limited by stock)." : "Limited to this many units per day.";

  return (
    <div>
      <Link href="/admin/suppliers" className="text-sm text-ink/50 hover:text-ink">← All suppliers</Link>

      {/* Supplier header + edit */}
      <div className="mt-3 rounded-3xl border border-sand bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {supplier.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={supplier.logoUrl} alt="" className="h-14 w-14 shrink-0 rounded-full border border-sand object-cover" />
            ) : (
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-cream text-lg font-medium text-ink/40">
                {supplier.name.charAt(0).toUpperCase()}
              </span>
            )}
            <div>
              <h1 className="font-serif text-4xl text-ink">{supplier.name}</h1>
              <p className="mt-1 text-sm text-ink/50">
                {supplier.area}
                {" · "}
                {supplier.commissionRate === null ? "Default commission" : `${supplier.commissionRate}% commission`}
              </p>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink/70">
            <input
              type="checkbox"
              checked={supplier.active}
              disabled={savingSupplier}
              onChange={(e) => saveSupplier({ active: e.target.checked })}
              className="h-4 w-4 rounded border-sand text-clay focus:ring-clay/30"
            />
            {supplier.active ? "Active (showing in the shop)" : "Switched off (hidden from the shop)"}
          </label>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="e-name" className={LABEL}>Business name</label>
            <input id="e-name" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className={FIELD} />
          </div>
          <div>
            <label htmlFor="e-area" className={LABEL}>Area</label>
            <input id="e-area" value={edit.area} onChange={(e) => setEdit({ ...edit, area: e.target.value })} className={FIELD} />
          </div>
          <div>
            <label htmlFor="e-email" className={LABEL}>Contact email</label>
            <input id="e-email" type="email" value={edit.contactEmail} onChange={(e) => setEdit({ ...edit, contactEmail: e.target.value })} className={FIELD} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="e-logo" className={LABEL}>Logo URL</label>
            <input id="e-logo" placeholder="https://… or /img/suppliers/…" value={edit.logoUrl} onChange={(e) => setEdit({ ...edit, logoUrl: e.target.value })} className={FIELD} />
          </div>
          <div>
            <label htmlFor="e-commission" className={LABEL}>Commission %</label>
            <input id="e-commission" type="number" min="0" max="100" step="0.5" placeholder="Default (12%)" value={edit.commissionRate} onChange={(e) => setEdit({ ...edit, commissionRate: e.target.value })} className={FIELD} />
            <p className="mt-1 text-[11px] text-ink/40">Leave blank to use the platform default. Applies to new orders.</p>
          </div>
        </div>
        <button
          type="button"
          disabled={savingSupplier}
          onClick={() => saveSupplier({ name: edit.name, area: edit.area, contactEmail: edit.contactEmail, logoUrl: edit.logoUrl, commissionRate: edit.commissionRate })}
          className="mt-4 rounded-full border border-sand px-5 py-2 text-sm text-ink/70 hover:border-clay/50 hover:text-ink disabled:opacity-40"
        >
          Save details
        </button>
      </div>

      {/* Portal logins */}
      <div className="mt-6 rounded-3xl border border-sand bg-white p-6 shadow-sm">
        <h2 className="font-serif text-xl text-ink">Portal logins</h2>
        <p className="mt-1 text-sm text-ink/50">
          Give this supplier access to the <span className="font-medium text-ink/70">/portal</span> to confirm their own orders and manage their products.
        </p>

        {logins.length > 0 && (
          <ul className="mt-4 divide-y divide-sand rounded-2xl border border-sand">
            {logins.map((u) => (
              <li key={u.userId} className="px-4 py-2.5 text-sm text-ink/80">{u.email}</li>
            ))}
          </ul>
        )}

        {newCredential && (
          <div className="mt-4 rounded-2xl bg-sage/15 px-4 py-3 text-sm text-ink/80">
            <p className="font-medium text-ink">Login created — share these once, securely:</p>
            <p className="mt-1">Email: <span className="font-mono">{newCredential.email}</span></p>
            <p>Temporary password: <span className="font-mono">{newCredential.password}</span></p>
            <p className="mt-1 text-xs text-ink/50">This password is shown only now. They sign in at /portal/login and should change it.</p>
          </div>
        )}

        <form onSubmit={createLogin} className="mt-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <label htmlFor="login-email" className={LABEL}>Email</label>
            <input id="login-email" type="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="their@email.com" className={FIELD} />
          </div>
          <button type="submit" disabled={creatingLogin} className="rounded-full bg-ink px-5 py-2.5 text-sm text-cream hover:bg-ink/90 disabled:bg-ink/30">
            {creatingLogin ? "Creating…" : "Create login"}
          </button>
        </form>
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      )}

      {/* Products */}
      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-serif text-2xl text-ink">Products ({products.length})</h2>
        <button type="button" onClick={() => setShowAdd((o) => !o)} className="rounded-full bg-ink px-5 py-2.5 text-sm text-cream hover:bg-ink/90">
          {showAdd ? "Close" : "Add product"}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={addProduct} className="mt-4 rounded-3xl border border-sand bg-white p-6 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="p-name" className={LABEL}>Product name</label>
              <input id="p-name" required value={product.name} onChange={(e) => setProduct({ ...product, name: e.target.value })} className={FIELD} />
            </div>
            <div>
              <label htmlFor="p-category" className={LABEL}>Category</label>
              <select id="p-category" required value={product.category} onChange={(e) => setProduct({ ...product, category: e.target.value })} className={FIELD}>
                <option value="" disabled>Choose…</option>
                {VENDOR_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="p-price" className={LABEL}>Price (£)</label>
              <input id="p-price" type="number" min="0" step="0.01" required value={product.unitPrice} onChange={(e) => setProduct({ ...product, unitPrice: e.target.value })} className={FIELD} />
            </div>
            <div>
              <label htmlFor="p-unit" className={LABEL}>Unit</label>
              <input id="p-unit" required placeholder="each / per table / package" value={product.unit} onChange={(e) => setProduct({ ...product, unit: e.target.value })} className={FIELD} />
            </div>
            <div>
              <label htmlFor="p-qty" className={LABEL}>Quantity worked out</label>
              <select id="p-qty" value={product.qtyRule} onChange={(e) => setProduct({ ...product, qtyRule: e.target.value })} className={FIELD}>
                {QTY_RULES.map((q) => <option key={q.value} value={q.value}>{q.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="p-capacity" className={LABEL}>Units per day <span className="text-ink/40">(optional)</span></label>
              <input id="p-capacity" type="number" min="0" step="1" placeholder="Leave blank for made to order" value={product.capacity} onChange={(e) => setProduct({ ...product, capacity: e.target.value })} className={FIELD} />
              <p className="mt-1 text-[11px] text-ink/40">{liveNote}</p>
            </div>
            <div>
              <label htmlFor="p-lead" className={LABEL}>Lead time (days) <span className="text-ink/40">(optional)</span></label>
              <input id="p-lead" type="number" min="0" step="1" value={product.leadTimeDays} onChange={(e) => setProduct({ ...product, leadTimeDays: e.target.value })} className={FIELD} />
            </div>
            <div>
              <label htmlFor="p-slot" className={LABEL}>Shown in the render</label>
              <select id="p-slot" value={product.slot} onChange={(e) => setProduct({ ...product, slot: e.target.value })} className={FIELD}>
                {SLOTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="p-image" className={LABEL}>Image path <span className="text-ink/40">(optional)</span></label>
              <input id="p-image" placeholder="/img/catalogue/…" value={product.image} onChange={(e) => setProduct({ ...product, image: e.target.value })} className={FIELD} />
            </div>
            <div className="flex gap-4">
              <div className="w-24">
                <label htmlFor="p-icon" className={LABEL}>Icon</label>
                <input id="p-icon" maxLength={4} placeholder="🕯️" value={product.icon} onChange={(e) => setProduct({ ...product, icon: e.target.value })} className={FIELD} />
              </div>
              <div className="w-32">
                <label htmlFor="p-swatch" className={LABEL}>Swatch</label>
                <input id="p-swatch" placeholder="#c9a0a0" value={product.swatch} onChange={(e) => setProduct({ ...product, swatch: e.target.value })} className={FIELD} />
              </div>
            </div>
          </div>

          <fieldset className="mt-4">
            <legend className={LABEL}>Suits which styles? <span className="text-ink/40">(optional)</span></legend>
            <div className="mt-2 flex flex-wrap gap-3">
              {STYLES.map((s) => (
                <label key={s.id} className="flex items-center gap-2 rounded-full border border-sand px-3 py-1.5 text-sm text-ink/70">
                  <input
                    type="checkbox"
                    checked={pset.has(s.id)}
                    onChange={(e) =>
                      setProduct({
                        ...product,
                        styles: e.target.checked ? [...product.styles, s.id] : product.styles.filter((x) => x !== s.id),
                      })
                    }
                    className="h-4 w-4 rounded border-sand text-clay focus:ring-clay/30"
                  />
                  {s.name}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="p-note" className={`${LABEL} mt-4`}>Note <span className="text-ink/40">(optional)</span></label>
            <input id="p-note" maxLength={500} value={product.note} onChange={(e) => setProduct({ ...product, note: e.target.value })} className={FIELD} />
          </div>

          <button type="submit" disabled={addingProduct} className="mt-5 rounded-full bg-ink px-6 py-2.5 text-sm text-cream hover:bg-ink/90 disabled:bg-ink/30">
            {addingProduct ? "Adding…" : "Add product"}
          </button>
        </form>
      )}

      {products.length === 0 && !showAdd && (
        <div className="mt-6 rounded-3xl border border-dashed border-sand px-6 py-14 text-center text-sm text-ink/50">
          No products yet. Add their first piece to list it in the shop.
        </div>
      )}

      {products.length > 0 && (
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
                <tr key={p.id} className="transition-colors hover:bg-cream/60">
                  <td className="px-5 py-3 font-medium text-ink">{p.name}<div className="text-xs font-normal text-ink/40">{p.unit}</div></td>
                  <td className="px-5 py-3 text-ink/60">{vendorCategoryLabel(p.category)}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-ink/70">{money(p.unitPricePence)}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-ink/60">{p.capacity ?? "—"}</td>
                  <td className="px-5 py-3">
                    <label className="flex items-center gap-2 text-xs text-ink/60">
                      <input type="checkbox" checked={p.active} onChange={() => toggleProduct(p)} className="h-4 w-4 rounded border-sand text-clay focus:ring-clay/30" />
                      {p.active ? "Live" : "Hidden"}
                    </label>
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
