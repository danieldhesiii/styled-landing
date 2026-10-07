"use client";

import { useEffect, useRef, useState } from "react";
import type { BasketLine, Category, CatalogueItem } from "@/lib/types";
import { CATEGORY_META, categoryMeta } from "@/lib/categories";
import { useCatalogue } from "@/components/catalogue/CatalogueProvider";
import { formatGBP } from "@/lib/quote";
import AvailabilityBadge from "@/components/availability/AvailabilityBadge";
import type { ShopAvailability } from "@/components/availability/useAvailability";

interface Props {
  styleId: string;
  basket: BasketLine[];
  weddingDate: string;
  availability: ShopAvailability;
  /** Increment to switch the browser into the "Shop this look" list view. */
  lookSignal?: number;
  /** Exact catalogue items that make up the current render (what's in the picture). */
  lookItemIds?: string[];
  onWeddingDate: (date: string) => void;
  onAdd: (item: CatalogueItem) => void;
  onRemove: (itemId: string) => void;
}

// The decor categories that actually appear in a styled room render, so the
// "Shop this look" list stays faithful to what's in the picture (no attire,
// stationery or cake, which aren't part of the room shot).
const LOOK_CATEGORIES: Category[] = [
  "backdrops",
  "florals",
  "centrepieces",
  "furniture",
  "linen_tableware",
  "lighting",
  "signage",
];

