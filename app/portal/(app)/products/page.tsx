"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { vendorApi } from "@/lib/vendor-client";
import ProductEditor from "@/components/vendor/ProductEditor";
import AssetUpload from "@/components/vendor/AssetUpload";
import {
  EMPTY_PRODUCT,
  EMPTY_PRODUCT_DETAILS,
  type ProductDraft,
} from "@/lib/supplier-workspace";
import { vendorCategoryLabel } from "@/lib/vendor-categories";
type Product = {
  id: string;
  name: string;
  category: string;
  unitPricePence: number;
  unit: string;
  qtyRule: string;
  capacity: number | null;
  leadTimeDays: number;
  active: boolean;
  publication: string;
  note: string | null;
  styles: string[];
  image: string | null;
  details: any;
  updatedAt: string;
  day: { available: number | null } | null;
};
function draft(p: Product): ProductDraft {
  return {
    name: p.name,
    category: p.category,
    unitPrice: (p.unitPricePence / 100).toFixed(2),
    unit: p.unit,
    qtyRule: p.qtyRule,
    capacity: p.capacity === null ? "" : String(p.capacity),
    leadTimeDays: p.leadTimeDays ? String(p.leadTimeDays) : "",
    note: p.note || "",
    styles: p.styles || [],
    details: { ...EMPTY_PRODUCT_DETAILS, ...p.details },
  };
}
export default function SupplierProducts() {
  const creation = useRef({ body: "", id: "" });
  const [products, setProducts] = useState<Product[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [editing, setEditing] = useState<Product | "new" | null>(null),
    [date, setDate] = useState(""),
    [toggling, setToggling] = useState("");
  async function load() {
    setError("");
    setLoading(true);
    try {
      const r = await vendorApi(
        `/api/vendor/products${date ? `?date=${encodeURIComponent(date)}` : ""}`,
      );
      if (!r.ok) throw Error(r.data?.error || "Could not load products.");
      setProducts(r.data.products);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load products.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [date]);
  const visible = products.filter(
    (p) =>
      (filter === "all" ||
        (filter === "visible" && p.active) ||
        (filter === p.publication)) &&
      `${p.name} ${vendorCategoryLabel(p.category)}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl sm:text-5xl">Your products</h1>
          <p className="mt-3 max-w-xl text-sm text-ink/65">
            Upload photos, add prices and manage your products.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/portal/business#range-review" className="min-h-11 py-3 text-sm underline">Submit for review</Link>
          <button
            disabled={!!editing}
            onClick={() => {
              setNotice("");
              setEditing("new");
            }}
            className="min-h-11 rounded-full bg-ink px-5 py-3 text-sm text-cream disabled:opacity-50"
          >
            + Add product
          </button>
        </div>
      </div>
      {editing && (
        <ProductEditor
          key={editing === "new" ? "new" : editing.id}
          isNew={editing === "new"}
          initialPhoto={editing === "new" ? undefined : editing.image}
          initial={
            editing === "new"
              ? { ...EMPTY_PRODUCT, details: { ...EMPTY_PRODUCT_DETAILS } }
              : draft(editing)
          }
          onCancel={() => setEditing(null)}
          onSave={async (value, photo) => {
            const isNew = editing === "new";
            const fingerprint = JSON.stringify(value);
            if (isNew && creation.current.body !== fingerprint)
              creation.current = { body: fingerprint, id: crypto.randomUUID() };
            const r = await vendorApi(
              isNew
                ? "/api/vendor/products"
                : `/api/vendor/products/${editing.id}`,
              isNew ? "POST" : "PATCH",
              isNew
                ? { ...value, clientId: creation.current.id }
                : { product: value, updatedAt: editing.updatedAt },
            );
            if (!r.ok) throw Error(r.data?.error || "Could not save product.");
            let photoError = "";
            if (photo) {
              try {
                const upload = await vendorApi("/api/vendor/assets", "POST", {
                  kind: "product", productId: isNew ? r.data.id : editing.id, image: photo,
                });
                if (!upload.ok) throw Error(upload.data?.error || "Please retry the photo upload.");
              } catch (e) { photoError = e instanceof Error ? e.message : "Please retry the photo upload."; }
            }
            setEditing(null);
            creation.current = { body: "", id: "" };
            setNotice(
              photoError ? `Product saved, but the photo needs another try: ${photoError} Use Add photo or Replace photo below.`
                : isNew ? "Product saved. Add another, or submit your range for review." : "Product changes saved.",
            );
            setSearch("");
            setFilter("all");
            await load();
          }}
        />
      )}
      {notice && (
        <p role="status" className="mt-5 rounded-xl bg-sage/15 p-4 text-sm">
          {notice}
        </p>
      )}
      <details className="mt-6 rounded-xl border border-sand bg-white p-4"><summary className="cursor-pointer text-sm">Search and filter products</summary><div className="mt-4 space-y-3">
        <label className="block text-sm">
          <span className="sr-only">Find a product</span>
          <input
            className="min-h-11 w-full rounded-xl border border-sand bg-white px-3"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search names or categories"
          />
        </label>
        <div
          className="flex flex-wrap gap-2 sm:col-span-2"
          aria-label="Product visibility"
        >
          {[
            ["all", "All products"],
            ["visible", "Visible"],
            ["Private", "Private"], ["In review", "In review"], ["Changes requested", "Changes requested"],
          ].map(([key, label]) => (
            <button
              key={key}
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
              className={`min-h-11 rounded-full px-4 py-2 text-sm ${filter === key ? "bg-ink text-cream" : "border border-sand bg-white"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <details className="text-sm">
          <summary className="min-h-11 cursor-pointer py-3">{date ? `Stock on ${date}` : "Check stock on a date"}</summary>
          <div className="flex flex-wrap items-center gap-3 pb-2">
            <label>Stock on a date
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-2 block min-h-11 max-w-full rounded-xl border border-sand bg-white px-3" />
            </label>
            {date && <button className="min-h-11 underline" onClick={() => setDate("")}>Show today</button>}
          </div>
        </details>
      </div></details>
      {loading ? (
        <p role="status" className="mt-6">
          Loading products…
        </p>
      ) : visible.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-sand p-8">
          <h2 className="font-serif text-2xl">
            {products.length
              ? "No matching products"
              : "Add your first product"}
          </h2>
          <p className="mt-3 text-sm text-ink/65">
            {products.length
              ? "Try another search or change the visibility filter."
              : "Start with a small selection. You can add individual pieces or import a stock list."}
          </p>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-sand">
          {visible.map((p) => (
            <li key={p.id} className="py-6">
              <div className="grid gap-4 grid-cols-[96px_minmax(0,1fr)] sm:grid-cols-[112px_1fr_auto]">
                <div>
                  {p.image ? (
                    <img
                      src={p.image}
                      alt={p.name}
                      className="h-24 w-24 rounded-xl bg-white object-contain sm:h-28 sm:w-28"
                    />
                  ) : (
                    <div className="flex h-28 w-28 items-center justify-center rounded-xl bg-sand/40 text-xs text-ink/60">
                      No photo yet
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-serif text-2xl">{p.name}</h2>
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${p.active ? "bg-sage/20" : "bg-sand/60"}`}
                    >
                      {p.publication}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-ink/65">
                    {vendorCategoryLabel(p.category)} · £
                    {(p.unitPricePence / 100).toFixed(2)} {p.unit}
                  </p>
                  <p className="mt-2 text-xs text-ink/60">
                    {p.capacity === null
                      ? "Made to order"
                      : `${p.capacity} units per day`}
                    {p.day?.available !== undefined && p.day.available !== null
                      ? ` · ${p.day.available} available ${date ? "on selected date" : "today"}`
                      : ""}
                    {p.leadTimeDays ? ` · ${p.leadTimeDays} days’ notice` : ""}
                  </p>
                  <div className="mt-3">
                    <AssetUpload
                      kind="product"
                      label={p.image ? "Replace photo" : "Add photo"}
                      productId={p.id}
                      onUploaded={() => void load()}
                    />
                  </div>
                </div>
                <div className="col-span-2 flex gap-3 sm:col-span-1 sm:flex-col">
                  <button
                    disabled={!!editing}
                    onClick={() => {
                      setNotice("");
                      setEditing(p);
                    }}
                    className="min-h-11 rounded-full border border-sand px-4 text-sm disabled:opacity-50"
                  >
                    Edit details
                  </button>
                  {p.active ? (
                  <button
                    disabled={!!toggling || !!editing}
                    onClick={async () => {
                      setToggling(p.id);
                      setError("");
                      try {
                        const r = await vendorApi(
                          `/api/vendor/products/${p.id}`,
                          "PATCH",
                          { active: !p.active },
                        );
                        if (!r.ok) throw Error(r.data?.error);
                        await load();
                      } catch (e) {
                        setError(
                          e instanceof Error
                            ? e.message
                            : "Could not change visibility.",
                        );
                      } finally {
                        setToggling("");
                      }
                    }}
                    className="min-h-11 px-3 text-sm underline disabled:opacity-50"
                  >
                    {toggling === p.id
                      ? "Saving…"
                      : p.active
                        ? "Hide product"
                        : "Make visible"}
                  </button>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
