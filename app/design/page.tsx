"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useCatalogue } from "@/components/catalogue/CatalogueProvider";
import { createClient } from "@/lib/supabase/client";
import type { BasketLine, CatalogueItem, SampleVenue } from "@/lib/types";
import { getStyle, getVenue } from "@/lib/styles";
import { suggestedQty } from "@/lib/quote";
import { type Brief, type UploadedPhoto } from "@/components/design/BriefStep";
import { useSavedItems } from "@/components/design/useSavedItems";
import RenderStage, { type RenderRef } from "@/components/design/RenderStage";
import VenueExplorer from "@/components/venues/VenueExplorer";
import StudioNavigation, {
  type StudioTab,
} from "@/components/design/StudioNavigation";
import ProductBrowser from "@/components/design/ProductBrowser";
import BasketPanel from "@/components/design/BasketPanel";
import CheckoutStep from "@/components/design/CheckoutStep";
import { helpTopicForPage } from "@/lib/help";
import HowItWorks from "@/components/design/HowItWorks";
import SavedLooks, { type SavedLook } from "@/components/design/SavedLooks";
import AccountMenu from "@/components/auth/AccountMenu";
import MyBookings from "@/components/order/MyBookings";
import LookProducts from "@/components/design/LookProducts";
import { useShopAvailability } from "@/components/availability/useAvailability";

import LocationFilter from "@/components/wedding/LocationFilter";
import type { DiscoveryResults } from "@/lib/location";
import MyWedding from "@/components/wedding/MyWedding";
import Boards from "@/components/wedding/Boards";
import {
  deliveryDay,
  workspaceData,
  workspaceFingerprint,
  type WorkspaceData,
  type WeddingBoard,
} from "@/lib/wedding";

import { prepareBoard, type BoardInspiration } from "@/lib/board-inspiration";

type Step = "studio" | "checkout";

