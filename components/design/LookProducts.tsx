"use client";
import { useCatalogue } from "@/components/catalogue/CatalogueProvider";
import AvailabilityBadge from "@/components/availability/AvailabilityBadge";
import type { ShopAvailability } from "@/components/availability/useAvailability";
import type { BasketLine, CatalogueItem } from "@/lib/types";
import { useState } from "react";
import ProductDetails from "./ProductDetails";
import ProductPurchase from "./ProductPurchase";
import type { BoardPickerProps } from "@/components/wedding/BoardPicker";
import { imageDisclosure } from "@/lib/shopping";
import { productsForLook } from "@/lib/look-products";
import type { LookReport } from "@/lib/look";
import { formatGBP } from "@/lib/quote";
export default function LookProducts({
  boards,
  boardsBusy,
  onAddToBoard,
  onChangeDates,
  itemIds,
  wide = false,
  report,
  illustrative = false,
  styleId,
  ready,
  basket,
  onAdd,
  onRemove,
  onQty,
  onBrowse,
  savedIds,
  onSave,
  saving,
  savesLoaded,
  availability,
}: BoardPickerProps & {
  onChangeDates?: () => void;
  itemIds: string[];
  wide?: boolean;
  report?: LookReport;
  illustrative?: boolean;
  styleId?: string;
  ready: boolean;
  basket: BasketLine[];
  onAdd: (i: CatalogueItem) => void;
  onRemove: (id: string) => void;
  onQty: (id: string, n: number) => void;
  onBrowse: () => void;
  savedIds: string[];
  onSave: (id: string) => void;
  saving: Set<string>;
  savesLoaded: boolean;
  availability: ShopAvailability;
}) {
  const {
    getItem,
    items: catalogue,
    loading: catalogueLoading,
    error: catalogueError,
  } = useCatalogue();
  const [detailId, setDetailId] = useState<string | null>(null);
  const detail = detailId ? getItem(detailId) : undefined;
  const { items, suggested, missing } = productsForLook({
    catalogue,
    itemIds,
    report,
    illustrative,
    styleId,
  });
  return (
    <section
      aria-label="Products from this look"
      className="rounded-2xl border border-sand bg-white p-5 sm:p-7"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl">
            {suggested ? "Create this look" : "Pieces from this look"}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink/60">
            {suggested
              ? "Catalogue pieces to recreate this style, not exact items pictured."
              : "Catalogue references for your preview. Add your favourites to the basket."}
          </p>
        </div>
        <button
          type="button"
          onClick={onBrowse}
          className="rounded-full border border-sand px-4 py-2 text-sm"
        >
          Browse catalogue
        </button>
      </div>
      {!ready && (
        <p className="mt-5 rounded-xl bg-cream p-5 text-sm text-ink/60">
          Generate a look or open one from Saved looks to see its catalogue
          pieces here. Example images are for inspiration only.
        </p>
      )}
      {ready && (catalogueLoading || catalogueError) && (
        <p role="status" className="mt-5 text-sm text-clay">
          {catalogueLoading
            ? "Loading catalogue…"
            : "Catalogue unavailable. Retry loading to see linked pieces."}
        </p>
      )}
      {ready && !items.length && !catalogueLoading && !catalogueError && (
        <p className="mt-5 rounded-xl bg-cream p-5 text-sm text-ink/60">
          {suggested
            ? "No matching pieces are currently listed for this style. Browse the full catalogue for more ideas."
            : "This look has no currently listed product references. Generate a new look with catalogue pieces, or browse the full catalogue."}
        </p>
      )}
      {ready && missing > 0 && !catalogueLoading && !catalogueError && (
        <p className="mt-4 text-sm text-ink/60">
          {missing} linked {missing === 1 ? "piece is" : "pieces are"} no longer
          listed. Available pieces are shown below.
        </p>
      )}
      {ready && items.length > 0 && (
        <div
          className={`mt-5 grid gap-3 sm:grid-cols-2 ${wide ? "lg:grid-cols-3 xl:grid-cols-4" : "xl:grid-cols-3"}`}
        >
          {items.map((i) => {
            const line = basket.find((l) => l.itemId === i.id);
            return (
              <article
                key={i.id}
                className="relative flex flex-col overflow-hidden rounded-xl border border-sand"
              >
                {i.image ? (
                  <img
                    src={i.image}
                    alt={i.name}
                    className="aspect-[2/1] w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex aspect-[2/1] items-center justify-center bg-cream text-4xl">
                    {i.icon}
                  </div>
                )}
                <div className="flex flex-1 flex-col p-3">
                  <p className="mb-2 text-xs text-ink/60">
                    {imageDisclosure(i)}
                  </p>
                  <h3 className="font-serif text-xl">{i.name}</h3>
                  <button
                    type="button"
                    onClick={() => setDetailId(i.id)}
                    className="mt-2 min-h-11 text-left text-xs underline"
                  >
                    Details, terms and boards
                  </button>
                  <p className="mt-1 text-xs text-ink/60">{i.supplier}</p>
                  <p className="mt-2 text-base">
                    {formatGBP(i.unitPrice)}{" "}
                    <span className="text-xs text-ink/60">{i.unit}</span>
                  </p>
                  <div className="mt-3">
                    <AvailabilityBadge
                      availability={availability.items?.[i.id]}
                      madeToOrder={i.stock === "made_to_order"}
                    />
                  </div>
                  <ProductPurchase
                    item={i}
                    line={line}
                    availability={availability.items?.[i.id]}
                    onAdd={onAdd}
                    onQty={onQty}
                    onRemove={onRemove}
                    onChangeDates={onChangeDates}
                    onAlternatives={onBrowse}
                  />
                  <button
                    type="button"
                    aria-label={
                      savedIds.includes(i.id)
                        ? `Unsave ${i.name}`
                        : `Save ${i.name}`
                    }
                    aria-pressed={savedIds.includes(i.id)}
                    disabled={
                      catalogueLoading ||
                      !!catalogueError ||
                      !savesLoaded ||
                      saving.has(i.id)
                    }
                    onClick={() => onSave(i.id)}
                    className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full border border-sand bg-white text-lg shadow-sm disabled:opacity-50"
                  >
                    {saving.has(i.id)
                      ? "…"
                      : savedIds.includes(i.id)
                        ? "♥"
                        : "♡"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {detail && (
        <ProductDetails
          item={detail}
          line={basket.find((line) => line.itemId === detail.id)}
          availability={availability.items?.[detail.id]}
          onAdd={onAdd}
          onQty={onQty}
          onRemove={onRemove}
          onClose={() => setDetailId(null)}
          onChangeDates={
            onChangeDates
              ? () => {
                  setDetailId(null);
                  onChangeDates();
                }
              : undefined
          }
          onAlternatives={() => {
            setDetailId(null);
            onBrowse();
          }}
          boards={boards}
          boardsBusy={boardsBusy || catalogueLoading || !!catalogueError}
          onAddToBoard={onAddToBoard}
        />
      )}
    </section>
  );
}
