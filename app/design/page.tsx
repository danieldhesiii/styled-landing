"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { BasketLine, CatalogueItem } from "@/lib/types";
import { getStyle, getVenue } from "@/lib/styles";
import { suggestedQty, formatGBP } from "@/lib/quote";
import { type Brief } from "@/components/design/BriefStep";
import RenderStage, { type RenderRef } from "@/components/design/RenderStage";
import ProductBrowser from "@/components/design/ProductBrowser";
import BasketPanel from "@/components/design/BasketPanel";
import CheckoutStep from "@/components/design/CheckoutStep";
import HowItWorks from "@/components/design/HowItWorks";
import SavedLooks, { type SavedLook } from "@/components/design/SavedLooks";
import { useShopAvailability } from "@/components/availability/useAvailability";

type Step = "studio" | "checkout";

export default function DesignPage() {
  const [step, setStep] = useState<Step>("studio");
  const [showHowTo, setShowHowTo] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [savedLooks, setSavedLooks] = useState<SavedLook[]>([]);

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
  const [shopLookSignal, setShopLookSignal] = useState(0);
  const [restored, setRestored] = useState(false);
  const productBrowserRef = useRef<HTMLDivElement>(null);
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

  // Remove a version from the strip. If it was the one on show, fall back to the
  // most recent remaining version (or clear the stage if none are left).
  function deleteVersion(id: string) {
    setVersions((vs) => {
      const next = vs.filter((v) => v.id !== id);
      if (renderId === id) setRenderId(next.length ? next[next.length - 1].id : null);
      return next;
    });
  }

  // Restore the whole design on mount (brief, basket, render) so nothing is lost
  // when the couple navigates away and comes back. The render's signed URL is
  // re-fetched fresh by id, since signed URLs expire.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("styled:design");
      if (raw) {
        const saved = JSON.parse(raw) as {
          brief?: Partial<Brief>;
          basket?: BasketLine[];
          renderId?: string | null;
        };
        if (saved.brief) setBrief((b) => ({ ...b, ...saved.brief }));
        if (Array.isArray(saved.basket)) setBasket(saved.basket);
        if (saved.renderId) {
          fetch(`/api/renders/${saved.renderId}`)
            .then((r) => r.json())
            .then((data) => {
              if (data.status === "succeeded" && data.imageUrl && saved.renderId) {
                setVersions([{ id: saved.renderId, url: data.imageUrl, itemIds: data.itemIds }]);
                setRenderId(saved.renderId);
              }
            })
            .catch(() => {});
        }
      }
    } catch {
      // Corrupt saved state — start fresh.
    }
    setRestored(true);
  }, []);

  // Persist the design whenever it changes (once the initial restore has run,
  // so we never overwrite saved state with defaults).
  useEffect(() => {
    if (!restored) return;
    try {
      localStorage.setItem("styled:design", JSON.stringify({ brief, basket, renderId }));
    } catch {
      // Storage full or unavailable — non-fatal.
    }
  }, [brief, basket, renderId, restored]);

  // Saved looks (favourites) live in the database under the couple's Supabase
  // user (guest or account), so they persist and follow them across devices once
  // they create an account. RLS keeps each couple to their own rows.
  const supabase = useMemo(() => createClient(), []);

  const refreshSavedLooks = useCallback(async () => {
    const { data } = await supabase
      .from("saved_looks")
      .select("render_id, style_id, style_name, original_url, created_at")
      .order("created_at", { ascending: false });
    if (data) {
      setSavedLooks(
        data.map((r) => ({
          id: r.render_id as string,
          styleId: (r.style_id as string) ?? "none",
          styleName: (r.style_name as string) ?? "Your design",
          originalUrl: (r.original_url as string) ?? undefined,
          savedAt: Date.parse(r.created_at as string) || Date.now(),
        }))
      );
    }
  }, [supabase]);

  // Load saved looks once a session exists, migrating anything an earlier version
  // kept in localStorage into the account the first time.
  useEffect(() => {
    const sync = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      try {
        const raw = localStorage.getItem("styled:savedLooks");
        if (raw) {
          const old = JSON.parse(raw) as SavedLook[];
          if (Array.isArray(old) && old.length) {
            await supabase.from("saved_looks").upsert(
              old.map((l) => ({
                owner_id: user.id,
                render_id: l.id,
                style_id: l.styleId,
                style_name: l.styleName,
                original_url: l.originalUrl ?? null,
              })),
              { onConflict: "owner_id,render_id", ignoreDuplicates: true }
            );
          }
          localStorage.removeItem("styled:savedLooks");
        }
      } catch {
        // Corrupt legacy state — ignore.
      }
      await refreshSavedLooks();
    };
    sync();
    const { data: sub } = supabase.auth.onAuthStateChange(() => sync());
    return () => sub.subscription.unsubscribe();
  }, [supabase, refreshSavedLooks]);

  const isCurrentSaved = renderId !== null && savedLooks.some((l) => l.id === renderId);

  async function toggleSaveCurrent() {
    if (!renderId) return;
    if (savedLooks.some((l) => l.id === renderId)) {
      setSavedLooks((looks) => looks.filter((l) => l.id !== renderId));
      await supabase.from("saved_looks").delete().eq("render_id", renderId);
    } else {
      setSavedLooks((looks) => [
        { id: renderId, styleId: brief.styleId, styleName, originalUrl: originalImage ?? undefined, savedAt: Date.now() },
        ...looks,
      ]);
      await supabase.from("saved_looks").insert({
        render_id: renderId,
        style_id: brief.styleId,
        style_name: styleName,
        original_url: originalImage ?? null,
      });
    }
  }

  async function unsaveLook(id: string) {
    setSavedLooks((looks) => looks.filter((l) => l.id !== id));
    await supabase.from("saved_looks").delete().eq("render_id", id);
  }

  function loadSavedLook(look: SavedLook, url: string, itemIds?: string[]) {
    // Set the style without wiping the render (patchBrief would clear it).
    setBrief((b) => ({ ...b, styleId: look.styleId }));
    showRender({ id: look.id, url, itemIds });
    setShowSaved(false);
  }

  // Availability per supplier for the couple's wedding date.
  const shopAvailability = useShopAvailability(brief.weddingDate, brief.guestCount);

  const venue = getVenue(brief.venueId);
  const style = getStyle(brief.styleId);
  // "none" is a description-led look with no preset; show a neutral name for it.
  const styleName = brief.styleId === "none" ? "Your design" : style.name;
  // The "before" image a render is compared against / saved alongside.
  const originalImage = brief.uploadedImages[0] ?? venue.image ?? null;

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
              onClick={() => { setShowSaved(true); setShowSettings(false); }}
              className="flex items-center gap-1.5 rounded-full border border-sand px-4 py-1.5 text-xs text-ink/50 hover:border-clay/50 hover:text-ink transition-colors"
            >
              <span className="text-[11px] text-clay">♥</span> Saved looks
              {savedLooks.length > 0 && (
                <span className="ml-0.5 rounded-full bg-clay/15 px-1.5 text-[10px] text-clay">
                  {savedLooks.length}
                </span>
              )}
            </button>
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

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
              {/* Left column — scrollable: render → products */}
              <div className="min-w-0 space-y-5">
                <RenderStage
                  venue={headerVenue}
                  uploadedImages={brief.uploadedImages}
                  style={style}
                  styleName={styleName}
                  renderUrl={currentRender?.url ?? null}
                  renderId={renderId}
                  versions={versions}
                  itemIds={basket.map((l) => l.itemId)}
                  guestCount={brief.guestCount}
                  onRender={showRender}
                  onDeleteVersion={deleteVersion}
                  onStyle={(id) => patchBrief({ styleId: id })}
                  onVenue={(id) => patchBrief({ venueId: id })}
                  onAddAngle={(url) =>
                    setBrief((b) => ({ ...b, uploadedImages: [...b.uploadedImages, url] }))
                  }
                  onShopLook={() => {
                    setShopLookSignal((n) => n + 1);
                    productBrowserRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  isSaved={isCurrentSaved}
                  onToggleSave={toggleSaveCurrent}
                />

                {/* Products — always visible below the render */}
                <div ref={productBrowserRef} className="overflow-hidden rounded-3xl border border-sand bg-white shadow-sm">
                  <ProductBrowser
                    styleId={brief.styleId}
                    basket={basket}
                    weddingDate={brief.weddingDate}
                    availability={shopAvailability}
                    lookSignal={shopLookSignal}
                    lookItemIds={currentRender?.itemIds}
                    onWeddingDate={(d) => patchBrief({ weddingDate: d })}
                    onAdd={addItem}
                    onRemove={removeItem}
                  />
                </div>
              </div>

              {/* Right column — sticky basket */}
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

      {/* Saved looks drawer */}
      {showSaved && (
        <SavedLooks
          looks={savedLooks}
          onClose={() => setShowSaved(false)}
          onLoad={loadSavedLook}
          onUnsave={unsaveLook}
        />
      )}
    </div>
  );
}
