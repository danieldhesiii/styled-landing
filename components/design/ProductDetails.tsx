"use client";
import { useEffect, useRef } from "react";
import { formatGBP } from "@/lib/quote";
import { imageDisclosure, reviewDisclosure } from "@/lib/shopping";
import { availabilityLabel } from "@/lib/availability";
import BoardPicker, {
  type BoardPickerProps,
} from "@/components/wedding/BoardPicker";
import ProductPurchase, { type ProductPurchaseProps } from "./ProductPurchase";

export default function ProductDetails({
  onClose,
  boards,
  boardsBusy,
  onAddToBoard,
  ...purchase
}: ProductPurchaseProps & BoardPickerProps & { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { item, availability } = purchase;
  useEffect(() => {
    const el = dialog.current;
    el?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      el?.close();
      document.body.style.overflow = previous;
    };
  }, []);
  const facts = [
    ["Dimensions", item.dimensions],
    ["Material", item.material],
    ["Price unit", item.unit],
    ["Hire quantity / package contents", item.hireUnits],
    [
      "Booking lead time",
      item.leadTimeDays > 0
        ? `${item.leadTimeDays} days' notice listed`
        : undefined,
    ],
    ["Delivery and collection terms", item.deliveryTerms],
    ["Damage terms", item.damageTerms],
  ];
  return (
    <dialog
      ref={dialog}
      onCancel={onClose}
      aria-label={`${item.name} details`}
      className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-full max-w-xl overflow-auto border-l border-sand bg-cream p-5 text-ink backdrop:bg-ink/50 sm:p-8"
    >
      <button
        type="button"
        onClick={onClose}
        className="mb-5 min-h-11 rounded-full border border-sand px-4 text-sm"
      >
        Close details ×
      </button>
      {item.image && (
        <img
          src={item.image}
          alt={item.name}
          className="aspect-[4/3] w-full rounded-xl object-cover"
        />
      )}
      <p className="mt-2 text-xs text-ink/60">{imageDisclosure(item)}</p>
      <h2 className="mt-5 font-serif text-3xl">{item.name}</h2>
      <p className="mt-2 text-sm">
        {item.supplier} · {item.supplierArea}
      </p>
      <p className="mt-3 text-xl">
        {formatGBP(item.unitPrice)} <span className="text-sm">{item.unit}</span>
      </p>
      <p className="mt-2 text-xs text-ink/60">{reviewDisclosure(item)}</p>
      {item.note && <p className="mt-4 text-sm leading-relaxed">{item.note}</p>}
      <p className="mt-4 text-sm text-clay">
        {availability
          ? availabilityLabel(availability).label
          : "Date availability has not been checked."}
      </p>
      <dl className="mt-5 divide-y divide-sand border-y border-sand">
        {facts.map(([label, value]) => (
          <div key={label} className="py-3">
            <dt className="text-xs text-ink/60">{label}</dt>
            <dd className="mt-1 text-sm">
              {value?.trim() ||
                "Not supplied. Ask the supplier before booking."}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-ink/60">
        Adding to a basket or board does not reserve stock. Final prices, terms
        and availability need supplier confirmation.
      </p>
      <ProductPurchase {...purchase} />
      <BoardPicker
        boards={boards}
        boardsBusy={boardsBusy}
        onAddToBoard={onAddToBoard}
        target={{ kind: "product", ref: item.id }}
      />
    </dialog>
  );
}
