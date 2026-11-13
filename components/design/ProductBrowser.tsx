"use client";
import { supplierProfileId } from "@/lib/supplier-profile";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { BasketLine, Category, CatalogueItem } from "@/lib/types";
import { CATEGORY_META } from "@/lib/categories";
import { useCatalogue } from "@/components/catalogue/CatalogueProvider";
import { formatGBP } from "@/lib/quote";
import { cataloguePriceForSort, oneDayDemoTotal } from "@/lib/demo-pricing";
import { STYLES } from "@/lib/styles";
import ResponsivePanel from "@/components/ui/ResponsivePanel";
import AvailabilityBadge from "@/components/availability/AvailabilityBadge";
import type { ShopAvailability } from "@/components/availability/useAvailability";
import type { PlanningDetails } from "@/lib/wedding";
import { deliveryDay } from "@/lib/wedding";
import { isValidDay } from "@/lib/availability";
import type { DiscoveryMatch } from "@/lib/location";
import ProductDetails from "./ProductDetails";
import ProductPurchase from "./ProductPurchase";
import type { BoardPickerProps } from "@/components/wedding/BoardPicker";
import ProductPreviewSelection from "./ProductPreviewSelection";
interface Props extends PlanningDetails, BoardPickerProps {
  matches?: Record<string, DiscoveryMatch>;
  placeMatches?: Record<string, string>;
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
  onVisualise?: (item: CatalogueItem) => void;
  selectedVisualiserIds?: string[];
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
  placeMatches,
  searchRadius = 50,
  basket,
  weddingDate,
  availability,
  lookSignal = 0,
  lookItemIds,
  deliverySameDay,
  deliveryDate,
  returnDate,
  onAdd,
  onVisualise,
  selectedVisualiserIds = [],
  onRemove,
  onQty,
  savedItemIds,
  savedOnly = false,
  savesLoaded,
  savingItems,
  onToggleSave,
}: Props) {
  const {
    items: catalogue,
    loading: catalogueLoading,
    error: catalogueError,
  } = useCatalogue();
  const params = useSearchParams();
  const [detailId, setSelectedDetailId] = useState<string | null>(params.get("product"));
  const routeProduct = params.get("product");
  useEffect(() => { setSelectedDetailId(routeProduct); }, [routeProduct]);
  useEffect(() => {
    const restore = () => setSelectedDetailId(new URL(window.location.href).searchParams.get("product"));
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);
  const detail = catalogue.find((item) => item.id === detailId);
  const setDetailId = (id: string | null) => {
    setSelectedDetailId(id);
    const url = new URL(window.location.href);
    if (id) {
      url.searchParams.set("product", id);
      for (const [key, value] of Object.entries({ category, supplier, q: query, styleFilter: style, min, max, sort })) {
        if (value) url.searchParams.set(key, value);
        else url.searchParams.delete(key);
      }
    } else url.searchParams.delete("product");
    window.history.pushState(null, "", url);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const delivery = deliveryDay({ weddingDate, deliverySameDay, deliveryDate });
  const formatDate = (date: string) =>
    new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  const datesLabel =
    isValidDay(weddingDate) && isValidDay(delivery)
      ? delivery === weddingDate
        ? `${formatDate(weddingDate)} · Same-day delivery`
        : `${formatDate(delivery)} to ${formatDate(weddingDate)} · Delivery to wedding`
      : "Dates undecided";
  const hireDatesLabel = `${datesLabel}${isValidDay(returnDate || "") ? ` · Collection ${formatDate(returnDate!)}` : ""}`;
  const alternatives = (item: CatalogueItem) => {
    setDetailId(null);
    setCategory(item.category);
    setSupplier("");
    setStyle("");
    setMin("");
    setMax("");
    setQuery("");
    setView("browse");
  };
  const [allCategoriesOpen, setAllCategoriesOpen] = useState(false);
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
    if (params.get("category")) setCategory(params.get("category") as Category);
    if (params.get("q")) setQuery(params.get("q")!);
    if (params.get("styleFilter")) setStyle(params.get("styleFilter")!);
    if (params.get("min")) setMin(params.get("min")!);
    if (params.get("max")) setMax(params.get("max")!);
    if (params.get("sort")) setSort(params.get("sort")!);
  }, []);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierLimit, setSupplierLimit] = useState(8);
  function servesVenue(id: string) {
    const match = matches?.[id];
    if (!match || match.delivery === "unknown" || match.delivery === "nationwide") return true;
    return match.delivery !== "outside_area" && (!searchRadius || match.miles <= searchRadius);
  }
  const suppliers = useMemo(() => {
    const grouped = new Map<
      string,
      {
        id: string;
        name: string;
        profileId?: string;
        logo?: string;
        count: number;
        categories: Set<Category>;
        area: string;
      }
    >();
    for (const item of catalogue) {
      if (placeMatches && !savedOnly && !Object.hasOwn(placeMatches, item.supplierId || "")) continue;
      if (matches && !placeMatches && !savedOnly && !servesVenue(item.supplierId || "")) continue;
      const id = item.supplierId || item.supplier;
      const group = grouped.get(id) || {
        id,
        name: item.supplier,
        profileId: supplierProfileId(item),
        logo: item.supplierLogo,
        area: !savedOnly && typeof placeMatches?.[item.supplierId || ""] === "string" ? placeMatches[item.supplierId || ""] : item.supplierArea,
        count: 0,
        categories: new Set<Category>(),
      };
      group.count++;
      group.categories.add(item.category);
      grouped.set(id, group);
    }
    return [...grouped.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [catalogue, placeMatches, savedOnly, matches, searchRadius]);
  const matchingSuppliers = suppliers.filter(s => {
    const categoryNames = [...s.categories].map(c => CATEGORY_META.find(meta => meta.category === c)?.label).join(" ");
    return [s.name, s.area, categoryNames].join(" ").toLowerCase().includes(supplierSearch.trim().toLowerCase());
  }).sort((a, b) => (matches?.[a.id]?.miles ?? Infinity) - (matches?.[b.id]?.miles ?? Infinity));

  let items = catalogue.filter(
    (i) =>
      (!category || i.category === category) &&
      (!supplier || (i.supplierId || i.supplier) === supplier) &&
      (!style || i.styles.includes(style)) &&
      (!min || (cataloguePriceForSort(i) !== null && cataloguePriceForSort(i)! >= Number(min))) &&
      (!max || (cataloguePriceForSort(i) !== null && cataloguePriceForSort(i)! <= Number(max))) &&
      (!query ||
        `${i.name} ${i.supplier}`.toLowerCase().includes(query.toLowerCase())),
  );
  if (placeMatches && !savedOnly) {
    items = items.filter((i) => Object.hasOwn(placeMatches, i.supplierId || ""));
  }
  if (matches && !placeMatches) {
    items = items.filter((i) => {
      if (savedOnly) return true;
      return servesVenue(i.supplierId || "");
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
    items = [...items].sort((a, b) => (cataloguePriceForSort(a) ?? Infinity) - (cataloguePriceForSort(b) ?? Infinity));
  if (sort === "price_down")
    items = [...items].sort((a, b) => (cataloguePriceForSort(b) ?? -Infinity) - (cataloguePriceForSort(a) ?? -Infinity));
  if (sort === "rated")
    items = [...items].sort(
      (a, b) =>
        (b.reviewsVerified && b.reviewCount ? b.rating : 0) -
        (a.reviewsVerified && a.reviewCount ? a.rating : 0),
    );
  const [savedToolsOpen, setSavedToolsOpen] = useState(false);
  const field = "min-h-11 min-w-0 rounded-lg border border-sand bg-cream px-3 py-2 text-sm";
  const browseParams = new URLSearchParams(params.toString());
  browseParams.delete("product");
  for (const [key, value] of Object.entries({ category, supplier, q: query, styleFilter: style, min, max, sort })) {
    if (value) browseParams.set(key, value);
    else browseParams.delete(key);
  }
  const browseHref = `/design?${browseParams}`;
  if (detail) return (
    <div key={detail.id} className="view-fade min-w-0 p-3 sm:p-6">
      <ProductDetails
        presentation="page"
        item={detail}
        line={basket.find((line) => line.itemId === detail.id)}
        availability={availability.items?.[detail.id]}
        datesLabel={hireDatesLabel}
        onVisualise={onVisualise}
        selectedVisualiserIds={selectedVisualiserIds}
        onAdd={onAdd}
        onRemove={onRemove}
        onQty={onQty}
        onClose={() => setDetailId(null)}
        onAlternatives={() => alternatives(detail)}
        browseHref={browseHref}
      />
    </div>
  );

  return (
    <div className={savedOnly ? "view-fade min-w-0 p-3 sm:p-6" : "view-fade catalogue-gallery min-w-0 p-4 sm:p-8"}>
      {detailId && !catalogueLoading && !catalogueError && <p role="status" className="mb-4 text-sm text-clay">This product is no longer in the current catalogue. Explore other pieces below.</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          className={savedOnly ? "sr-only" : "font-serif text-2xl sm:text-3xl"}
        >
          <span className="sm:hidden">{savedOnly ? "Saved items" : view === "look" ? "Shop this look" : "Catalogue"}</span><span className="hidden sm:inline">{savedOnly
            ? "Saved items"
            : view === "look"
              ? "Shop this look"
              : "Browse the catalogue"}</span>
        </h2>
        {savedOnly && savedItemIds.length>0 && (
          <button
            type="button"
            onClick={() => setSavedToolsOpen((v) => !v)}
            aria-expanded={savedToolsOpen}
            className="min-h-10 rounded-full border border-sand px-4 text-sm"
          >
            {savedToolsOpen ? "Hide filters" : "Search and filter"}
          </button>
        )}
        {!savedOnly && (
          <div aria-label="Catalogue view" className="flex gap-1 rounded-full border border-sage/40 bg-sage/15 p-1">
            <button
              type="button"
              onClick={() => setView("browse")}
              aria-pressed={view === "browse"}
              className={`min-h-11 rounded-full border px-3 py-2 text-xs font-medium text-ink transition-colors sm:px-4 sm:text-sm ${view === "browse" ? "border-sage bg-sage" : "border-transparent hover:bg-sage/20"}`}
            >
              All pieces
            </button>
            <button
              type="button"
              onClick={() => setView("look")}
              aria-pressed={view === "look"}
              className={`min-h-11 rounded-full border px-3 py-2 text-xs font-medium text-ink transition-colors sm:px-4 sm:text-sm ${view === "look" ? "border-sage bg-sage" : "border-transparent hover:bg-sage/20"}`}
            >
              This look
            </button>
          </div>
        )}
      </div>
      <div hidden={savedOnly && !savedToolsOpen}>
        <fieldset className="category-index mt-5 min-w-0">
          <legend className="mb-2 text-sm font-medium">Browse by category</legend>
          <div className="category-options">
            {[{ category: "" as const, label: "All categories" }, ...CATEGORY_META].map(({ category: value, label }) => (
              <button
                type="button"
                key={value}
                aria-pressed={category === value}
                data-secondary={!["", "florals", "furniture", "lighting", category].includes(value) && !allCategoriesOpen || undefined}
                onClick={() => {
                  setCategory(value);
                  if (value) setView("browse");
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-expanded={allCategoriesOpen}
            className="category-expand min-h-11 text-sm underline underline-offset-4"
            onClick={() => setAllCategoriesOpen(open => !open)}
          >
            {allCategoriesOpen ? "Show fewer categories" : "Show all categories"}
          </button>
        </fieldset>
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <label className="sr-only" htmlFor="catalogue-search">
            Search products
          </label>
          <input
            id="catalogue-search"
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={`${field} min-w-0 flex-1`}
          />
          <button
            type="button"
            aria-controls="catalogue-filters-panel" aria-expanded={filtersOpen}
            onClick={() => { setFiltersOpen(!filtersOpen); setByVendor(false); }}
            className={`min-h-11 rounded-full border px-4 py-2 text-sm font-medium text-ink transition-colors ${filtersOpen ? "border-clay bg-clay hover:bg-clay/90" : "border-clay/40 bg-clay/15 hover:bg-clay/25"}`}
          >
            Filters
          </button>
          <button
            type="button"
            aria-controls="catalogue-suppliers-panel" aria-expanded={byVendor}
            onClick={() => { setByVendor(!byVendor); setFiltersOpen(false); }}
            className={`min-h-11 rounded-full border px-4 py-2 text-sm font-medium text-ink transition-colors ${byVendor ? "border-clay bg-clay hover:bg-clay/90" : "border-clay/40 bg-clay/15 hover:bg-clay/25"}`}
          >
            Suppliers
          </button>
        </div>
        <ResponsivePanel id="catalogue-filters-panel"
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          title="Catalogue filters"
        >
          <section aria-label="Catalogue filters" className="mt-4 rounded-xl border border-sand p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-serif text-xl">Filters</h3>
            <button type="button" onClick={() => setFiltersOpen(false)} className="min-h-11 px-3 text-sm underline">Done</button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                  {matches && !placeMatches ? "Nearest suppliers" : "Featured"}
                </option>
                <option value="price_up">Price: low to high</option>
                <option value="price_down">Price: high to low</option>
                <option value="rated">Verified rating</option>
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
          </div>
          </section>
        </ResponsivePanel>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="min-h-11 rounded-full bg-sand px-3 py-2"
            >
              Search: {query} ×
            </button>
          )}
          {(query || category || supplier || style || min || max) && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategory("");
                setSupplier("");
                setStyle("");
                setMin("");
                setMax("");
              }}
              className="min-h-11 px-3 underline"
            >
              Clear filters
            </button>
          )}
          {category && (
            <button
              type="button"
              onClick={() => setCategory("")}
              className="min-h-11 rounded-full bg-sand px-3 py-2"
            >
              {CATEGORY_META.find((c) => c.category === category)?.label} ×
            </button>
          )}
          {supplier && (
            <button
              type="button"
              onClick={() => setSupplier("")}
              className="min-h-11 rounded-full bg-sand px-3 py-2"
            >
              {suppliers.find((s) => s.id === supplier)?.name || supplier} ×
            </button>
          )}
          {style && (
            <button
              type="button"
              onClick={() => setStyle("")}
              className="min-h-11 rounded-full bg-sand px-3 py-2"
            >
              {STYLES.find((s) => s.id === style)?.name || style} ×
            </button>
          )}
          {(min || max) && (
            <button
              type="button"
              onClick={() => {
                setMin("");
                setMax("");
              }}
              className="min-h-11 rounded-full bg-sand px-3 py-2"
            >
              £{min || "0"} to {max ? `£${max}` : "any"} ×
            </button>
          )}
        </div>
        <div className="my-4 flex flex-wrap items-center justify-between gap-2 border-y border-sand py-3 text-sm">
          <p>{hireDatesLabel}</p>
          <Link href="/design?tab=wedding" className="inline-flex min-h-11 items-center underline underline-offset-4">Edit in Wedding plan</Link>
        </div>
        <p role="status" className="-mt-2 mb-4 text-xs text-ink/60">
            {availability.error ||
              (availability.loading
                ? "Checking availability for your hire dates…"
                : availability.items
                  ? "Availability checked for your hire dates. Supplier confirmation required."
                  : "Choose your dates to check availability.")}
        </p>
      </div>
      <ResponsivePanel id="catalogue-suppliers-panel" open={byVendor} onClose={() => setByVendor(false)} title="Catalogue suppliers">
        <section aria-label="Catalogue suppliers" className="mb-5 rounded-xl border border-sand p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-serif text-xl">Suppliers · {suppliers.length}</h3>
            <button type="button" onClick={() => setByVendor(false)} className="min-h-11 px-3 text-sm underline">Done</button>
          </div>
          <button type="button" onClick={() => setSupplier("")} aria-pressed={!supplier} className={`mb-3 min-h-11 rounded-full border px-4 text-sm ${!supplier ? "border-ink bg-ink text-cream" : "border-sand"}`}>All suppliers</button>
          <input type="search" value={supplierSearch} aria-label="Find a supplier" placeholder="Search by supplier, category or area" onChange={e => { setSupplierSearch(e.target.value); setSupplierLimit(8); }} className={field + " mb-3 block w-full"} />
          {!matchingSuppliers.length && <p className="text-sm text-ink/60">No matching suppliers. Try another name or area.</p>}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {matchingSuppliers.slice(0, supplierLimit).map((s) => (
              <div key={s.id} className="min-w-0">
              <button type="button" onClick={() => { setSupplier(s.id); setByVendor(false); }} aria-pressed={supplier === s.id}
                className={`flex min-h-11 min-w-0 items-center gap-3 rounded-lg border p-3 text-left text-sm ${supplier === s.id ? "border-clay bg-blush" : "border-sand"}`}>
                {s.logo && <img src={s.logo} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />}
                <span className="min-w-0 break-words"><span className="block font-medium">{s.name}</span><span className="block text-xs text-ink/60">{s.area || "Service area not supplied"} · {s.count} {s.count === 1 ? "piece" : "pieces"}</span></span>
              </button>
              {matches && !placeMatches && !savedOnly && <p className="px-3 pt-2 text-xs text-ink/65">
                {matches[s.id]?.delivery === "within_area" ? `${matches[s.id].miles} miles from your search location` :
                  matches[s.id]?.delivery === "nationwide" ? "Nationwide delivery" : "Confirm delivery coverage"}
              </p>}
              {s.profileId && <Link className="inline-flex min-h-11 items-center px-3 text-xs underline" href={`/suppliers/${s.profileId}`}>View supplier profile</Link>}
              </div>
            ))}
          </div>
          {matchingSuppliers.length > supplierLimit && <button type="button" className="min-h-11 underline" onClick={() => setSupplierLimit(n => n + 8)}>Show more suppliers</button>}
        </section>
      </ResponsivePanel>
      <div className="min-w-0">
        <div>
          <p role="status" className="mb-4 text-xs text-ink/50">
            {catalogueLoading
              ? "Loading catalogue…"
              : catalogueError
                ? "Catalogue unavailable. Retry loading to browse pieces."
                : `${items.length} pieces`}
          </p>
          {!items.length && !catalogueLoading && !catalogueError && (
            <p className="py-12 text-center text-ink/60">
              {savedOnly && !savesLoaded
                ? "Loading your saved pieces…"
                : savedOnly && !savedItemIds.length
                  ? "Use Browse, then Catalogue products. Tap a product’s heart to save it here."
                  : view === "look"
                    ? "Add pieces or generate a look to see them here."
                    : "No pieces match your filters."}
            </p>
          )}
          <details className="mb-4 text-sm text-ink/60">
            <summary className="inline-flex min-h-11 cursor-pointer items-center underline underline-offset-4">About catalogue images</summary>
            <p className="max-w-prose pb-3">Images may be supplier photographs, reference images or illustrations. Open a product’s image information for its source. AI previews are illustrative; confirm appearance with the supplier.</p>
          </details>
          <div
            key={category + view}
            className="view-fade grid grid-cols-1 gap-4 min-[390px]:grid-cols-2 sm:gap-5 xl:grid-cols-3"
          >
            {items.map((item) => {
              return (
                <article
                  id={`item-${item.id}`}
                  key={item.id}
                  className="group relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-sand transition-colors duration-200 hover:border-clay/60 focus-within:border-clay"
                >
                  <button
                    type="button"
                    onClick={() => setDetailId(item.id)}
                    aria-label={`View ${item.name} details`}
                    className="relative flex aspect-[16/10] w-full flex-none items-center justify-center overflow-hidden bg-cream"
                  >
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        loading="lazy"
                        className={`absolute inset-0 h-full w-full transition-transform duration-500 motion-reduce:transition-none group-hover:scale-[1.025] ${item.demoOnly ? "object-contain p-3 sm:p-5" : "object-contain sm:object-cover"}`}
                      />
                    ) : (
                      <span className="text-4xl">{item.icon}</span>
                    )}
                  </button>
                  <div className="flex flex-1 flex-col p-2.5 sm:p-4">
                    <h3 className="font-serif text-base leading-snug sm:text-xl">
                      <button
                        type="button"
                        onClick={() => setDetailId(item.id)}
                        className="line-clamp-2 text-left underline decoration-sand underline-offset-4 sm:line-clamp-none"
                      >
                        {item.name}
                      </button>
                    </h3>
                    {supplierProfileId(item) ? (
                      <Link
                        href={`/suppliers/${supplierProfileId(item)}`}
                        className="mt-1 inline-flex min-h-11 items-center text-xs text-clay underline"
                      >
                        {item.supplier}
                      </Link>
                    ) : (
                      <p className="mt-1 text-xs text-ink/60">
                        {item.supplier}
                      </p>
                    )}
                    {!savedOnly && typeof placeMatches?.[item.supplierId || ""] === "string" && (
                      <p className="mt-1 text-xs text-ink/60">{placeMatches[item.supplierId || ""]}</p>
                    )}
                    <p className="mt-3 text-lg">
                      {item.priceOnRequest
                        ? "Price on request"
                        : item.demoOnly
                          ? `One-day estimate ${formatGBP(oneDayDemoTotal(item) ?? 0)}`
                          : <>{formatGBP(item.unitPrice)}{" "}<span className="text-xs text-ink/50">{item.unit}</span></>}
                    </p>
                    <div className="mt-3">
                      {item.requestOnly || item.demoOnly ? (
                        <span className="inline-flex rounded-full bg-clay/10 px-3 py-1 text-xs font-medium text-clay">Availability on request</span>
                      ) : (
                        availability.items?.[item.id] || item.stock === "made_to_order" ? <AvailabilityBadge
                          availability={availability.items?.[item.id]}
                          madeToOrder={item.stock === "made_to_order"}
                        /> : <span className="text-xs text-ink/60">Dates not checked</span>
                      )}
                    </div>
                    <div className="mt-auto pt-4">
                      <ProductPurchase compact item={item} line={basket.find(line=>line.itemId===item.id)} availability={availability.items?.[item.id]} onAdd={onAdd} onRemove={onRemove} onQty={onQty} onAlternatives={()=>alternatives(item)} />
                      <button type="button" onClick={() => setDetailId(item.id)} className="mt-2 min-h-11 w-full px-3 py-2 text-sm text-ink underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
                        View product
                      </button>
                      <div className="mt-2">
                        <ProductPreviewSelection item={item} selectedVisualiserIds={selectedVisualiserIds} onVisualise={onVisualise} disabled={catalogueLoading || !!catalogueError} studioHref={browseHref} />
                      </div>
                      <button
                        type="button"
                        onClick={() => onToggleSave(item.id)}
                        disabled={
                          catalogueLoading ||
                          !!catalogueError ||
                          !savesLoaded ||
                          savingItems.has(item.id)
                        }
                        aria-pressed={savedItemIds.includes(item.id)}
                        aria-label={`${savedItemIds.includes(item.id) ? "Unsave" : "Save"} ${item.name}`}
                        className={`absolute right-1.5 top-1.5 flex h-11 w-11 items-center justify-center rounded-full border bg-white text-lg disabled:opacity-50 ${savedItemIds.includes(item.id) ? "border-clay bg-blush text-ink" : "border-sand text-ink/60"}`}
                      >
                        <span aria-hidden="true">{savingItems.has(item.id) ? "…" : savedItemIds.includes(item.id) ? "♥" : "♡"}</span>

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
