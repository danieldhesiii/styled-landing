"use client";
import { useCatalogue } from "@/components/catalogue/CatalogueProvider";
import AvailabilityBadge from "@/components/availability/AvailabilityBadge";
import type { ShopAvailability } from "@/components/availability/useAvailability";
import type { BasketLine, CatalogueItem } from "@/lib/types";
import { formatGBP } from "@/lib/quote";
export default function LookProducts({
  itemIds,
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
}: {
  itemIds: string[];
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
  const { getItem } = useCatalogue();
  const items = [...new Set(itemIds)].flatMap((id) => {
    const i = getItem(id);
    return i ? [i] : [];
  });
  return (
    <section
      aria-label="Products from this look"
      className="border-t border-sand bg-white p-5 sm:p-7"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl">Pieces from this look</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink/60">
            Explore the real catalogue pieces used to create this preview. Add
            them here without leaving the visualiser. The image is illustrative;
            exact details and availability need supplier confirmation.
          </p>
        </div>
        <button
          type="button"
          onClick={onBrowse}
          className="rounded-full border border-sand px-4 py-2 text-sm"
        >
          Browse the full catalogue →
        </button>
      </div>
      {!ready && (
        <p className="mt-5 rounded-xl bg-cream p-5 text-sm text-ink/60">
          Generate a look or open one from Saved looks to see its catalogue
          pieces here. Example images are for inspiration only.
        </p>
      )}
      {ready && !items.length && (
        <p className="mt-5 rounded-xl bg-cream p-5 text-sm text-ink/60">
          There are no currently listed catalogue pieces linked to this look.
          You can still browse the full catalogue.
        </p>
      )}
      {ready && items.length > 0 && (
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {items.map((i) => {
            const line = basket.find((l) => l.itemId === i.id);
            return (
              <article
                key={i.id}
                className="overflow-hidden rounded-xl border border-sand"
              >
                {i.image ? (
                  <img
                    src={i.image}
                    alt={i.name}
                    className="aspect-[16/10] w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex aspect-[16/10] items-center justify-center bg-cream text-4xl">
                    {i.icon}
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-serif text-2xl">{i.name}</h3>
                  <p className="mt-1 text-xs text-ink/60">{i.supplier}</p>
                  <p className="mt-3 text-lg">
                    {formatGBP(i.unitPrice)}{" "}
                    <span className="text-xs text-ink/60">{i.unit}</span>
                  </p>
                  <div className="mt-3">
                    <AvailabilityBadge
                      availability={availability.items?.[i.id]}
                      madeToOrder={i.stock === "made_to_order"}
                    />
                  </div>
                  <p className="mt-2 text-xs text-ink/50">
                    Availability is confirmed manually before booking.
                  </p>
                  {line ? (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <label className="text-xs">
                        Basket quantity
                        <input
                          type="number"
                          min={1}
                          max={10000}
                          value={line.quantity}
                          aria-label={`Quantity of ${i.name} in this look`}
                          onChange={(e) => {
                            const n = Number(e.target.value);
                            if (Number.isInteger(n) && n > 0 && n <= 10000)
                              onQty(i.id, n);
                          }}
                          className="ml-2 w-16 rounded-lg border border-sand p-2"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => onRemove(i.id)}
                        className="text-xs underline"
                      >
                        Remove from basket
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onAdd(i)}
                      className="mt-4 w-full rounded-full bg-ink px-4 py-2.5 text-sm text-cream"
                    >
                      Add to basket
                    </button>
                  )}
                  <button
                    type="button"
                    aria-pressed={savedIds.includes(i.id)}
                    disabled={!savesLoaded || saving.has(i.id)}
                    onClick={() => onSave(i.id)}
                    className="mt-3 w-full rounded-full border border-sand px-4 py-2 text-sm disabled:opacity-50"
                  >
                    {saving.has(i.id)
                      ? "Saving…"
                      : savedIds.includes(i.id)
                        ? "♥ Saved"
                        : "♡ Save item"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