export default function DesignPage() {
  const { getItem } = useCatalogue();
  const [partnerVenue, setPartnerVenue] = useState<SampleVenue | null>(null);
  const [partnerError, setPartnerError] = useState("");
  const [studioTab, setStudioTab] = useState<StudioTab>("wedding");
  const [bookingSection, setBookingSection] = useState<"suppliers" | "venues">(
    "suppliers",
  );
  const savedItems = useSavedItems();
  const [discovery, setDiscovery] = useState<DiscoveryResults | null>(null),
    [searchRadius, setSearchRadius] = useState(50);
  function switchStudioTab(tab: StudioTab) {
    setStudioTab(tab);
    setStep("studio");
    window.scrollTo(0, 0);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    url.searchParams.delete("render");
    if (tab !== "orders") url.searchParams.delete("bookings");
    window.history.replaceState(null, "", url);
  }
  function openBookings(section: "suppliers" | "venues" = "suppliers") {
    setBookingSection(section);
    switchStudioTab("orders");
    const url = new URL(window.location.href);
    url.searchParams.set("bookings", section);
    window.history.replaceState(null, "", url);
  }
  const [mobileBasketOpen, setMobileBasketOpen] = useState(false);
  const basketDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (mobileBasketOpen) basketDialog.current?.showModal();
    else basketDialog.current?.close();
  }, [mobileBasketOpen]);
  const [step, setStep] = useState<Step>("studio");
  const [showHowTo, setShowHowTo] = useState(false);
  const [boardInspiration, setBoardInspiration] =
    useState<BoardInspiration | null>(null);
  const [savedLooks, setSavedLooks] = useState<SavedLook[]>([]);

  const [brief, setBrief] = useState<Brief>({
    venueId: "manor_orangery",
    uploadedImages: [],
    styleId: "garden_romance",
    guestCount: 80,
    weddingDate: "",
    budget: 6000,
  });
  const [boards, setBoards] = useState<WeddingBoard[]>([]);
  const [workspacePhotos, setWorkspacePhotos] = useState<
    Record<string, string>
  >({});
  const [workspaceLoaded, setWorkspaceLoaded] = useState(false);
  const [workspaceSaving, setWorkspaceSaving] = useState(false);
  const [workspaceError, setWorkspaceError] = useState("");
  const [savedWorkspace, setSavedWorkspace] = useState("");
  const workspaceRevision = useRef(0),
    workspaceLock = useRef(false),
    designKey = useRef("");
  const [basket, setBasket] = useState<BasketLine[]>([]);

  // Renders made for the current look (oldest first) and which one is showing.
  const [versions, setVersions] = useState<RenderRef[]>([]);
  const [renderId, setRenderId] = useState<string | null>(null);
  const shopLookSignal = 0;
  const [restored, setRestored] = useState(false);
  const productBrowserRef = useRef<HTMLDivElement>(null);
  const visualiserRef = useRef<HTMLDivElement>(null);
  const lookProductsRef = useRef<HTMLDivElement>(null);
  function openVisualiser() {
    switchStudioTab("visualiser");
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
    const entryParams = new URLSearchParams(window.location.search);
    const incomingTab = entryParams.get("tab");
    if (
      [
        "catalogue",
        "venues",
        "boards",
        "saved",
        "looks",
        "visualiser",
        "wedding",
        "orders",
      ].includes(incomingTab || "")
    )
      setStudioTab(incomingTab as StudioTab);
    else if (entryParams.get("render") === "true") setStudioTab("visualiser");
    setBookingSection(
      entryParams.get("bookings") === "venues" ? "venues" : "suppliers",
    );
    let cancelled = false;
    void (async () => {
      const {
        data: { user },
      } = await createClient().auth.getUser();
      if (!user || cancelled) return;
      designKey.current = `styled:design:${user.id}`;
      let localDraft: {
        brief?: Partial<Brief>;
        workspaceRevision?: number;
      } | null = null;
      try {
        const raw = localStorage.getItem(designKey.current);
        if (raw) {
          const saved = JSON.parse(raw) as {
            brief?: Partial<Brief>;
            basket?: BasketLine[];
            renderId?: string | null;
            workspaceRevision?: number;
          };
          localDraft = saved;
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
      try {
        const response = await fetch("/api/wedding", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok || !data.ok)
          throw Error(data.error || "Could not load your wedding.");
        if (cancelled) return;
        workspaceRevision.current = data.revision;
        setWorkspacePhotos(data.photos || {});
        if (data.data) {
          const stored = data.data as WorkspaceData;
          const { photoIds, ...details } = stored.brief;
          const draft =
            localDraft?.workspaceRevision === data.revision
              ? localDraft?.brief
              : undefined;
          const selectedPhotoIds =
            draft?.uploadedImages?.map((p) => p.id) ?? photoIds;
          setBrief((b) => ({
            ...b,
            ...details,
            ...draft,
            uploadedImages: selectedPhotoIds
              .filter((id) => data.photos[id])
              .map((id) => ({ id, url: data.photos[id] })),
          }));
          setBoards(stored.boards);
          setSavedWorkspace(workspaceFingerprint(stored));
        }
        setWorkspaceLoaded(true);
      } catch (e) {
        if (!cancelled)
          setWorkspaceError(
            e instanceof Error ? e.message : "Could not load your wedding.",
          );
      }
      if (cancelled) return;
      const params = entryParams;
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
          venueChoice: "have",
          venueName: "",
          uploadedImages: [],
        }));
      if (slug) {
        const consumed = new URL(window.location.href);
        consumed.searchParams.delete("venue");
        window.history.replaceState(null, "", consumed);
      }
      setRestored(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist the design whenever it changes (once the initial restore has run,
  // so we never overwrite saved state with defaults).
  useEffect(() => {
    if (!restored) return;
    try {
      localStorage.setItem(
        designKey.current,
        JSON.stringify({
          brief,
          basket,
          renderId,
          workspaceRevision: workspaceRevision.current,
        }),
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
    setBoardInspiration(null);
    // Set the style without wiping the render (patchBrief would clear it).
    setBrief((b) => ({ ...b, styleId: look.styleId }));
    showRender({ id: look.id, url, itemIds });
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
    setPartnerVenue((previous) =>
      previous?.id === brief.venueId ? previous : null,
    );
    fetch(`/api/venue-context/${encodeURIComponent(brief.venueId.slice(8))}`, {
      signal: controller.signal,
    })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
        setPartnerVenue(d.venue);
        setBrief((b) =>
          b.venueId === d.venue.id
            ? { ...b, venueName: d.venue.name, venueChoice: "have" }
            : b,
        );
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
    deliveryDay(brief),
  );

  const venue =
    (!brief.venueId.startsWith("listing:") &&
    brief.venueChoice === "have" &&
    brief.venueName
      ? {
          id: "own",
          name: brief.venueName,
          area: brief.venuePostcode || "",
          kind: "Your venue",
          gradient: "",
        }
      : null) ??
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
    if (patch.venueId !== undefined) {
      const url = new URL(window.location.href);
      if (patch.venueId.startsWith("listing:"))
        url.searchParams.set("venue", patch.venueId.slice(8));
      else url.searchParams.delete("venue");
      window.history.replaceState(null, "", url);
    }

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

  async function saveWorkspace(nextBoards = boards) {
    if (!workspaceLoaded || workspaceLock.current) return false;
    workspaceLock.current = true;
    setWorkspaceSaving(true);
    setWorkspaceError("");
    const value = workspaceData(brief, nextBoards);
    try {
      const res = await fetch("/api/wedding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: value,
          revision: workspaceRevision.current,
        }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok)
        throw Error(d.error || "Could not save your wedding.");
      workspaceRevision.current = d.revision;
      setBoards(nextBoards);
      setSavedWorkspace(workspaceFingerprint(value));
      return true;
    } catch (e) {
      setWorkspaceError(
        e instanceof Error ? e.message : "Could not save your wedding.",
      );
      return false;
    } finally {
      workspaceLock.current = false;
      setWorkspaceSaving(false);
    }
  }

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

  // Detach an angle without deleting a photo that may also be pinned to a board.
  function removeAngle(id: string) {
    patchBrief({
      uploadedImages: brief.uploadedImages.filter((p) => p.id !== id),
    });
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Slim app header */}
      <header className="sticky top-0 z-30 border-b border-sand bg-cream/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3">
          <Link href="/" className="font-serif text-xl tracking-wide text-ink">
            Styled<span className="text-clay">.</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            {step === "studio" && (
              <button
                type="button"
                onClick={() => setMobileBasketOpen(true)}
                aria-label={`Open basket, ${basket.reduce((n, line) => n + line.quantity, 0)} items`}
                className="flex min-h-10 items-center gap-2 rounded-full border border-sand px-3 text-xs text-ink"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M5 7h14l1 14H4L5 7z M9 7V5a3 3 0 0 1 6 0v2" />
                </svg>
                Basket{" "}
                <span className="tabular-nums">
                  ({basket.reduce((n, line) => n + line.quantity, 0)})
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setShowHowTo(true);
              }}
              className="flex items-center gap-1.5 rounded-full border border-sand px-3 py-2 text-xs text-ink/70 hover:border-clay/50 hover:text-ink transition-colors"
            >
              <span className="text-[11px]">?</span>{" "}
              <span className="hidden sm:inline">How it works</span>
              <span className="sm:hidden">Help</span>
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
                openBookings();
              }}
            />
          </div>
        </div>
      </header>

      {step === "studio" && (
        <div className="border-b border-sand">
          <div className="mx-auto max-w-7xl px-5">
            <StudioNavigation active={studioTab} onSelect={switchStudioTab} />
          </div>
        </div>
      )}
      <main
        id="studio-content"
        className="mx-auto max-w-7xl px-4 pb-24 sm:px-5 md:pb-8"
      >
        {step === "studio" && (
          <div className="py-6 sm:py-8">
            {(studioTab === "catalogue" || studioTab === "venues") && (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <p className="text-xs text-ink/60">
                  {studioTab === "venues"
                    ? "Find a space for your day"
                    : "Discover pieces from wedding suppliers"}
                </p>
                <button
                  type="button"
                  onClick={() => switchStudioTab("wedding")}
                  className="text-left text-xs leading-relaxed text-ink/60 hover:text-ink"
                >
                  {brief.weddingDate
                    ? new Date(
                        brief.weddingDate + "T12:00:00",
                      ).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "Set up your wedding plan"}
                  <span className="ml-2">· {brief.guestCount} guests</span>
                  <span className="ml-2 underline underline-offset-4">
                    Wedding plan →
                  </span>
                </button>
              </div>
            )}
            {(["saved", "looks"] as StudioTab[]).includes(studioTab) && (
              <section aria-labelledby="saved-title" className="mb-6">
                <p className="text-xs text-clay">Your private collection</p>
                <h1
                  id="saved-title"
                  className="mt-2 font-serif text-4xl sm:text-5xl"
                >
                  Saved
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink/60">
                  Keep your favourite catalogue pieces and generated looks
                  together.
                </p>
                <nav
                  aria-label="Saved collection"
                  className="mt-6 flex gap-5 border-b border-sand sm:gap-8"
                >
                  {(
                    [
                      ["saved", "Items", savedItems.ids.length],
                      ["looks", "Looks", savedLooks.length],
                    ] as const
                  ).map(([tab, label, count]) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => switchStudioTab(tab)}
                      aria-current={studioTab === tab ? "page" : undefined}
                      className={`min-h-12 border-b-2 text-sm ${studioTab === tab ? "border-clay font-medium text-ink" : "border-transparent text-ink/60 hover:text-ink"}`}
                    >
                      {label}
                      <span className="ml-2 text-xs tabular-nums text-ink/50">
                        {count}
                      </span>
                    </button>
                  ))}
                </nav>
                <p className="mt-4 text-xs leading-relaxed text-ink/60">
                  {studioTab === "saved"
                    ? "Individual catalogue pieces to shortlist or add to your basket."
                    : studioTab === "looks"
                      ? "Your AI previews. Open a look to explore its pieces in the visualiser."
                      : "Group pieces, looks, photos and notes into your own wedding ideas."}{" "}
                  Saving does not reserve stock.
                </p>
              </section>
            )}

            {workspaceError && (
              <div
                role="alert"
                className="mb-5 rounded-xl border border-clay p-4 text-sm"
              >
                {workspaceError}
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="ml-3 underline"
                >
                  Reload saved wedding
                </button>
              </div>
            )}
            {studioTab === "looks" && (
              <SavedLooks
                embedded
                looks={savedLooks}
                onClose={() => switchStudioTab("catalogue")}
                onLoad={loadSavedLook}
                onUnsave={unsaveLook}
              />
            )}
            {studioTab === "orders" && (
              <MyBookings
                section={bookingSection}
                onSection={openBookings}
                onBrowse={() => switchStudioTab("catalogue")}
              />
            )}
            <div hidden={studioTab !== "wedding"}>
              <MyWedding
                photos={workspacePhotos}
                brief={brief}
                onChange={patchBrief}
                onSave={() => void saveWorkspace()}
                saving={workspaceSaving}
                loaded={workspaceLoaded}
                status={
                  !workspaceLoaded
                    ? "Loading saved details…"
                    : workspaceFingerprint(workspaceData(brief, boards)) ===
                        savedWorkspace
                      ? "Saved to your account"
                      : "You have unsaved changes to your wedding plan"
                }
                onBrowse={() => switchStudioTab("catalogue")}
                onBoards={() => switchStudioTab("boards")}
                onBookings={(section) => openBookings(section || "suppliers")}
                onFindVenue={() => switchStudioTab("venues")}
                onVisualise={openVisualiser}
              />
            </div>
            <div hidden={studioTab !== "boards"}>
              <Boards
                boards={boards}
                onSave={saveWorkspace}
                busy={workspaceSaving}
                loaded={workspaceLoaded}
                photos={workspacePhotos}
                onPhoto={(id, url) =>
                  setWorkspacePhotos((p) => ({ ...p, [id]: url }))
                }
                savedIds={savedItems.ids}
                looks={savedLooks}
                onAdd={addItem}
                savedError={savedItems.error || undefined}
                savingItems={savedItems.busy}
                onOpenSaved={() => switchStudioTab("saved")}
                onOpenLooks={() => switchStudioTab("looks")}
                onSaveItem={(id) => {
                  if (!savedItems.ids.includes(id)) void savedItems.toggle(id);
                }}
                onUseBoard={(board) => {
                  setBoardInspiration(prepareBoard(board));
                  setRenderId(null);
                  openVisualiser();
                }}
                onOpenLook={async (id) => {
                  const look = savedLooks.find((l) => l.id === id);
                  if (!look) throw Error("This look is no longer saved.");
                  const response = await fetch(`/api/renders/${id}`);
                  const data = await response.json();
                  if (!response.ok || !data.imageUrl)
                    throw Error("This look is no longer available.");
                  loadSavedLook(look, data.imageUrl, data.itemIds);
                }}
              />
            </div>
            <div hidden={studioTab !== "catalogue"}>
              <LocationFilter
                venueSlug={
                  brief.venueId.startsWith("listing:")
                    ? brief.venueId.slice(8)
                    : undefined
                }
                postcode={brief.venuePostcode}
                result={discovery}
                onResult={setDiscovery}
                radius={searchRadius}
                onRadius={setSearchRadius}
              />
            </div>
            <div hidden={studioTab !== "venues"}>
              {restored && (
                <VenueExplorer
                  matches={discovery?.venues}
                  searchRadius={searchRadius}
                  active={studioTab === "venues"}
                  guestCount={brief.guestCount}
                  weddingDate={brief.weddingDate}
                  postcode={brief.venuePostcode}
                  selectedSlug={
                    brief.venueId.startsWith("listing:")
                      ? brief.venueId.slice(8)
                      : undefined
                  }
                  onVisualise={() => switchStudioTab("wedding")}
                  onSelect={(selected) => {
                    patchBrief({
                      venueId: `listing:${selected.slug}`,
                      venueChoice: "have",
                      venueName: selected.name,
                      venuePostcode: "",
                      uploadedImages: [],
                    });
                    setPartnerVenue({
                      id: `listing:${selected.slug}`,
                      name: selected.name,
                      area: selected.location,
                      kind: "Partner venue",
                      gradient: "",
                      image: selected.hero_image || undefined,
                    });
                    switchStudioTab("wedding");
                  }}
                />
              )}
            </div>
            <div
              hidden={
                studioTab === "venues" ||
                studioTab === "wedding" ||
                studioTab === "boards" ||
                studioTab === "looks" ||
                studioTab === "orders"
              }
              className={`${studioTab === "venues" || studioTab === "wedding" || studioTab === "boards" || studioTab === "looks" || studioTab === "orders" ? "hidden" : "grid"} gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start`}
            >
              {/* Catalogue first, optional visualiser below. */}
              <div className="min-w-0 space-y-5">
                {/* Marketplace catalogue */}
                <div
                  ref={productBrowserRef}
                  hidden={studioTab === "visualiser"}
                  className="overflow-hidden rounded-3xl border border-sand bg-white shadow-sm"
                >
                  {savedItems.error && (
                    <div
                      role="alert"
                      className="m-4 rounded-lg border border-clay p-4 text-sm"
                    >
                      {savedItems.error}
                      <button
                        type="button"
                        onClick={() => void savedItems.refresh()}
                        className="ml-3 underline"
                      >
                        Try again
                      </button>
                    </div>
                  )}
                  <ProductBrowser
                    matches={discovery?.suppliers}
                    searchRadius={searchRadius}
                    styleId={brief.styleId}
                    basket={basket}
                    weddingDate={brief.weddingDate}
                    deliverySameDay={brief.deliverySameDay}
                    deliveryDate={brief.deliveryDate}
                    onDates={patchBrief}
                    availability={shopAvailability}
                    lookSignal={shopLookSignal}
                    lookItemIds={currentRender?.itemIds}
                    onWeddingDate={(d) => patchBrief({ weddingDate: d })}
                    onAdd={addItem}
                    onRemove={removeItem}
                    onQty={setQty}
                    savedItemIds={savedItems.ids}
                    savedOnly={studioTab === "saved"}
                    savesLoaded={savedItems.loaded}
                    savingItems={savedItems.busy}
                    onToggleSave={(id) => void savedItems.toggle(id)}
                  />
                </div>
                <div
                  ref={visualiserRef}
                  hidden={studioTab !== "visualiser"}
                  className="scroll-mt-24 overflow-hidden rounded-2xl border border-sand bg-cream"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-sand p-6">
                    <div>
                      <h1 className="font-serif text-3xl">AI visualiser</h1>
                      <p className="mt-2 text-sm text-ink/60">
                        Create an illustrative preview with your venue and
                        chosen pieces. Your basket and saved items stay with
                        you.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => switchStudioTab("catalogue")}
                      className="rounded-full border border-sand px-4 py-2 text-sm"
                    >
                      Back to catalogue
                    </button>
                  </div>
                  {boardInspiration && (
                    <section
                      aria-label="Board inspiration ready"
                      className="border-b border-sand bg-white p-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="font-serif text-2xl">
                          From {boardInspiration.name}
                        </h2>
                        <button
                          type="button"
                          onClick={() => setBoardInspiration(null)}
                          className="min-h-10 rounded-full border border-sand px-4 text-xs"
                        >
                          Remove board inspiration
                        </button>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-ink/60">
                        {boardInspiration.photoIds.length} inspiration{" "}
                        {boardInspiration.photoIds.length === 1
                          ? "photo"
                          : "photos"}
                        {" and "}
                        {boardInspiration.itemIds.length} catalogue{" "}
                        {boardInspiration.itemIds.length === 1
                          ? "piece"
                          : "pieces"}{" "}
                        prepared for a new look. Your venue photo and basket are
                        unchanged. Choose a venue photo or an example room, then
                        generate when ready.
                      </p>
                      {!!boardInspiration.photoIds.length && (
                        <div className="mt-3 flex gap-2">
                          {boardInspiration.photoIds.map(
                            (id) =>
                              workspacePhotos[id] && (
                                <img
                                  key={id}
                                  src={workspacePhotos[id]}
                                  alt="Board inspiration reference"
                                  className="h-16 w-20 rounded-lg object-cover"
                                />
                              ),
                          )}
                        </div>
                      )}
                      {boardInspiration.notes && (
                        <p className="mt-3 text-xs text-ink/60">
                          Board notes: {boardInspiration.notes}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => switchStudioTab("boards")}
                        className="mt-3 min-h-10 text-xs underline"
                      >
                        Back to boards
                      </button>
                    </section>
                  )}
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
                      itemIds={[
                        ...new Set([
                          ...basket.map((l) => l.itemId),
                          ...(boardInspiration?.itemIds || []),
                        ]),
                      ]}
                      boardInspiration={boardInspiration}
                      deliveryDate={deliveryDay(brief)}
                      weddingDate={brief.weddingDate}
                      onWeddingDate={(d) => patchBrief({ weddingDate: d })}
                      guestCount={brief.guestCount}
                      onRender={showRender}
                      onDeleteVersion={deleteVersion}
                      onStyle={(id) => patchBrief({ styleId: id })}
                      onVenue={(id) =>
                        patchBrief({ venueId: id, venueChoice: "exploring" })
                      }
                      onAddAngle={(photo) =>
                        setBrief((b) => ({
                          ...b,
                          uploadedImages: [...b.uploadedImages, photo],
                        }))
                      }
                      onRemoveAngle={removeAngle}
                      onShopLook={() => {
                        lookProductsRef.current?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                      }}
                      isSaved={isCurrentSaved}
                      onToggleSave={toggleSaveCurrent}
                    />
                  </div>
                  <div ref={lookProductsRef} className="scroll-mt-24">
                    <LookProducts
                      itemIds={currentRender?.itemIds || []}
                      ready={!!currentRender}
                      basket={basket}
                      onAdd={addItem}
                      onRemove={removeItem}
                      onQty={setQty}
                      onBrowse={() => switchStudioTab("catalogue")}
                      savedIds={savedItems.ids}
                      onSave={savedItems.toggle}
                      saving={savedItems.busy}
                      savesLoaded={savedItems.loaded}
                      availability={shopAvailability}
                    />
                  </div>
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
                    deliveryDate={deliveryDay(brief)}
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
            deliverySameDay={brief.deliverySameDay}
            deliveryDate={brief.deliveryDate}
            onDates={patchBrief}
            styleId={brief.styleId}
            guestCount={brief.guestCount}
            venueLabel={venue.name}
            onBack={() => setStep("studio")}
            onOrdered={() => setBasket([])}
          />
        )}
      </main>

      {step === "studio" && (
        <StudioNavigation
          mobile
          active={studioTab}
          onSelect={switchStudioTab}
        />
      )}
      <dialog
        ref={basketDialog}
        onClose={(event) => {
          if (event.target === event.currentTarget) setMobileBasketOpen(false);
        }}
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
            deliveryDate={deliveryDay(brief)}
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
      {showHowTo && (
        <HowItWorks
          initialTopic={helpTopicForPage(
            "/design",
            step === "checkout" ? "checkout" : studioTab,
          )}
          onClose={() => setShowHowTo(false)}
        />
      )}
    </div>
  );
}
