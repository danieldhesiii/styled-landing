"use client";
import {canRequestItem} from "@/lib/shopping";
import useOutsideClick from "@/components/ui/useOutsideClick";
import { supplierProfileId } from "@/lib/supplier-profile";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { formatGBP } from "@/lib/quote";
import { imageDisclosure, reviewDisclosure } from "@/lib/shopping";
import { availabilityLabel } from "@/lib/availability";
import { oneDayDemoTotal } from "@/lib/demo-pricing";
import type { BoardPickerProps } from "@/components/wedding/BoardPicker";
import ProductPreviewSelection from "./ProductPreviewSelection";
import ProductPurchase, { ProductCharges, type ProductPurchaseProps } from "./ProductPurchase";

type Props = Omit<ProductPurchaseProps, "onAdd"> & BoardPickerProps & {
  onAdd?: ProductPurchaseProps["onAdd"];
  onClose?: () => void;
  presentation?: "dialog" | "page";
  browseHref?: string;
  studioHref?: string;
  datesLabel?: string;
  onVisualise?: (item: ProductPurchaseProps["item"]) => void;
  selectedVisualiserIds?: string[];
};

/** The same product information for public pages and event-aware studio details. */
export default function ProductDetails({
  onClose,
  presentation = "dialog",
  browseHref = "/design?tab=catalogue",
  studioHref,
  datesLabel,
  onVisualise,
  selectedVisualiserIds = [],
  boards: _boards,
  boardsBusy: _boardsBusy,
  onAddToBoard: _onAddToBoard,
  ...purchase
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { item, availability } = purchase;
  const page = presentation === "page";
  const article = useOutsideClick<HTMLElement>(page && !!onClose, () => onClose?.());
  const studioAddParams = new URLSearchParams(studioHref?.split("?")[1]);
  if (item.requestOnly) studioAddParams.set("add", item.id);
  const studioAddHref = studioHref && item.requestOnly ? `/design?${studioAddParams}` : studioHref;
  useEffect(() => {
    if (page) return;
    const el = dialog.current;
    el?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      el?.close();
      document.body.style.overflow = previous;
    };
  }, [page]);
  const facts = [
    ["Dimensions", item.dimensions],
    ["Material", item.material],
    ["Price unit", item.unit],
    ["Hire quantity / package contents", item.hireUnits],
    ["Booking lead time", item.leadTimeDays > 0 ? `${item.leadTimeDays} days' notice listed` : undefined],
    ["Delivery and collection terms", item.deliveryTerms],
    ["Damage terms", item.damageTerms],
  ];
  const content = (
    <>
      <nav aria-label="Product navigation" className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm">
        {onClose ? (
          <button type="button" onClick={onClose} className="min-h-11 underline underline-offset-4">
            {page ? "← Back to catalogue" : "Close details ×"}
          </button>
        ) : <Link href={browseHref} className="inline-flex min-h-11 items-center underline underline-offset-4">← Back to catalogue</Link>}
        {onClose && page && <Link href={`/products/${encodeURIComponent(item.id)}?returnTo=${encodeURIComponent(browseHref)}`} className="inline-flex min-h-11 items-center underline underline-offset-4">Public product page</Link>}
      </nav>
      <div className={page ? "grid min-w-0 gap-6 lg:grid-cols-2 lg:gap-10" : ""}>
        <div className="min-w-0">
          {item.image ? (
            <img src={item.image} alt={item.name} className="aspect-[4/3] w-full rounded-xl bg-white object-contain p-4 transition-transform duration-500 motion-reduce:transition-none hover:scale-[1.015]" />
          ) : (
            <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 rounded-xl bg-sand/30 text-ink/60">
              <span aria-hidden="true" className="text-4xl">{item.icon}</span>
              <p className="text-sm">Photo not supplied</p>
            </div>
          )}
          {item.gallery && <div className="mt-3 grid grid-cols-2 gap-3">
            {item.gallery.map(photo => <a key={photo.src} href={photo.src} target="_blank" rel="noreferrer" aria-label={photo.alt + ", open full photo"}>
              <img src={photo.src} alt={photo.alt} loading="lazy" className="aspect-[4/3] w-full rounded-lg object-contain bg-cream" />
            </a>)}
          </div>}
          <details className="mt-2 text-sm text-ink/60">
            <summary className="inline-flex min-h-11 cursor-pointer items-center underline underline-offset-4">Image information</summary>
            <p>{imageDisclosure(item)}</p>
            <p className="mt-1">AI previews are illustrative; confirm appearance with the supplier.</p>
          </details>
        </div>
        <div className="min-w-0 break-words">
          {page ? <h1 className="font-serif text-3xl sm:text-4xl">{item.name}</h1> : <h2 className="mt-5 font-serif text-3xl">{item.name}</h2>}
          <p className="mt-3 text-sm">
            {supplierProfileId(item) ? <Link href={`/suppliers/${supplierProfileId(item)}`} className="inline-flex min-h-11 items-center text-clay underline underline-offset-4">{item.supplier}</Link> : item.supplier}
          </p>
          {item.supplierId && /^[0-9a-f-]{36}$/i.test(item.supplierId) && <Link href={`/messages?supplier=${item.supplierId}`} className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">Message supplier</Link>}
          <p className="text-sm text-ink/60">{item.supplierArea || "Service area not supplied"}</p>
          {item.packageDetails && <div className="mt-5 divide-y divide-sand">
            {item.packageDetails.map(section => <details key={section.title} className="py-3">
              <summary className="cursor-pointer py-1 text-sm font-medium">{section.title}</summary>
              <p className="pt-2 text-sm leading-relaxed text-ink/70">{section.text}</p>
            </details>)}
          </div>}
          <p className="mt-4 text-xl">
            {item.priceOnRequest ? "Price on request" : item.demoOnly ? `One-day estimate ${formatGBP(oneDayDemoTotal(item) ?? 0)}` : <>{formatGBP(item.unitPrice)} <span className="text-sm">{item.unit}</span></>}
          </p>
          {!item.demoOnly && <p className="mt-2 text-xs text-ink/60">Delivery and deposit quoted by supplier.</p>}
          {item.note && <p className="mt-4 whitespace-pre-line text-sm leading-relaxed">{item.note}</p>}
          <div className="mt-5 border-y border-sand py-3 text-sm">
            <p>{datesLabel || "Choose your event and hire dates in Wedding plan."}</p>
            <p className="mt-2 text-clay">{item.requestOnly || item.demoOnly ? "Availability and final quote on request." : availability ? availabilityLabel(availability).label : "Date availability has not been checked."}</p>
            <Link href="/design?tab=wedding" className="mt-1 inline-flex min-h-11 items-center underline underline-offset-4">Open Wedding plan</Link>
          </div>
          {purchase.onAdd ? <ProductPurchase {...purchase} onAdd={purchase.onAdd} /> : studioHref && (
            <Link href={studioAddHref!} className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-ink px-5 py-3 text-center text-sm text-cream hover:bg-ink/90">{canRequestItem(item)?"Add to basket":"View in studio"}</Link>
          )}
          {!purchase.onAdd && item.demoOnly && <ProductCharges item={item} />}
          <div className="mt-3 border-t border-sand pt-3">
            <ProductPreviewSelection item={item} selectedVisualiserIds={selectedVisualiserIds} onVisualise={onVisualise} studioHref={studioHref || browseHref} />
          </div>
          <p className="mt-4 text-xs text-ink/60">Supplier confirmation required. No payment is taken.</p>
        </div>
      </div>
      <section aria-label="Product details and supplier terms" className="mt-8">
        <h2 className="font-serif text-2xl">Details and supplier terms</h2>
        <dl className="mt-4 divide-y divide-sand border-y border-sand">
          {facts.filter(([, value]) => value?.trim()).map(([label, value]) => (
            <div key={label} className="grid gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-5">
              <dt className="text-sm text-ink/60">{label}</dt>
              <dd className="break-words text-sm">{value}</dd>
            </div>
          ))}
        </dl>
        {facts.some(([, value]) => !value?.trim()) && <p className="mt-3 text-sm text-ink/60">Ask supplier for missing specifications.</p>}
        {item.reviewsVerified && item.reviewCount > 0 && Number.isFinite(item.rating) && <p className="mt-3 text-sm text-ink/60">{reviewDisclosure(item)}</p>}
      </section>
    </>
  );
  if (page) return <article ref={article} key={item.id} className="studio-page-enter min-w-0 text-ink">{content}</article>;
  return (
    <dialog {...{ closedby: "any" }} ref={dialog} onCancel={onClose} aria-label={`${item.name} details`} className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-[calc(100%_-_1.5rem)] max-w-xl overflow-auto border-l border-sand bg-cream p-5 text-ink backdrop:bg-ink/50 sm:p-8">
      {content}
    </dialog>
  );
}
