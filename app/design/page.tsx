"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { BasketLine, CatalogueItem } from "@/lib/types";
import { getStyle, getVenue } from "@/lib/styles";
import { suggestedQty } from "@/lib/quote";
import BriefStep, { type Brief } from "@/components/design/BriefStep";
import RenderStage from "@/components/design/RenderStage";
import ProductBrowser from "@/components/design/ProductBrowser";
import BasketPanel from "@/components/design/BasketPanel";
import CheckoutStep from "@/components/design/CheckoutStep";

type Step = "brief" | "studio" | "checkout";

export default function DesignPage() {
  const [step, setStep] = useState<Step>("brief");
  const [studioTab, setStudioTab] = useState<"visualise" | "shop">("visualise");
  const [brief, setBrief] = useState<Brief>({
    venueId: "manor_orangery",
    uploadedImages: [],
    styleId: "garden_romance",
    guestCount: 80,
    weddingDate: "",
    budget: 6000,
  });
  const [basket, setBasket] = useState<BasketLine[]>([]);

  const venue = getVenue(brief.venueId);
  const style = getStyle(brief.styleId);

  const patchBrief = (patch: Partial<Brief>) => setBrief((b) => ({ ...b, ...patch }));

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
          <div className="flex items-center gap-4 text-xs text-ink/50">
            <StepDot label="Brief" active={step === "brief"} done={step !== "brief"} />
            <span className="h-px w-5 bg-sand" />
            <StepDot label="Design" active={step === "studio"} done={step === "checkout"} />
            <span className="h-px w-5 bg-sand" />
            <StepDot label="Reserve" active={step === "checkout"} done={false} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5">
        {step === "brief" && (
          <BriefStep brief={brief} onChange={patchBrief} onStart={() => setStep("studio")} />
        )}

        {step === "studio" && (
          <div className="py-6">
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
                    renderUrl={null}
                    onStyle={(id) => patchBrief({ styleId: id })}
                    onAddAngle={(dataUrl) =>
                      patchBrief({ uploadedImages: [...brief.uploadedImages, dataUrl] })
                    }
                  />
                )}
                {studioTab === "shop" && (
                  <div className="overflow-hidden rounded-3xl border border-sand bg-white shadow-sm">
                    <ProductBrowser
                      styleId={brief.styleId}
                      basket={basket}
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
            onBack={() => setStep("studio")}
          />
        )}
      </main>
    </div>
  );
}

function StepDot({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <span
      className={`flex items-center gap-1.5 ${
        active ? "text-ink" : done ? "text-sage" : "text-ink/40"
      }`}
    >
      <span
        className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] ${
          active ? "bg-ink text-cream" : done ? "bg-sage text-cream" : "border border-sand"
        }`}
      >
        {done ? "✓" : ""}
      </span>
      {label}
    </span>
  );
}
