"use client";

import { useEffect, useState } from "react";
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
  focusedItemId?: string;
  onWeddingDate: (date: string) => void;
  onAdd: (item: CatalogueItem) => void;
  onRemove: (itemId: string) => void;
}

export default function ProductBrowser({
  styleId,
  basket,
  weddingDate,
  availability,
  focusedItemId,
  onWeddingDate,
  onAdd,
  onRemove,
}: Props) {
  const { itemsForCategory, getItem } = useCatalogue();

  useEffect(() => {
    if (!focusedItemId) return;
    const item = getItem(focusedItemId);
    if (!item) return;
    setCategory(item.category);
    // Wait for the category switch to render before scrolling.
    setTimeout(() => {
      document.getElementById(`item-${focusedItemId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  }, [focusedItemId, getItem]);
  const [category, setCategory] = useState<Category>("backdrops");
  const [matchOnly, setMatchOnly] = useState(true);

  const inBasket = (id: string) => basket.some((b) => b.itemId === id);

  let items = itemsForCategory(category);
  if (matchOnly) {
    const matched = items.filter((i) => i.styles.includes(styleId));
    // Only apply the filter when it leaves something to show.
    if (matched.length > 0) items = matched;
  }

  return (
    <div className="flex h-full flex-col">
      {/* Category rail */}
      <div className="border-b border-sand px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-serif text-lg text-ink">Shop the look</h2>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-ink/50">
            <input
              type="checkbox"
              checked={matchOnly}
              onChange={(e) => setMatchOnly(e.target.checked)}
              className="accent-clay"
            />
            Match my style
          </label>
        </div>
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
      <p className="px-4 pt-3 text-xs text-ink/40">{categoryMeta(category).blurb}</p>

      {/* Product grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const active = inBasket(item.id);
            const focused = item.id === focusedItemId;
            return (
              <div
                key={item.id}
                id={`item-${item.id}`}
                className={`flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-colors ${focused ? "border-clay ring-2 ring-clay/30" : "border-sand"}`}
              >
                <div
                  className="relative flex aspect-[4/3] items-center justify-center"
                  style={{ backgroundColor: item.image ? undefined : `${item.swatch}22` }}
                >
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
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
    </div>
  );
}
