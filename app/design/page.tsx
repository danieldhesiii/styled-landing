"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { BasketLine, CatalogueItem } from "@/lib/types";
import { getStyle, getVenue } from "@/lib/styles";
import { suggestedQty, formatGBP } from "@/lib/quote";
import { type Brief } from "@/components/design/BriefStep";
import RenderStage, { type RenderRef } from "@/components/design/RenderStage";
import ProductBrowser from "@/components/design/ProductBrowser";
import BasketPanel from "@/components/design/BasketPanel";
import CheckoutStep from "@/components/design/CheckoutStep";
import HowItWorks from "@/components/design/HowItWorks";
import { useShopAvailability } from "@/components/availability/useAvailability";

type Step = "studio" | "checkout";

export default function DesignPage() {
  const [step, setStep] = useState<Step>("studio");
  const [studioTab, setStudioTab] = useState<"visualise" | "shop">("visualise");
  const [showHowTo, setShowHowTo] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [brief, setBrief] = useState<Brief>({
    venueId: "manor_orangery",
    uploadedImages: [],
    styleId: "garden_romance",
    guestCount: 80,
    weddingDate: "",
    budget: 6000,
  });
  const [basket, setBasket] = useState<BasketLine[]>([]);

  // Renders made for the current look (oldest first) and which one is showing.
  const [versions, setVersions] = useState<RenderRef[]>([]);
  const [renderId, setRenderId] = useState<string | null>(null);
  const currentRender = versions.find((v) => v.id === renderId) ?? null;

  function showRender(render: RenderRef | null) {
    if (!render) {
      setVersions([]);
      setRenderId(null);
      return;
    }
    setVersions((vs) => (vs.some((v) => v.id === render.id) ? vs : [...vs, render]));
    setRenderId(render.id);
  }

  // Availability per supplier for the couple's wedding date.
  const shopAvailability = useShopAvailability(brief.weddingDate, brief.guestCount);

  const venue = getVenue(brief.venueId);
  const style = getStyle(brief.styleId);

  const patchBrief = (patch: Partial<Brief>) => {
    // A render is only valid for the venue, photos and style it was made from.
    if (
      patch.venueId !== undefined ||
      patch.styleId !== undefined ||
      patch.uploadedImages !== undefined
    ) {
      showRender(null);
    }
    setBrief((b) => ({ ...b, ...patch }));
  };

  function addItem(item: CatalogueItem) {
    setBasket((b) => {
      if (b.some((l) => l.itemId === item.id)) return b;
      return [...b, { itemId: item.id, quantity: suggestedQty(item, brief.guestCount) }];
    });
  }
  function removeItem(itemId: string) {
    setBasket((b) => b.filter((l) => l.itemId !== itemId));
  }
  function setQty(itemId: string, quantity: number) {
    setBasket((b) => b.map((l) => (l.itemId === itemId ? { ...l, quantity } : l)));
  }

  const headerVenue = useMemo(
    () => ({ ...venue, image: brief.uploadedImages[0] ?? venue.image }),
    [venue, brief.uploadedImages]
  );

  return (
    <div className="min-h-screen bg-cream">
      {/* Slim app header */}
      <header className="sticky top-0 z-30 border-b border-sand bg-cream/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3">
          <Link href="/" className="font-serif text-xl tracking-wide text-ink">
            Styled<span className="text-clay">.</span>
          </Link>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => { setShowHowTo(true); setShowSettings(false); }}
              className="flex items-center gap-1.5 rounded-full border border-sand px-4 py-1.5 text-xs text-ink/50 hover:border-clay/50 hover:text-ink transition-colors"
            >
              <span className="text-[11px]">?</span> How it works
            </button>
            {step === "checkout" && (
              <button
                type="button"
                onClick={() => setStep("studio")}
                className="text-xs text-ink/50 hover:text-ink transition-colors"
              >
                ← Back to design
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5">
        {step === "studio" && (
          <div className="py-6">
            {/* Settings bar — guests, budget, date */}
            <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-sand bg-white px-5 py-3 shadow-sm">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-ink/40">Guests</span>
                <span className="font-medium text-ink">{brief.guestCount}</span>
              </div>
              <span className="h-4 w-px bg-sand" />
              <div className="flex items-center gap-2 text-sm">
                <span className="text-ink/40">Budget</span>
                <span className="font-medium text-ink">{formatGBP(brief.budget)}</span>
              </div>
              {brief.weddingDate && (
                <>
                  <span className="h-4 w-px bg-sand" />
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-ink/40">Date</span>
                    <span className="font-medium text-ink">
                      {new Date(brief.weddingDate).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </>
              )}
              <button
                type="button"
                onClick={() => setShowSettings((s) => !s)}
                className="ml-auto rounded-full border border-sand px-4 py-1.5 text-xs text-ink/50 hover:border-clay/50 hover:text-ink transition-colors"
              >
                {showSettings ? "Done" : "Edit"}
              </button>
            </div>

            {/* Inline settings editor */}
            {showSettings && (
              <div className="mb-5 grid gap-5 rounded-2xl border border-sand bg-white px-6 py-5 shadow-sm sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs text-ink/50">Guests</label>
                  <input
                    type="number"
                    min={10}
                    max={500}
                    value={brief.guestCount}
                    onChange={(e) => patchBrief({ guestCount: Number(e.target.value) })}
                    className="w-full rounded-xl border border-sand bg-cream/50 px-4 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-clay/30"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-ink/50">
                    Budget — {formatGBP(brief.budget)}
                  </label>
                  <input
                    type="range"
                    min={1000}
                    max={30000}
                    step={500}
                    value={brief.budget}
                    onChange={(e) => patchBrief({ budget: Number(e.target.value) })}
                    className="mt-2 w-full accent-clay"
                  />
                  <div className="mt-1 flex justify-between text-[11px] text-ink/35">
                    <span>£1k</span>
                    <span>£30k</span>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-ink/50">Wedding date</label>
                  <input
                    type="date"
                    value={brief.weddingDate}
                    onChange={(e) => patchBrief({ weddingDate: e.target.value })}
                    className="w-full rounded-xl border border-sand bg-cream/50 px-4 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-clay/30"
                  />
                </div>
              </div>
            )}

            {/* Studio tab switcher */}
            <div className="mb-5 flex items-center gap-1 border-b border-sand pb-4">
              <button
                type="button"
                onClick={() => setStudioTab("visualise")}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                  studioTab === "visualise"
                    ? "bg-ink text-cream"
                    : "text-ink/50 hover:text-ink"
                }`}
              >
                Visualise
              </button>
              <button
                type="button"
                onClick={() => setStudioTab("shop")}
                className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                  studioTab === "shop"
                    ? "bg-ink text-cream"
                    : "text-ink/50 hover:text-ink"
                }`}
              >
                Shop the look
                {basket.length > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-clay text-[10px] text-cream">
                    {basket.length}
                  </span>
                )}
              </button>
              <span className="ml-auto text-xs text-ink/35">
                {studioTab === "visualise"
                  ? "Generate and style your venue"
                  : "Browse and add items to your quote"}
              </span>
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
              <div className="min-w-0">
                {studioTab === "visualise" && (
                  <RenderStage
                    venue={headerVenue}
                    uploadedImages={brief.uploadedImages}
                    style={style}
                    renderUrl={currentRender?.url ?? null}
                    renderId={renderId}
                    versions={versions}
                    itemIds={basket.map((l) => l.itemId)}
                    guestCount={brief.guestCount}
                    onRender={showRender}
                    onStyle={(id) => patchBrief({ styleId: id })}
                    onAddAngle={(url) =>
                      setBrief((b) => ({ ...b, uploadedImages: [...b.uploadedImages, url] }))
                    }
                  />
                )}
                {studioTab === "shop" && (
                  <div className="overflow-hidden rounded-3xl border border-sand bg-white shadow-sm">
                    <ProductBrowser
                      styleId={brief.styleId}
                      basket={basket}
                      weddingDate={brief.weddingDate}
                      availability={shopAvailability}
                      onWeddingDate={(d) => patchBrief({ weddingDate: d })}
                      onAdd={addItem}
                      onRemove={removeItem}
                    />
                  </div>
                )}
              </div>

              {/* Sticky basket — visible on both tabs */}
              <div className="lg:sticky lg:top-20">
                <div className="overflow-hidden rounded-3xl border border-sand bg-white shadow-sm lg:h-[calc(100vh-6rem)]">
                  <BasketPanel
                    basket={basket}
                    guestCount={brief.guestCount}
                    budget={brief.budget}
                    weddingDate={brief.weddingDate}
                    onQty={setQty}
                    onRemove={removeItem}
                    onCheckout={() => setStep("checkout")}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === "checkout" && (
          <CheckoutStep
            basket={basket}
            weddingDate={brief.weddingDate}
            onWeddingDate={(d) => patchBrief({ weddingDate: d })}
            styleId={brief.styleId}
            guestCount={brief.guestCount}
            venueLabel={venue.name}
            onBack={() => setStep("studio")}
            onOrdered={() => setBasket([])}
          />
        )}
      </main>

      {/* How it works drawer */}
      {showHowTo && <HowItWorks onClose={() => setShowHowTo(false)} />}
    </div>
  );
}