export default function ProductBrowser({
  styleId,
  basket,
  weddingDate,
  availability,
  lookSignal = 0,
  lookItemIds,
  onWeddingDate,
  onAdd,
  onRemove,
}: Props) {
  const { itemsForCategory, getItem } = useCatalogue();
  const [category, setCategory] = useState<Category>("backdrops");
  const [matchOnly, setMatchOnly] = useState(true);
  const [view, setView] = useState<"browse" | "look">("browse");

  // "Shop this look" requested from the render — switch to the look list.
  const firstSignal = useRef(true);
  useEffect(() => {
    if (firstSignal.current) {
      firstSignal.current = false;
      return;
    }
    setView("look");
  }, [lookSignal]);

  const inBasket = (id: string) => basket.some((b) => b.itemId === id);

  // The pieces that make up the current look. When a render is showing, these are
  // the exact catalogue items it was built from — a faithful "what's in the
  // picture" list. Otherwise we fall back to the couple's chosen items plus a
  // style-matched suggestion per decor category.
  const lookItems: CatalogueItem[] = (() => {
    if (lookItemIds && lookItemIds.length > 0) {
      return lookItemIds
        .map((id) => getItem(id))
        .filter((i): i is CatalogueItem => !!i);
    }
    const chosen = basket
      .map((b) => getItem(b.itemId))
      .filter((i): i is CatalogueItem => !!i);
    const coveredCats = new Set(chosen.map((i) => i.category));
    const suggestions = LOOK_CATEGORIES.filter((c) => !coveredCats.has(c))
      .map((c) => {
        const inCat = itemsForCategory(c);
        return inCat.find((i) => i.styles.includes(styleId)) ?? inCat[0];
      })
      .filter((i): i is CatalogueItem => !!i);
    return [...chosen, ...suggestions];
  })();

  const lookTotal = lookItems.reduce((sum, i) => sum + i.unitPrice, 0);
  const lookToAdd = lookItems.filter((i) => !inBasket(i.id));

  function addWholeLook() {
    for (const item of lookToAdd) onAdd(item);
  }

  let items = itemsForCategory(category);
  if (matchOnly) {
    const matched = items.filter((i) => i.styles.includes(styleId));
    // Only apply the filter when it leaves something to show.
    if (matched.length > 0) items = matched;
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header + view toggle */}
      <div className="border-b border-sand px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-serif text-lg text-ink">
            {view === "look" ? "Shop this look" : "Shop the look"}
          </h2>
          {view === "browse" && (
            <label className="flex cursor-pointer items-center gap-2 text-xs text-ink/50">
              <input
                type="checkbox"
                checked={matchOnly}
                onChange={(e) => setMatchOnly(e.target.checked)}
                className="accent-clay"
              />
              Match my style
            </label>
          )}
        </div>

        {/* Switch between the curated look list and browsing everything. */}
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setView("look")}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              view === "look"
                ? "border-clay bg-clay text-cream"
                : "border-sand text-ink/60 hover:border-clay/50 hover:text-ink"
            }`}
          >
            🛍 This look
          </button>
          <button
            type="button"
            onClick={() => setView("browse")}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              view === "browse"
                ? "border-clay bg-clay text-cream"
                : "border-sand text-ink/60 hover:border-clay/50 hover:text-ink"
            }`}
          >
            Browse all
          </button>
        </div>

        {/* Category rail — browse mode only */}
        {view === "browse" && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {CATEGORY_META.map((c) => (
              <button
                key={c.category}
                type="button"
                onClick={() => setCategory(c.category)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  category === c.category
                    ? "border-clay bg-clay text-cream"
                    : "border-sand text-ink/60 hover:border-clay/50 hover:text-ink"
                }`}
              >
                <span>{c.icon}</span>
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Availability depends on the wedding date, so ask for it right here. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-sand px-4 py-3 text-xs">
        <label htmlFor="shop-wedding-date" className="font-medium text-ink">
          Wedding date
        </label>
        <input
          id="shop-wedding-date"
          type="date"
          value={weddingDate}
          min={new Date().toISOString().slice(0, 10)}
          onChange={(e) => onWeddingDate(e.target.value)}
          className="rounded-lg border border-sand bg-white px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-clay/30"
        />
        <span className={availability.error ? "text-red-700" : "text-ink/45"}>
          {availability.error
            ? availability.error
            : availability.loading
              ? "Checking what's free…"
              : availability.items
                ? "Showing what's free on your date."
                : "Add your date to see what each supplier has free."}
        </span>
      </div>

      {view === "look" ? (
        /* ── SHOP THIS LOOK — a list of the pieces in the render ─────── */
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand px-4 py-3">
            <p className="text-xs text-ink/50">
              The pieces that make up this look — add them all, or pick the ones you want.
            </p>
            <div className="flex items-center gap-3">
              <span className="text-xs text-ink/50">
                Look total <span className="font-serif text-sm text-clay">{formatGBP(lookTotal)}</span>
              </span>
              <button
                type="button"
                onClick={addWholeLook}
                disabled={lookToAdd.length === 0}
                className="rounded-full bg-ink px-4 py-2 text-xs font-medium text-cream hover:bg-ink/90 disabled:bg-ink/30 disabled:cursor-not-allowed transition-colors"
              >
                {lookToAdd.length === 0
                  ? "✓ Whole look added"
                  : `Add whole look (${lookToAdd.length}) →`}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {lookItems.length === 0 ? (
              <p className="py-10 text-center text-sm text-ink/40">
                Generate a look first, then the pieces that make it up appear here.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {lookItems.map((item) => {
                  const active = inBasket(item.id);
                  return (
                    <li
                      key={item.id}
                      className="flex items-center gap-3 rounded-2xl border border-sand bg-white p-2.5 shadow-sm"
                    >
                      <div
                        className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl"
                        style={{ backgroundColor: item.image ? undefined : `${item.swatch}22` }}
                      >
                        {item.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-2xl opacity-70">{item.icon}</span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-sm font-medium text-ink">{item.name}</p>
                          <span className="shrink-0 font-serif text-sm text-clay">
                            {formatGBP(item.unitPrice)}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-ink/40">
                          {categoryMeta(item.category).label} · {item.supplier}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <AvailabilityBadge
                            availability={availability.items?.[item.id]}
                            madeToOrder={item.stock === "made_to_order"}
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => (active ? onRemove(item.id) : onAdd(item))}
                        className={`shrink-0 rounded-full px-3 py-2 text-xs font-medium transition-colors ${
                          active
                            ? "border border-clay bg-clay/10 text-clay hover:bg-clay/20"
                            : "bg-ink text-cream hover:bg-ink/90"
                        }`}
                      >
                        {active ? "✓ Added" : "Add"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      ) : (
        /* ── BROWSE ALL — the full catalogue by category ────────────── */
        <>
          <p className="px-4 pt-3 text-xs text-ink/40">{categoryMeta(category).blurb}</p>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => {
                const active = inBasket(item.id);
                return (
                  <div
                    key={item.id}
                    id={`item-${item.id}`}
                    className="flex flex-col overflow-hidden rounded-2xl border border-sand bg-white shadow-sm"
                  >
                    <div
                      className="relative flex aspect-[4/3] items-center justify-center"
                      style={{ backgroundColor: item.image ? undefined : `${item.swatch}22` }}
                    >
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-4xl opacity-70">{item.icon}</span>
                      )}
                      <div className="absolute left-2 top-2">
                        <AvailabilityBadge
                          availability={availability.items?.[item.id]}
                          madeToOrder={item.stock === "made_to_order"}
                        />
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-snug text-ink">{item.name}</p>
                        <span className="shrink-0 font-serif text-base text-clay">
                          {formatGBP(item.unitPrice)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-ink/40">
                        {item.supplier} · {item.supplierArea}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-ink/50">
                        <span className="text-clay">★ {item.rating.toFixed(1)}</span>
                        <span>({item.reviewCount})</span>
                        <span className="text-ink/30">·</span>
                        <span>{item.unit}</span>
                      </div>
                      {item.note && (
                        <p className="mt-1.5 text-[11px] leading-snug text-ink/45">{item.note}</p>
                      )}

                      <button
                        type="button"
                        onClick={() => (active ? onRemove(item.id) : onAdd(item))}
                        className={`mt-3 w-full rounded-full px-3 py-2 text-xs font-medium transition-colors ${
                          active
                            ? "border border-clay bg-clay/10 text-clay hover:bg-clay/20"
                            : "bg-ink text-cream hover:bg-ink/90"
                        }`}
                      >
                        {active ? "✓ In your design" : "Add to design"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
