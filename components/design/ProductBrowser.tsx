"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { BasketLine, Category, CatalogueItem } from "@/lib/types";
import { CATEGORY_META } from "@/lib/categories";
import { useCatalogue } from "@/components/catalogue/CatalogueProvider";
import { formatGBP } from "@/lib/quote";
import { STYLES } from "@/lib/styles";
import ResponsivePanel from "@/components/ui/ResponsivePanel";
import AvailabilityBadge from "@/components/availability/AvailabilityBadge";
import type { ShopAvailability } from "@/components/availability/useAvailability";
import DeliveryDates from "@/components/wedding/DeliveryDates";
import type { PlanningDetails } from "@/lib/wedding";
import type { DiscoveryMatch } from "@/lib/location";
interface Props extends PlanningDetails {
  matches?: Record<string, DiscoveryMatch>;
  searchRadius?: number;
  onDates: (patch: Partial<PlanningDetails> & { weddingDate?: string }) => void;
  styleId: string;
  basket: BasketLine[];
  weddingDate: string;
  availability: ShopAvailability;
  lookSignal?: number;
  lookItemIds?: string[];
  onWeddingDate: (date: string) => void;
  onAdd: (item: CatalogueItem) => void;
  onRemove: (id: string) => void;
  onQty?: (id: string, quantity: number) => void;
  savedItemIds: string[];
  savedOnly?: boolean;
  savesLoaded: boolean;
  savingItems: Set<string>;
  onToggleSave: (id: string) => void;
}
export default function ProductBrowser({
  matches,
  searchRadius = 50,
  basket,
  weddingDate,
  availability,
  lookSignal = 0,
  lookItemIds,
  onWeddingDate,
  onDates,
  deliverySameDay,
  deliveryDate,
  onAdd,
  onRemove,
  onQty,
  savedItemIds,
  savedOnly = false,
  savesLoaded,
  savingItems,
  onToggleSave,
}: Props) {
  const { items: catalogue } = useCatalogue();
  const [category, setCategory] = useState<Category | "">(""),
    [supplier, setSupplier] = useState(""),
    [sort, setSort] = useState("featured"),
    [style, setStyle] = useState(""),
    [min, setMin] = useState(""),
    [max, setMax] = useState(""),
    [view, setView] = useState<"browse" | "look">("browse"),
    [byVendor, setByVendor] = useState(false),
    [filtersOpen, setFiltersOpen] = useState(false),
    [query, setQuery] = useState("");
  useEffect(() => {
    setCategory("");
    setSupplier("");
    setStyle("");
    setMin("");
    setMax("");
    setQuery("");
    setView("browse");
  }, [savedOnly]);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setView("look");
  }, [lookSignal]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("supplier")) setSupplier(params.get("supplier")!);
  }, []);
  const suppliers = useMemo(() => {
    const grouped = new Map<
      string,
      {
        id: string;
        name: string;
        logo?: string;
        count: number;
        categories: Set<Category>;
      }
    >();
    for (const item of catalogue) {
      const id = item.supplierId || item.supplier;
      const group = grouped.get(id) || {
        id,
        name: item.supplier,
        logo: item.supplierLogo,
        count: 0,
        categories: new Set<Category>(),
      };
      group.count++;
      group.categories.add(item.category);
      grouped.set(id, group);
    }
    return [...grouped.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [catalogue]);
  const maxPrice = Math.max(
    100,
    ...catalogue.map((i) => Math.ceil(i.unitPrice)),
  );

  let items = catalogue.filter(
    (i) =>
      (!category || i.category === category) &&
      (!supplier || (i.supplierId || i.supplier) === supplier) &&
      (!style || i.styles.includes(style)) &&
      (!min || i.unitPrice >= Number(min)) &&
      (!max || i.unitPrice <= Number(max)) &&
      (!query ||
        `${i.name} ${i.supplier}`.toLowerCase().includes(query.toLowerCase())),
  );
  if (matches) {
    items = items.filter((i) => {
      if (savedOnly) return true;
      const m = matches[i.supplierId || ""];
      return (
        !m ||
        m.delivery === "nationwide" ||
        m.delivery === "unknown" ||
        (m.delivery !== "outside_area" &&
          (!searchRadius || m.miles <= searchRadius))
      );
    });
    items.sort(
      (a, b) =>
        (matches[a.supplierId || ""]?.miles ?? Infinity) -
        (matches[b.supplierId || ""]?.miles ?? Infinity),
    );
  }
  if (savedOnly) items = items.filter((item) => savedItemIds.includes(item.id));
  if (view === "look") {
    const ids = new Set(
      lookItemIds?.length ? lookItemIds : basket.map((b) => b.itemId),
    );
    items = items.filter((i) => ids.has(i.id));
  }
  if (sort === "price_up")
    items = [...items].sort((a, b) => a.unitPrice - b.unitPrice);
  if (sort === "price_down")
    items = [...items].sort((a, b) => b.unitPrice - a.unitPrice);
  if (sort === "rated")
    items = [...items].sort(
      (a, b) => (b.reviewCount ? b.rating : 0) - (a.reviewCount ? a.rating : 0),
    );
  const field = "rounded-lg border border-sand bg-cream px-3 py-2 text-sm";
  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-3xl">
          {savedOnly
            ? "Saved items"
            : view === "look"
              ? "Shop this look"
              : "Browse the catalogue"}
        </h2>
        {!savedOnly && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setView("browse")}
              aria-pressed={view === "browse"}
              className="rounded-full border border-sand px-4 py-2 text-sm"
            >
              All pieces
            </button>
            <button
              type="button"
              onClick={() => setView("look")}
              aria-pressed={view === "look"}
              className="rounded-full border border-sand px-4 py-2 text-sm"
            >
              This look
            </button>
          </div>
        )}
      </div>
      <div className="mt-5 flex gap-2 overflow-x-auto pb-3">
        <button
          type="button"
          onClick={() => setCategory("")}
          aria-pressed={!category}
          className={`shrink-0 rounded-full border px-4 py-2 text-sm ${!category ? "border-ink bg-ink text-cream" : "border-sand"}`}
        >
          All categories
        </button>
        {CATEGORY_META.map((c) => (
          <button
            key={c.category}
            type="button"
            aria-pressed={category === c.category}
            onClick={() => {
              setCategory(c.category);
              setView("browse");
            }}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm ${category === c.category ? "border-ink bg-ink text-cream" : "border-sand"}`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-3">
        <label className="sr-only" htmlFor="catalogue-search">
          Search products
        </label>
        <input
          id="catalogue-search"
          placeholder="Search pieces or suppliers"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={`${field} min-w-0 basis-full sm:basis-auto flex-1`}
        />
        <button
          type="button"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="rounded-full border border-sand px-4 py-2 text-sm"
        >
          Filters
        </button>
        <button
          type="button"
          aria-pressed={byVendor}
          onClick={() => setByVendor(!byVendor)}
          className="rounded-full border border-sand px-4 py-2 text-sm"
        >
          Browse by supplier
        </button>
      </div>
      <ResponsivePanel
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Catalogue filters"
        alwaysDesktop
      >
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-xs text-ink/60">
            Supplier
            <select
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className={`${field} mt-1 w-full`}
            >
              <option value="">All suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-ink/60">
            Sort
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className={`${field} mt-1 w-full`}
            >
              <option value="featured">
                {matches ? "Nearest suppliers" : "Featured"}
              </option>
              <option value="price_up">Price: low to high</option>
              <option value="price_down">Price: high to low</option>
              <option value="rated">Top rated</option>
            </select>
          </label>
          <label className="text-xs text-ink/60">
            Style
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className={`${field} mt-1 w-full`}
            >
              <option value="">All styles</option>
              {STYLES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div
          className={`${filtersOpen ? "grid" : "hidden"} mt-3 gap-3 sm:grid-cols-2`}
        >
          <label className="text-xs text-ink/60">
            Minimum unit price (£)
            <input
              type="number"
              min="0"
              step="0.01"
              value={min}
              onChange={(e) => setMin(e.target.value)}
              className={`${field} mt-1 w-full`}
            />
          </label>
          <label className="text-xs text-ink/60">
            Maximum unit price (£)
            <input
              type="number"
              min="0"
              step="0.01"
              value={max}
              onChange={(e) => setMax(e.target.value)}
              className={`${field} mt-1 w-full`}
            />
          </label>
          <div className="sm:col-span-2">
            <p className="mb-2 text-xs text-ink/60">Adjust unit price range</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                aria-label="Minimum unit price slider"
                type="range"
                min="0"
                max={maxPrice}
                step="1"
                value={min || 0}
                onChange={(e) =>
                  setMin(
                    String(
                      Math.min(Number(e.target.value), Number(max || maxPrice)),
                    ),
                  )
                }
                className="w-full accent-clay"
              />
              <input
                aria-label="Maximum unit price slider"
                type="range"
                min="0"
                max={maxPrice}
                step="1"
                value={max || maxPrice}
                onChange={(e) =>
                  setMax(
                    String(Math.max(Number(e.target.value), Number(min || 0))),
                  )
                }
                className="w-full accent-clay"
              />
            </div>
          </div>
        </div>
      </ResponsivePanel>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {category && (
          <button
            type="button"
            onClick={() => setCategory("")}
            className="rounded-full bg-sand px-3 py-2"
          >
            Category ×
          </button>
        )}
        {supplier && (
          <button
            type="button"
            onClick={() => setSupplier("")}
            className="rounded-full bg-sand px-3 py-2"
          >
            Supplier ×
          </button>
        )}
        {style && (
          <button
            type="button"
            onClick={() => setStyle("")}
            className="rounded-full bg-sand px-3 py-2"
          >
            Style ×
          </button>
        )}
        {(min || max) && (
          <button
            type="button"
            onClick={() => {
              setMin("");
              setMax("");
            }}
            className="rounded-full bg-sand px-3 py-2"
          >
            Price range ×
          </button>
        )}
      </div>
      <div className="my-5 border-y border-sand py-5">
        <DeliveryDates
          compact
          weddingDate={weddingDate}
          deliverySameDay={deliverySameDay}
          deliveryDate={deliveryDate}
          onChange={onDates}
          id="catalogue"
        />
        <p role="status" className="mt-3 text-xs text-ink/60">
          {availability.error ||
            (availability.loading
              ? "Checking delivery-to-wedding availability…"
              : availability.items
                ? "Availability checked from delivery through your wedding day."
                : "Choose your dates to check availability.")}
        </p>
      </div>
      <div
        className={
          byVendor ? "grid gap-5 md:grid-cols-[180px_minmax(0,1fr)]" : ""
        }
      >
        {byVendor && (
          <aside
            aria-label="Suppliers"
            className="flex gap-2 overflow-x-auto md:block md:space-y-2"
          >
            <button
              type="button"
              onClick={() => setSupplier("")}
              className="block rounded-lg border border-sand p-3 text-left text-sm"
            >
              All suppliers
            </button>
            {suppliers.map((s) => (
              <button
                type="button"
                key={s.id}
                onClick={() => setSupplier(s.id)}
                aria-pressed={supplier === s.id}
                className={`block shrink-0 rounded-lg border p-3 text-left text-sm ${supplier === s.id ? "border-clay bg-blush" : "border-sand"}`}
              >
                {s.logo && (
                  <img
                    src={s.logo}
                    alt=""
                    className="mb-2 h-8 w-8 rounded-full object-cover"
                  />
                )}
                {s.name}
                <span className="mt-1 block text-xs text-ink/50">
                  {s.count} pieces
                </span>
                <span className="mt-1 block text-xs text-ink/50">
                  {[...s.categories]
                    .map(
                      (c) => CATEGORY_META.find((v) => v.category === c)?.label,
                    )
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </button>
            ))}
          </aside>
        )}
        <div>
          <p role="status" className="mb-4 text-xs text-ink/50">
            {items.length} pieces
          </p>
          {!items.length && (
            <p className="py-12 text-center text-ink/60">
              {savedOnly && !savesLoaded
                ? "Loading your saved pieces…"
                : savedOnly && !savedItemIds.length
                  ? "Save pieces you love using the heart on any product. They’ll appear here, ready to add to your basket."
                  : view === "look"
                    ? "Add pieces or generate a look to see them here."
                    : "No pieces match your filters."}
            </p>
          )}
          <div
            className={`grid gap-5 sm:grid-cols-2 ${byVendor ? "" : "xl:grid-cols-3"}`}
          >
            {items.map((item) => {
              const line = basket.find((b) => b.itemId === item.id);
              return (
                <article
                  id={`item-${item.id}`}
                  key={item.id}
                  className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-sand"
                >
                  <div className="flex aspect-[16/10] items-center justify-center bg-cream">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-4xl">{item.icon}</span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="font-serif text-xl">{item.name}</h3>
                    {item.supplierId ? (
                      <Link
                        href={`/suppliers/${item.supplierId}`}
                        className="mt-1 text-xs text-clay underline"
                      >
                        {item.supplier}
                      </Link>
                    ) : (
                      <p className="mt-1 text-xs text-ink/60">
                        {item.supplier}
                      </p>
                    )}
                    {matches && (
                      <p className="mt-2 text-xs text-ink/60">
                        {(() => {
                          const m = matches[item.supplierId || ""];
                          return !m
                            ? "Location and delivery need confirming"
                            : `${m.miles} miles away · ${m.delivery === "nationwide" ? "Nationwide delivery" : m.delivery === "within_area" ? "Within stated delivery area" : m.delivery === "outside_area" ? "Outside stated delivery area" : "Delivery coverage needs confirming"}`;
                        })()}
                      </p>
                    )}
                    <p className="mt-3 text-lg">
                      {formatGBP(item.unitPrice)}{" "}
                      <span className="text-xs text-ink/50">{item.unit}</span>
                    </p>
                    {item.reviewCount > 0 && (
                      <p className="mt-1 text-xs">
                        ★ {item.rating.toFixed(1)} ({item.reviewCount} reviews)
                      </p>
                    )}
                    <div className="mt-3">
                      <AvailabilityBadge
                        availability={availability.items?.[item.id]}
                        madeToOrder={item.stock === "made_to_order"}
                      />
                    </div>
                    {item.leadTimeDays > 0 && (
                      <p className="mt-2 text-xs text-ink/60">
                        {item.leadTimeDays} days’ notice required
                      </p>
                    )}
                    {item.note && (
                      <p className="mt-2 text-xs text-ink/60">{item.note}</p>
                    )}
                    <div className="mt-auto pt-4">
                      {line ? (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-clay">Added ✓</span>
                          <label className="text-xs">
                            Qty
                            <input
                              aria-label={`Quantity of ${item.name}`}
                              type="number"
                              min="1"
                              max="10000"
                              value={line.quantity}
                              onChange={(e) => {
                                const n = Number(e.target.value);
                                if (Number.isInteger(n) && n > 0 && n <= 10000)
                                  onQty?.(item.id, n);
                              }}
                              className="ml-2 w-16 rounded border border-sand p-2"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => onRemove(item.id)}
                            className="text-xs underline"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onAdd(item)}
                          className="w-full rounded-full bg-ink px-4 py-2 text-sm text-cream"
                        >
                          Add to basket
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onToggleSave(item.id)}
                        disabled={!savesLoaded || savingItems.has(item.id)}
                        aria-pressed={savedItemIds.includes(item.id)}
                        aria-label={`${savedItemIds.includes(item.id) ? "Unsave" : "Save"} ${item.name}`}
                        className={`mt-3 w-full rounded-full border px-4 py-2 text-sm disabled:opacity-50 ${savedItemIds.includes(item.id) ? "border-clay bg-blush text-ink" : "border-sand text-ink/60"}`}
                      >
                        {savingItems.has(item.id)
                          ? "Saving…"
                          : savedItemIds.includes(item.id)
                            ? "♥ Saved"
                            : "♡ Save item"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
