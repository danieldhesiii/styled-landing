"use client";
import { useCatalogue } from "@/components/catalogue/CatalogueProvider";
import AvailabilityBadge from "@/components/availability/AvailabilityBadge";
import type { ShopAvailability } from "@/components/availability/useAvailability";
import type { BasketLine, CatalogueItem } from "@/lib/types";
import { useState, useEffect } from "react";
import ProductDetails from "./ProductDetails";
import ProductPurchase from "./ProductPurchase";
import type { BoardPickerProps } from "@/components/wedding/BoardPicker";
import { productsForLook } from "@/lib/look-products";
import type { LookReport } from "@/lib/look";
import {oneDayDemoTotal} from "@/lib/demo-pricing";
import { formatGBP } from "@/lib/quote";
export default function LookProducts({
  openProductId,
  onCloseProduct,
  onChangeDates,
  itemIds,
  selectedIds,
  selectedVisualiserIds,
  onVisualise,
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
  openProductId?:string|null;
  onCloseProduct?:()=>void;
  onChangeDates?: () => void;
  itemIds: string[];
  selectedIds?: string[];
  selectedVisualiserIds?: string[];
  onVisualise?: (item: CatalogueItem) => void;
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
    getItem,scope,
    items: catalogue,
    loading: catalogueLoading,
    error: catalogueError,
  } = useCatalogue();
  const [detailId, setDetailId] = useState<string | null>(null);
  useEffect(()=>{if(openProductId)setDetailId(openProductId);},[openProductId]);
  const detail = detailId ? getItem(detailId) : undefined;
  const previewIds = selectedVisualiserIds ?? selectedIds ?? [];
  const { items, suggested, missing } = productsForLook({
    catalogue,
    itemIds: ready ? itemIds : previewIds,
    report: ready ? report : undefined,
    illustrative: ready && illustrative,
    styleId,
  });
  const hasSelections = previewIds.length > 0;
  const showProducts = ready || hasSelections;
  if(scope?.policy.mode==="venue_only") return <section className="rounded-2xl border border-sand bg-white p-5"><h2 className="font-serif text-2xl">Plan the details with your venue</h2><p className="mt-3 text-sm text-ink/65">{scope.name} coordinates its own supplier network, so Styled catalogue products are not recommended for this venue.</p><a href={`/venues/${scope.slug}#suppliers`} className="mt-4 inline-flex min-h-11 items-center text-sm underline">View the venue’s recommended suppliers →</a></section>;
  return (
    <section
      aria-label={ready ? "Products from this look" : "Selected products"}
      className="rounded-3xl border border-sand/80 bg-white p-5 motion-reduce:[&_*]:transition-none sm:p-7"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl tracking-tight">
            {!ready ? "Selected products" : suggested ? "Create this look" : "Product references"}
          </h2>
          {suggested && <p className="mt-2 text-sm text-ink/60">Suggested products</p>}
        </div>
        <button
          type="button"
          onClick={onBrowse}
          className="min-h-11 rounded-full border border-sand/80 px-4 py-2 text-sm transition-colors hover:border-clay/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/50 motion-reduce:transition-none"
        >
          Browse catalogue
        </button>
      </div>
      {!ready && !items.length && (
        <p className="mt-5 rounded-xl bg-cream p-5 text-sm text-ink/60">
          Choose catalogue products to include in your preview, or explore a general style.
        </p>
      )}
      {showProducts && (catalogueLoading || catalogueError) && (
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
      {showProducts && missing > 0 && !catalogueLoading && !catalogueError && (
        <p className="mt-4 text-sm text-ink/60">
          {missing} linked {missing === 1 ? "piece is" : "pieces are"} no longer
          listed. Available pieces are shown below.
        </p>
      )}
      {showProducts && items.length > 0 && (
        <div
          className={`mt-5 grid gap-3 min-[360px]:grid-cols-2 ${wide && items.length>3 ? "lg:grid-cols-3 xl:grid-cols-4" : "xl:grid-cols-3"}`}
        >
          {items.map((i) => {
            const line = basket.find((l) => l.itemId === i.id);
            return (
              <article
                key={i.id}
                className="group relative flex min-w-0 flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-sand/80 transition-shadow duration-300 hover:shadow-[0_6px_24px_rgba(43,38,34,0.04)] motion-reduce:transition-none"
              >
                {i.image ? (
                  <button type="button" onClick={()=>setDetailId(i.id)} aria-label={`View ${i.name}`} className="block w-full text-left">
                  <img
                    src={i.image}
                    alt={i.name}
                    className={`aspect-[4/3] w-full bg-cream/60 transition-transform duration-500 motion-reduce:transition-none ${i.demoOnly ? "object-contain p-6" : "object-cover motion-safe:group-hover:scale-[1.025]"}`}
                    loading="lazy"
                  /></button>
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center bg-cream text-4xl">
                    {i.icon}
                  </div>
                )}
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="line-clamp-2 font-serif text-base leading-snug sm:line-clamp-none sm:text-xl"><button type="button" onClick={()=>setDetailId(i.id)} className="text-left hover:underline">{i.name}</button></h3>
                  <button
                    type="button"
                    onClick={() => setDetailId(i.id)}
                    className="mt-2 min-h-11 text-left text-xs underline"
                  >
                    Details and terms
                  </button>
                  <p className="mt-1 text-xs text-ink/60">{i.supplier}</p>
                  <p className="mt-2 text-base">
                    {i.priceOnRequest ? "Price on request" : i.demoOnly ? `One-day total ${formatGBP(oneDayDemoTotal(i)??0)}` : <>{formatGBP(i.unitPrice)}{" "}<span className="text-xs text-ink/60">{i.unit}</span></>}
                  </p>
                  <div className="mt-3">
                    {!i.demoOnly && !i.requestOnly && <AvailabilityBadge availability={availability.items?.[i.id]} madeToOrder={i.stock === "made_to_order"}/>}
                    {i.dimensions&&<p className="mt-2 text-xs text-ink/60">{i.dimensions}</p>}
                  </div>
                  <ProductPurchase
                    compact
                    item={i}
                    line={line}
                    availability={availability.items?.[i.id]}
                    onAdd={onAdd}
                    onQty={onQty}
                    onRemove={onRemove}
                    onChangeDates={onChangeDates}
                    onAlternatives={onBrowse}
                  />
                  {!i.demoOnly && <button
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
                  </button>}
                </div>
              </article>
            );
          })}
        </div>
      )}
      {detail && (
        <ProductDetails
          item={detail}
          selectedVisualiserIds={previewIds}
          onVisualise={onVisualise}
          line={basket.find((line) => line.itemId === detail.id)}
          availability={availability.items?.[detail.id]}
          onAdd={onAdd}
          onQty={onQty}
          onRemove={onRemove}
          onClose={() => {setDetailId(null);onCloseProduct?.();}}
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
        />
      )}
    </section>
  );
}
