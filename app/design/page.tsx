"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useCatalogue } from "@/components/catalogue/CatalogueProvider";
import { createClient } from "@/lib/supabase/client";
import type { BasketLine, CatalogueItem, SampleVenue } from "@/lib/types";
import { getStyle, getVenue } from "@/lib/styles";
import { suggestedQty, formatGBP } from "@/lib/quote";
import { type Brief, type UploadedPhoto } from "@/components/design/BriefStep";
import ResponsivePanel from "@/components/ui/ResponsivePanel";
import RenderStage, { type RenderRef } from "@/components/design/RenderStage";
import ProductBrowser from "@/components/design/ProductBrowser";
import BasketPanel from "@/components/design/BasketPanel";
import CheckoutStep from "@/components/design/CheckoutStep";
import HowItWorks from "@/components/design/HowItWorks";
import SavedLooks, { type SavedLook } from "@/components/design/SavedLooks";
import AccountMenu from "@/components/auth/AccountMenu";
import MyOrdersDrawer from "@/components/order/MyOrdersDrawer";
import { useShopAvailability } from "@/components/availability/useAvailability";

type Step = "studio" | "checkout";

export default function DesignPage() {
  const { getItem } = useCatalogue();
  const [partnerVenue, setPartnerVenue] = useState<SampleVenue | null>(null);
  const [partnerError, setPartnerError] = useState("");
  const [visualiserOpen, setVisualiserOpen] = useState(false);
  const [mobileBasketOpen, setMobileBasketOpen] = useState(false);
  const basketDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (mobileBasketOpen) basketDialog.current?.showModal();
    else basketDialog.current?.close();
  }, [mobileBasketOpen]);
  const [step, setStep] = useState<Step>("studio");
  const [showHowTo, setShowHowTo] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
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
  const visualiserRef = useRef<HTMLDivElement>(null);
  function openVisualiser() {
    setVisualiserOpen(true);
    setTimeout(
      () =>
        visualiserRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        }),
      0,
    );
  }
  const currentRender = versions.find((v) => v.id === renderId) ?? null;

  function showRender(render: RenderRef | null) {
    if (!render) {
      setVersions([]);
      setRenderId(null);
      return;
    }
    setVersions((vs) =>
      vs.some((v) => v.id === render.id) ? vs : [...vs, render],
    );
    setRenderId(render.id);
  }

  // Remove a version from the strip. If it was the one on show, fall back to the
  // most recent remaining version (or clear the stage if none are left).
  function deleteVersion(id: string) {
    setVersions((vs) => {
      const next = vs.filter((v) => v.id !== id);
      if (renderId === id)
        setRenderId(next.length ? next[next.length - 1].id : null);
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
        if (saved.brief) {
          // Older saved state kept uploadedImages as plain URL strings; keep only
          // entries in the current {id, url} shape (expired URLs are dropped anyway).
          const restoredBrief = { ...saved.brief };
          if (Array.isArray(restoredBrief.uploadedImages)) {
            restoredBrief.uploadedImages = (
              restoredBrief.uploadedImages as unknown[]
            ).filter(
              (p): p is UploadedPhoto =>
                !!p &&
                typeof p === "object" &&
                typeof (p as UploadedPhoto).id === "string" &&
                typeof (p as UploadedPhoto).url === "string",
            );
          }
          setBrief((b) => ({ ...b, ...restoredBrief }));
        }
        if (Array.isArray(saved.basket)) setBasket(saved.basket);
        if (
          saved.renderId &&
          !new URLSearchParams(window.location.search).has("venue") &&
          !new URLSearchParams(window.location.search).has("style")
        ) {
          fetch(`/api/renders/${saved.renderId}`)
            .then((r) => r.json())
            .then((data) => {
              if (
                data.status === "succeeded" &&
                data.imageUrl &&
                saved.renderId
              ) {
                setVersions([
                  {
                    id: saved.renderId,
                    url: data.imageUrl,
                    itemIds: data.itemIds,
                  },
                ]);
                setRenderId(saved.renderId);
              }
            })
            .catch(() => {});
        }
      }
    } catch {
      // Corrupt saved state — start fresh.
    }
    const params = new URLSearchParams(window.location.search);
    const styleParam = params.get("style");
    if (
      styleParam &&
      [
        "garden_romance",
        "classic_elegance",
        "modern_minimal",
        "rustic_barn",
      ].includes(styleParam)
    )
      setBrief((b) => ({ ...b, styleId: styleParam }));
    const slug = params.get("venue");
    if (slug && /^[a-z0-9-]+$/.test(slug))
      setBrief((b) => ({
        ...b,
        venueId: `listing:${slug}`,
        uploadedImages: [],
      }));
    if (params.get("render") === "true") setVisualiserOpen(true);
    setRestored(true);
  }, []);

  // Persist the design whenever it changes (once the initial restore has run,
  // so we never overwrite saved state with defaults).
  useEffect(() => {
    if (!restored) return;
    try {
      localStorage.setItem(
        "styled:design",
        JSON.stringify({ brief, basket, renderId }),
      );
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
        })),
      );
    }
  }, [supabase]);

  // Load saved looks once a session exists, migrating anything an earlier version
  // kept in localStorage into the account the first time.
  useEffect(() => {
    const sync = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
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
              { onConflict: "owner_id,render_id", ignoreDuplicates: true },
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

  const isCurrentSaved =
    renderId !== null && savedLooks.some((l) => l.id === renderId);

  async function toggleSaveCurrent() {
    if (!renderId) return;
    if (savedLooks.some((l) => l.id === renderId)) {
      setSavedLooks((looks) => looks.filter((l) => l.id !== renderId));
      await supabase.from("saved_looks").delete().eq("render_id", renderId);
    } else {
      setSavedLooks((looks) => [
        {
          id: renderId,
          styleId: brief.styleId,
          styleName,
          originalUrl: originalImage ?? undefined,
          savedAt: Date.now(),
        },
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
    openVisualiser();
  }

  useEffect(() => {
    if (!brief.venueId.startsWith("listing:")) {
      setPartnerVenue(null);
      setPartnerError("");
      return;
    }
    const controller = new AbortController();
    setPartnerError("");
    setPartnerVenue(null);
    fetch(`/api/venue-context/${encodeURIComponent(brief.venueId.slice(8))}`, {
      signal: controller.signal,
    })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
        setPartnerVenue(d.venue);
      })
      .catch((e) => {
        if (e.name !== "AbortError")
          setPartnerError(
            "This partner venue could not be loaded. Choose a sample venue or upload a photo.",
          );
      });
    return () => controller.abort();
  }, [brief.venueId]);
  const addedFromLink = useRef(false);
  useEffect(() => {
    if (!restored || addedFromLink.current) return;
    const id = new URLSearchParams(window.location.search).get("add");
    if (!id) return;
    const item = getItem(id);
    if (item) {
      addedFromLink.current = true;
      setBasket((lines) =>
        lines.some((l) => l.itemId === id)
          ? lines
          : [
              ...lines,
              { itemId: id, quantity: suggestedQty(item, brief.guestCount) },
            ],
      );
    }
  }, [restored, getItem, brief.guestCount]);

  // Availability per supplier for the couple's wedding date.
  const shopAvailability = useShopAvailability(
    brief.weddingDate,
    brief.guestCount,
  );

  const venue =
    partnerVenue ??
    (brief.venueId.startsWith("listing:")
      ? {
          id: brief.venueId,
          name: "Partner venue",
          area: "",
          kind: "Partner venue",
          gradient: "",
        }
      : getVenue(brief.venueId));
  const style = getStyle(brief.styleId);
  // "none" is a description-led look with no preset; show a neutral name for it.
  const styleName = brief.styleId === "none" ? "Your design" : style.name;
  // The "before" image a render is compared against / saved alongside.
  const originalImage = brief.uploadedImages[0]?.url ?? venue.image ?? null;

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
      return [
        ...b,
        { itemId: item.id, quantity: suggestedQty(item, brief.guestCount) },
      ];
    });
  }
  function removeItem(itemId: string) {
    setBasket((b) => b.filter((l) => l.itemId !== itemId));
  }
  function setQty(itemId: string, quantity: number) {
    setBasket((b) =>
      b.map((l) => (l.itemId === itemId ? { ...l, quantity } : l)),
    );
  }

  const headerVenue = useMemo(
    () => ({ ...venue, image: brief.uploadedImages[0]?.url ?? venue.image }),
    [venue, brief.uploadedImages],
  );

  // Remove an uploaded venue photo: drop it from the design and delete the stored
  // file/record, so it's no longer used for the render either.
  async function removeAngle(id: string) {
    patchBrief({
      uploadedImages: brief.uploadedImages.filter((p) => p.id !== id),
    });
    try {
      await fetch(`/api/venues/photos/${id}`, { method: "DELETE" });
    } catch {
      // The photo is already gone from the design; a failed delete just leaves an
      // orphaned file, which is harmless.
    }
  }

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
              onClick={() => {
                setShowSaved(true);
                setShowSettings(false);
              }}
              className="hidden sm:flex items-center gap-1.5 rounded-full border border-sand px-4 py-1.5 text-xs text-ink/50 hover:border-clay/50 hover:text-ink transition-colors"
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
              onClick={() => {
                setShowHowTo(true);
                setShowSettings(false);
              }}
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
            <AccountMenu
              onOpenOrders={() => {
                setShowOrders(true);
                setShowSettings(false);
              }}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 pb-28 lg:pb-0">
        {step === "studio" && (
          <div className="py-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <nav
                aria-label="Marketplace"
                className="flex max-w-full gap-2 overflow-x-auto whitespace-nowrap"
              >
                <button
                  type="button"
                  onClick={() =>
                    productBrowserRef.current?.scrollIntoView({
                      behavior: "smooth",
                    })
                  }
                  className="rounded-full bg-ink px-4 py-2 text-sm text-cream"
                >
                  Browse catalogue
                </button>
                <button
                  type="button"
                  onClick={() => setShowSaved(true)}
                  className="rounded-full border border-sand px-4 py-2 text-sm"
                >
                  Saved looks ({savedLooks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setShowOrders(true)}
                  className="rounded-full border border-sand px-4 py-2 text-sm"
                >
                  My orders
                </button>
              </nav>
              <div className="flex flex-wrap items-center gap-3 text-xs text-ink/60">
                <span>
                  {brief.guestCount} guests · {formatGBP(brief.budget)} budget
                  {brief.weddingDate
                    ? ` · ${new Date(brief.weddingDate + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
                    : ""}
                </span>
                <button
                  type="button"
                  aria-expanded={showSettings}
                  onClick={() => setShowSettings((v) => !v)}
                  className="rounded-full border border-sand px-3 py-2"
                >
                  {showSettings ? "Done" : "Edit details"}
                </button>
                <button
                  type="button"
                  onClick={openVisualiser}
                  className="hidden rounded-full border border-clay px-4 py-2 text-ink md:block"
                >
                  Visualise your look →
                </button>
              </div>
            </div>

            {/* Inline settings editor */}
            {showSettings && (
              <div className="mb-5 grid gap-5 rounded-2xl border border-sand bg-white px-6 py-5 shadow-sm sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs text-ink/50">
                    Guests
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={500}
                    value={brief.guestCount}
                    onChange={(e) =>
                      patchBrief({ guestCount: Number(e.target.value) })
                    }
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
                    onChange={(e) =>
                      patchBrief({ budget: Number(e.target.value) })
                    }
                    className="mt-2 w-full accent-clay"
                  />
                  <div className="mt-1 flex justify-between text-[11px] text-ink/35">
                    <span>£1k</span>
                    <span>£30k</span>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-ink/50">
                    Wedding date
                  </label>
                  <input
                    type="date"
                    value={brief.weddingDate}
                    onChange={(e) =>
                      patchBrief({ weddingDate: e.target.value })
                    }
                    className="w-full rounded-xl border border-sand bg-cream/50 px-4 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-clay/30"
                  />
                </div>
              </div>
            )}

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
              {/* Catalogue first, optional visualiser below. */}
              <div className="min-w-0 space-y-5">
                {/* Marketplace catalogue */}
                <div
                  ref={productBrowserRef}
                  className="overflow-hidden rounded-3xl border border-sand bg-white shadow-sm"
                >
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
                    onQty={setQty}
                    onVisualise={openVisualiser}
                  />
                </div>
                <div
                  ref={visualiserRef}
                  className="scroll-mt-24 overflow-hidden rounded-2xl border border-sand bg-cream"
                >
                  <button
                    type="button"
                    onClick={() => setVisualiserOpen(!visualiserOpen)}
                    aria-expanded={visualiserOpen}
                    aria-controls="studio-visualiser"
                    className="flex w-full items-center justify-between gap-4 p-6 text-left"
                  >
                    <span>
                      <span className="block font-serif text-2xl">
                        Visualise your look
                      </span>
                      <span className="mt-1 block text-sm text-ink/60">
                        Explore an illustrative preview of your pieces in a
                        venue.
                      </span>
                    </span>
                    <span>{visualiserOpen ? "Close −" : "Open +"}</span>
                  </button>
                  <ResponsivePanel
                    open={visualiserOpen}
                    onClose={() => setVisualiserOpen(false)}
                    title="Visualise your look"
                  >
                    <div id="studio-visualiser">
                      {partnerError && (
                        <p role="alert" className="p-4 text-sm">
                          {partnerError}
                        </p>
                      )}{" "}
                      <RenderStage
                        venue={headerVenue}
                        uploadedImages={brief.uploadedImages}
                        style={style}
                        styleName={styleName}
                        renderUrl={currentRender?.url ?? null}
                        renderId={renderId}
                        versions={versions}
                        itemIds={basket.map((l) => l.itemId)}
                        weddingDate={brief.weddingDate}
                        onWeddingDate={(d) => patchBrief({ weddingDate: d })}
                        guestCount={brief.guestCount}
                        onRender={showRender}
                        onDeleteVersion={deleteVersion}
                        onStyle={(id) => patchBrief({ styleId: id })}
                        onVenue={(id) => patchBrief({ venueId: id })}
                        onAddAngle={(photo) =>
                          setBrief((b) => ({
                            ...b,
                            uploadedImages: [...b.uploadedImages, photo],
                          }))
                        }
                        onRemoveAngle={removeAngle}
                        onShopLook={() => {
                          setShopLookSignal((n) => n + 1);
                          productBrowserRef.current?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
                        }}
                        isSaved={isCurrentSaved}
                        onToggleSave={toggleSaveCurrent}
                      />
                    </div>
                  </ResponsivePanel>
                </div>
              </div>

              {/* Right column — sticky basket */}
              <div className="hidden lg:sticky lg:top-20 lg:block">
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

      {step === "studio" && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex gap-3 border-t border-sand bg-cream p-4 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileBasketOpen(true)}
            className="flex-1 rounded-full bg-ink px-4 py-3 text-sm text-cream"
          >
            {basket.length} items ·{" "}
            {formatGBP(
              basket.reduce(
                (total, line) =>
                  total +
                  (getItem(line.itemId)?.unitPrice || 0) * line.quantity,
                0,
              ),
            )}{" "}
            · View basket
          </button>
          <button
            type="button"
            onClick={openVisualiser}
            className="rounded-full border border-ink px-4 py-3 text-sm"
          >
            Visualise
          </button>
        </div>
      )}
      <dialog
        ref={basketDialog}
        onClose={() => setMobileBasketOpen(false)}
        aria-label="Your basket"
        className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[90dvh] w-full max-w-none overflow-auto rounded-t-3xl bg-cream p-4 backdrop:bg-ink/50"
      >
        <button
          type="button"
          onClick={() => setMobileBasketOpen(false)}
          className="mb-3 rounded-full border border-sand px-4 py-2 text-sm"
        >
          Close basket ×
        </button>
        {mobileBasketOpen && (
          <BasketPanel
            basket={basket}
            guestCount={brief.guestCount}
            budget={brief.budget}
            weddingDate={brief.weddingDate}
            onQty={setQty}
            onRemove={removeItem}
            onCheckout={() => {
              setMobileBasketOpen(false);
              setStep("checkout");
            }}
          />
        )}
      </dialog>

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

      {/* My orders drawer */}
      {showOrders && <MyOrdersDrawer onClose={() => setShowOrders(false)} />}
    </div>
  );
}
