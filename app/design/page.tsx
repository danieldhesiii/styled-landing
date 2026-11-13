"use client";
import SkipLink from "@/components/ui/SkipLink";
import {SupportButton} from "@/components/support/SupportProvider";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  Suspense,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { studioRoute, studioDestination } from "@/lib/studio-route";
import { useCatalogue } from "@/components/catalogue/CatalogueProvider";
import { createClient } from "@/lib/supabase/client";
import type { BasketLine, CatalogueItem, SampleVenue } from "@/lib/types";
import type { LookReport } from "@/lib/look";
import { savedRenderSnapshot } from "@/lib/saved-render";
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
import VenueSupplierJourney from "@/components/venues/VenueSupplierJourney";
import CheckoutStep from "@/components/design/CheckoutStep";
import { helpTopicForPage } from "@/lib/help";
import HowItWorks from "@/components/design/HowItWorks";
import SavedLooks, { type SavedLook } from "@/components/design/SavedLooks";
import { CustomerInboxLink } from "@/components/messages/CustomerInboxProvider";
import AccountMenu from "@/components/auth/AccountMenu";
import MyBookings from "@/components/order/MyBookings";
import LookProducts from "@/components/design/LookProducts";
import { useShopAvailability } from "@/components/availability/useAvailability";

import LocationFilter from "@/components/venues/LocationFilter";
import type { DiscoveryResults } from "@/lib/location";
import EventCountdown from "@/components/wedding/EventCountdown";
import EventPlans from "@/components/wedding/EventPlans";
import { eventWorkspace, eventBrief, FIRST_EVENT_ID, emptyPreviewSelection, parsePreviewSelection, togglePreviewItem } from "@/lib/event-plans";
import Boards from "@/components/wedding/Boards";
import {prepareBoard,type BoardInspiration} from "@/lib/board-inspiration";
import MyWedding from "@/components/wedding/MyWedding";
import { newEventBrief, planningFingerprint, persistPlanningDraft, createPlanningDraft, recoverPlanningWorkspace } from "@/components/wedding/planning-state";
import {
  deliveryDay,
  workspaceData,
  type WorkspaceData,
  type EventPlan,
  type WeddingBoard,
  type PreviewSelection,
} from "@/lib/wedding";


type Step = "studio" | "checkout";

export default function DesignPage() {
  return (
    <Suspense
      fallback={
        <p role="status" className="p-8 text-sm">
          Opening your wedding workspace…
        </p>
      }
    >
      <DesignStudio />
    </Suspense>
  );
}
function DesignStudio() {
  const {
    getItem,
    setVenueScope,scope:venueScope,
    loading: catalogueLoading,
    error: catalogueError,
    refresh: refreshCatalogue,
  } = useCatalogue();
  const params = useSearchParams();
  const { tab: requestedTab, bookings: bookingSection } = studioRoute(params);
  const studioTab = requestedTab;
  const [boardInspiration,setBoardInspiration] = useState<BoardInspiration|null>(null);
  const [partnerVenue, setPartnerVenue] = useState<SampleVenue | null>(null);
  const [partnerError, setPartnerError] = useState("");
  const savedItems = useSavedItems();
  const [discovery, setDiscovery] = useState<DiscoveryResults | null>(null),
    [searchRadius, setSearchRadius] = useState(50);
  function switchStudioTab(
    tab: StudioTab,
    bookings: "suppliers" | "venues" = "suppliers",
  ) {
    setStep("studio");
    const destination = studioDestination(window.location.href, tab, bookings);
    if (destination.href !== window.location.href)
      window.history.pushState(null, "", destination);
    window.scrollTo(0, 0);
  }
  function openBookings(section: "suppliers" | "venues" = "suppliers") {
    switchStudioTab("orders", section);
  }
  const [mobileBasketOpen, setMobileBasketOpen] = useState(false);
  const basketDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (mobileBasketOpen) basketDialog.current?.showModal();
    else basketDialog.current?.close();
  }, [mobileBasketOpen]);
  const [step, setStep] = useState<Step>("studio");
  const [showHowTo, setShowHowTo] = useState(false);
  const [savedLooks, setSavedLooks] = useState<SavedLook[]>([]);
  const [lookError, setLookError] = useState("");
  const [busyLooks, setBusyLooks] = useState<Set<string>>(new Set());
  const lookLocks = useRef(new Set<string>());
  const [actionNotice, setActionNotice] = useState("");

  const [brief, setBrief] = useState<Brief>({
    venueId: "manor_orangery",
    uploadedImages: [],
    styleId: "garden_romance",
    guestCount: 80,
    weddingDate: "",
    budget: 0,
    budgetUnknown: true,
    guestCountEstimated: true,
    planSetupComplete: false,
  });
  const budgetUnset =
    brief.budgetUnknown ??
    (!brief.planSetupComplete && !brief.weddingDate && !brief.venueName);
  const [boards, setBoards] = useState<WeddingBoard[]>([]);
  const [workspacePhotos, setWorkspacePhotos] = useState<
    Record<string, string>
  >({});
  const [workspaceLoaded, setWorkspaceLoaded] = useState(false);
  const [workspaceSaving, setWorkspaceSaving] = useState(false);
  const [workspaceTouched, setWorkspaceTouched] = useState(false);
  const [workspaceError, setWorkspaceError] = useState("");
  const [savedWorkspace, setSavedWorkspace] = useState("");
  const workspaceRevision = useRef(0),
    workspaceLock = useRef(false),
    designKey = useRef("");
  const accountId = useRef<string | null>(null);
  const [basket, setBasket] = useState<BasketLine[]>([]);
  const [previewSelection, setPreviewSelection] = useState<PreviewSelection>(emptyPreviewSelection);
  const [draftWriteFailed, setDraftWriteFailed] = useState(false);
  const [eventPlans, setEventPlans] = useState<EventPlan[]>([]);
  const [activeEventId, setActiveEventId] = useState(FIRST_EVENT_ID);
  const activeEventRef = useRef(FIRST_EVENT_ID);
  const [generationBusy, setGenerationBusy] = useState(false);
  const [dateEditorRequest, setDateEditorRequest] = useState(0);
  const renderRestoreToken = useRef(0);

  // Renders made for the current look (oldest first) and which one is showing.
  const [versions, setVersions] = useState<RenderRef[]>([]);
  const [renderId, setRenderId] = useState<string | null>(null);
  const shopLookSignal = 0;
  const [restored, setRestored] = useState(false);
  const productBrowserRef = useRef<HTMLDivElement>(null);
  const visualiserRef = useRef<HTMLDivElement>(null);
  const [lookProductId,setLookProductId]=useState<string|null>(null);
  const lookProductsRef = useRef<HTMLDivElement>(null);
  useEffect(()=>setBoardInspiration(null),[activeEventId]);
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
    renderRestoreToken.current += 1;
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
    let cancelled = false;
    void (async () => {
      const {
        data: { user },
        error: sessionError,
      } = await createClient().auth.getUser();
      if (cancelled) return;
      if (sessionError || !user || user.is_anonymous) {
        setWorkspaceError(
          "Your account could not be verified. Reload or sign in again before editing.",
        );
        return;
      }
      accountId.current = user.id;
      designKey.current = `styled:design:${user.id}`;
      let localDraft: {
        brief?: Partial<Brief>;
        workspace?: WorkspaceData;
        workspaceRevision?: number;
        activeEventId?: string;
        basket?: BasketLine[];
        renderId?: string | null;
        previewSelection?: PreviewSelection;
      } | null = null;
      try {
        const raw = localStorage.getItem(designKey.current);
        if (raw) {
          const saved = JSON.parse(raw) as {
            brief?: Partial<Brief>;
            workspace?: WorkspaceData;
            basket?: BasketLine[];
            renderId?: string | null;
            previewSelection?: PreviewSelection;
            workspaceRevision?: number;
            activeEventId?: string;
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
            localDraft.brief = restoredBrief;
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
        const recovered = recoverPlanningWorkspace(localDraft, data.revision);
        const stored = recovered || data.data as WorkspaceData | null;
        if (stored) {
          if (stored.events?.length && stored.activeEventId) {
            setEventPlans(stored.events);
            setActiveEventId(stored.activeEventId);
            activeEventRef.current = stored.activeEventId;
            const selected = stored.events.find(
              (e) => e.id === stored.activeEventId,
            );
            if (selected) {
              setBasket(selected.basket);
              setPreviewSelection(parsePreviewSelection(selected.previewSelection));
              setVersions([]);
              setRenderId(null);
              const draftMatches =
                localDraft?.workspaceRevision === data.revision &&
                localDraft?.activeEventId === stored.activeEventId;
              const selectedRender = draftMatches
                ? localDraft?.renderId
                : selected.renderId;
              if (selectedRender && selectedRender !== "placeholder") {
                setRenderId(selectedRender);
                void restoreEventRender(selectedRender, selected.id);
              }
            }
          }
          const { photoIds, ...details } = stored.brief;
          const draft =
            localDraft?.workspaceRevision === data.revision &&
            (localDraft?.activeEventId || FIRST_EVENT_ID) ===
              (stored.activeEventId || FIRST_EVENT_ID)
              ? localDraft?.brief
              : undefined;
          if (draft && localDraft?.basket) setBasket(localDraft.basket);
          if (draft && localDraft?.previewSelection) setPreviewSelection(parsePreviewSelection(localDraft.previewSelection));
          const selectedPhotoIds =
            draft?.uploadedImages?.map((p) => p.id) ?? photoIds;
          setBrief((b) => ({
            ...b,
            ...details,
            budgetUnknown: details.budgetUnknown,
            guestCountEstimated: details.guestCountEstimated,
            planSetupComplete: details.planSetupComplete,
            ...draft,
            uploadedImages: selectedPhotoIds
              .filter((id) => data.photos[id])
              .map((id) => ({ id, url: data.photos[id] })),
          }));
          setBoards(stored.boards);
          if (data.data) {
            const remote = data.data as WorkspaceData;
            const selected = remote.events?.find((event) => event.id === remote.activeEventId);
            const { photoIds: remotePhotoIds, ...remoteBrief } = remote.brief;
            setSavedWorkspace(planningFingerprint(eventWorkspace(
              { ...remoteBrief, uploadedImages: remotePhotoIds.map((id) => ({ id, url: "" })) },
              remote.boards, remote.events || [], remote.activeEventId || FIRST_EVENT_ID,
              selected?.basket || [], selected?.renderId || null,
            )));
          }
          if (draft || recovered) setWorkspaceTouched(true);
        }
        if (
          !stored?.events?.length &&
          localDraft?.renderId &&
          (!data.data || (localDraft.workspaceRevision === data.revision && (localDraft.activeEventId || FIRST_EVENT_ID) === FIRST_EVENT_ID)) &&
          localDraft.renderId !== "placeholder" &&
          !entryParams.has("venue") &&
          !entryParams.has("style")
        ) {
          setRenderId(localDraft.renderId);
          void restoreEventRender(localDraft.renderId, FIRST_EVENT_ID);
        }
        if (!data.data) {
          if (!recovered) {
            if (localDraft?.brief) setBrief((current) => ({ ...current, ...localDraft.brief }));
            if (Array.isArray(localDraft?.basket)) setBasket(localDraft.basket);
            if (localDraft?.previewSelection) setPreviewSelection(parsePreviewSelection(localDraft.previewSelection));
          }
          setSavedWorkspace(
            planningFingerprint(
              eventWorkspace({ ...brief, planSetupComplete: false }, [], [], FIRST_EVENT_ID, [], null),
            ),
          );
        }
        if (!data.data && localDraft?.brief) setWorkspaceTouched(true);
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
      if (styleParam) setWorkspaceTouched(true);
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
        setWorkspaceTouched(true);
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

  // Every editable field here is recoverable from an account/event-scoped draft.
  useEffect(() => {
    if (!restored || !workspaceLoaded || !designKey.current) return;
    const durable = persistPlanningDraft(() => localStorage, designKey.current, createPlanningDraft(
      eventWorkspace(brief, boards, eventPlans, activeEventId, basket, renderId, previewSelection),
      brief, workspaceRevision.current,
    ));
    setDraftWriteFailed(!durable);
  }, [brief, boards, basket, renderId, previewSelection, activeEventId, restored, workspaceLoaded, eventPlans]);

  // Saved looks (favourites) live in the database under the couple's Supabase
  // user (guest or account), so they persist and follow them across devices once
  // they create an account. RLS keeps each couple to their own rows.
  const supabase = useMemo(() => createClient(), []);

  const refreshSavedLooks = useCallback(async () => {
    const { data, error } = await supabase
      .from("saved_looks")
      .select("render_id, style_id, style_name, original_url, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      setLookError("Your saved looks could not be loaded. Try again.");
      return;
    }
    setLookError("");
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
            const { error: migrationError } = await supabase
              .from("saved_looks")
              .upsert(
                old.map((l) => ({
                  owner_id: user.id,
                  render_id: l.id,
                  style_id: l.styleId,
                  style_name: l.styleName,
                  original_url: l.originalUrl ?? null,
                })),
                { onConflict: "owner_id,render_id", ignoreDuplicates: true },
              );
            if (migrationError) throw migrationError;
          }
          localStorage.removeItem("styled:savedLooks");
        }
      } catch {
        // Corrupt legacy state — ignore.
      }
      await refreshSavedLooks();
    };
    sync();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (accountId.current && session?.user.id !== accountId.current) {
        setWorkspaceLoaded(false);
        setRestored(false);
        setBoards([]);
        setSavedLooks([]);
        setWorkspacePhotos({});
        window.location.assign(
          session?.user ? window.location.href : "/login?mode=login",
        );
        return;
      }
      // Defer database work until the auth client has released its session lock.
      setTimeout(() => void sync(), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase, refreshSavedLooks]);

  const isCurrentSaved =
    renderId !== null && savedLooks.some((l) => l.id === renderId);

  async function changeSavedLook(id: string, remove: boolean) {
    if (lookLocks.current.has(id)) return;
    lookLocks.current.add(id);
    setBusyLooks(new Set(lookLocks.current));
    setLookError("");
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user || user.is_anonymous)
        throw Error("Please sign in again to save looks.");
      if (remove) {
        const { error } = await supabase
          .from("saved_looks")
          .delete()
          .eq("owner_id", user.id)
          .eq("render_id", id);
        if (error) throw error;
        setSavedLooks((current) => current.filter((look) => look.id !== id));
      } else {
        const { error } = await supabase.from("saved_looks").upsert(
          {
            owner_id: user.id,
            render_id: id,
            style_id: brief.styleId,
            style_name: styleName,
            original_url: originalImage ?? null,
          },
          { onConflict: "owner_id,render_id" },
        );
        if (error) throw error;
        setSavedLooks((current) =>
          current.some((look) => look.id === id)
            ? current
            : [
                {
                  id,
                  styleId: brief.styleId,
                  styleName,
                  originalUrl: originalImage ?? undefined,
                  savedAt: Date.now(),
                },
                ...current,
              ],
        );
      }
    } catch {
      setLookError(
        "This change could not be saved. Your previous saved looks are unchanged. Please try again.",
      );
    } finally {
      lookLocks.current.delete(id);
      setBusyLooks(new Set(lookLocks.current));
    }
  }
  async function toggleSaveCurrent() {
    if (renderId) await changeSavedLook(renderId, isCurrentSaved);
  }
  async function unsaveLook(id: string) {
    await changeSavedLook(id, true);
  }

  function loadSavedLook(look: SavedLook, url: string, itemIds?: string[], report?: LookReport, originalUrl?: string) {
    // Keep this event’s editable plan unchanged when viewing an account-wide save.
    renderRestoreToken.current += 1;
    setVersions([{ id: look.id, url, itemIds, look: report, originalUrl: originalUrl || look.originalUrl, styleName: look.styleName }]);
    setRenderId(look.id);
    setActionNotice("Look opened. Your current event and basket are unchanged.");
    openVisualiser();
  }

  useEffect(()=>{setVenueScope(brief.venueId.startsWith("listing:")?brief.venueId.slice(8):"");},[brief.venueId,setVenueScope]);

  useEffect(() => {
    if (!brief.venueId.startsWith("listing:")) {
      setPartnerVenue(null);
      setPartnerError("");
      return;
    }
    const controller = new AbortController();
    const eventId = activeEventRef.current;
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
        if (controller.signal.aborted || activeEventRef.current !== eventId) return;
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
  }, [brief.venueId, activeEventId]);
  const addedFromLink = useRef<string | null>(null);
  useEffect(() => {
    if (!restored || catalogueLoading || catalogueError) return;
    const id = params.get("add");
    if (!id) {
      addedFromLink.current = null;
      return;
    }
    if (addedFromLink.current === id) return;
    const item = getItem(id);
    if (item) {
      addedFromLink.current = id;
      setWorkspaceTouched(true);
      setBasket((lines) =>
        lines.some((l) => l.itemId === id)
          ? lines
          : [
              ...lines,
              { itemId: id, quantity: suggestedQty(item, brief.guestCount) },
            ],
      );
      setActionNotice(
        "Your supplier selection is ready. Review quantities in your basket.",
      );
      const consumed = new URL(window.location.href);
      consumed.searchParams.delete("add");
      consumed.searchParams.set("tab", "catalogue");
      window.history.replaceState(null, "", consumed);
    }
  }, [
    restored,
    getItem,
    brief.guestCount,
    params,
    catalogueLoading,
    catalogueError,
  ]);

  const previewFromLink = useRef<string | null>(null);
  useEffect(() => {
    if (!restored || !workspaceLoaded || catalogueLoading || catalogueError) return;
    const expectedScope = brief.venueId.startsWith("listing:") ? brief.venueId.slice(8) : null;
    if ((venueScope?.slug ?? null) !== expectedScope) return;
    const id = params.get("preview");
    if (!id) { previewFromLink.current = null; return; }
    if (previewFromLink.current === id) return;
    const item = getItem(id);
    previewFromLink.current = id;
    if (item) {
      setWorkspaceTouched(true);
      setPreviewSelection((selection) => ({ ...selection, mode: "manual", itemIds: [...new Set([...selection.itemIds, item.id])], ...(item.visualiserUse === "outdoor" ? {environment: "outdoor" as const} : {}) }));
      setActionNotice(`${item.name} selected for this event’s preview. Your basket is unchanged.`);
    } else {
      setActionNotice("This product is not available in your current catalogue. Choose another product for the preview.");
    }
    const consumed = new URL(window.location.href);
    consumed.searchParams.delete("preview");
    consumed.searchParams.set("tab", item ? "visualiser" : "catalogue");
    window.history.replaceState(null, "", consumed);
  }, [restored, workspaceLoaded, catalogueLoading, catalogueError, params, getItem, brief.venueId, venueScope?.slug]);

  // Availability per supplier for the couple's wedding date.
  const shopAvailability = useShopAvailability(
    brief.weddingDate,
    brief.guestCount,
    deliveryDay(brief),
    brief.returnDate || brief.weddingDate,
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
  const originalImage = currentRender?.originalUrl ?? brief.uploadedImages[0]?.url ?? venue.image ?? null;

  const patchBrief = (patch: Partial<Brief>) => {
    if (workspaceLock.current || activeEventRef.current !== activeEventId) return;
    setWorkspaceTouched(true);
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

  async function restoreEventRender(id: string, eventId: string) {
    const token = ++renderRestoreToken.current;
    try {
      const response = await fetch(`/api/renders/${id}`);
      const data = response.ok ? savedRenderSnapshot(id, await response.json()) : null;
      if (
        activeEventRef.current !== eventId ||
        token !== renderRestoreToken.current ||
        !data
      )
        return;
      setVersions([data]);
      setRenderId(id);
    } catch {
      setLookError(
        "The saved preview could not be opened. Your plan is still available.",
      );
    }
  }
  async function switchEvent(
    targetId: string,
    newPlan?: { name: string; kind: EventPlan["kind"] },
  ) {
    if (!workspaceLoaded || workspaceLock.current || generationBusy)
      return false;
    const outgoing = eventWorkspace(
      brief,
      boards,
      eventPlans,
      activeEventId,
      basket,
      renderId,
      previewSelection,
    );
    let next = outgoing.events!;
    if (newPlan) {
      if (next.length >= 12) return false;
      const initial = workspaceData(newEventBrief(), []).brief;
      next = [
        ...next,
        {
          id: targetId,
          name: newPlan.name,
          kind: newPlan.kind,
          brief: initial,
          basket: [],
          renderId: null,
          previewSelection: emptyPreviewSelection(),
        },
      ];
    }
    const target = next.find((e) => e.id === targetId);
    if (!target) return false;
    const value: WorkspaceData = {
      brief: target.brief,
      boards,
      events: next,
      activeEventId: targetId,
    };
    workspaceLock.current = true;
    setWorkspaceSaving(true);
    setWorkspaceError("");
    try {
      const response = await fetch("/api/wedding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: value,
          revision: workspaceRevision.current,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok)
        throw Error(
          data.error ||
            "Could not switch plans. Your current plan is still open.",
        );
      workspaceRevision.current = data.revision;
      const photos = {
        ...workspacePhotos,
        ...Object.fromEntries(brief.uploadedImages.map((p) => [p.id, p.url])),
      };
      setWorkspacePhotos(photos);
      setEventPlans(next);
      setActiveEventId(targetId);
      activeEventRef.current = targetId;
      setDateEditorRequest(0);
      setBrief(eventBrief(target, photos));
      setBasket(target.basket);
      setPreviewSelection(parsePreviewSelection(target.previewSelection));
      renderRestoreToken.current += 1;
      setVersions([]);
      setRenderId(target.renderId || null);
      setDiscovery(null);
      setSearchRadius(50);
      setLookProductId(null);
      setMobileBasketOpen(false);
      setPartnerError("");
      const url = new URL(window.location.href);
      for (const key of ["venue", "style", "supplier", "add", "preview"]) url.searchParams.delete(key);
      window.history.replaceState(null, "", url);
      setPartnerVenue(null);
      setSavedWorkspace(planningFingerprint(value));
      setWorkspaceTouched(false);
      if (target.renderId) void restoreEventRender(target.renderId, targetId);
      setActionNotice(
        `${target.name} is open. Catalogue choices and dates now apply to this event.`,
      );
      switchStudioTab("wedding");
      return true;
    } catch (e) {
      setWorkspaceError(
        e instanceof Error ? e.message : "Could not save event plans.",
      );
      return false;
    } finally {
      workspaceLock.current = false;
      setWorkspaceSaving(false);
    }
  }
  async function saveWorkspace(
    nextBoards = boards,
    patch?: Partial<Brief>,
    nextBasket = basket,
  ) {
    if (!workspaceLoaded || workspaceLock.current || activeEventRef.current !== activeEventId) return false;
    workspaceLock.current = true;
    setWorkspaceSaving(true);
    setWorkspaceError("");
    const value = eventWorkspace(
      { ...brief, ...patch },
      nextBoards,
      eventPlans,
      activeEventId,
      nextBasket,
      renderId,
      previewSelection,
    );
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
      setEventPlans(value.events!);
      if (patch) setBrief((current) => ({ ...current, ...patch }));
      setSavedWorkspace(planningFingerprint(value));
      setWorkspaceTouched(false);
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

  const workspaceDirty =
    workspaceLoaded && restored && workspaceTouched &&
    planningFingerprint(
      eventWorkspace(
        brief,
        boards,
        eventPlans,
        activeEventId,
        basket,
        renderId,
        previewSelection,
      ),
    ) !== savedWorkspace;
  useEffect(() => {
    if (!workspaceDirty || !draftWriteFailed) return;
    const protect = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [workspaceDirty, draftWriteFailed]);
  useEffect(() => {
    const back = () => setStep("studio");
    window.addEventListener("popstate", back);
    return () => window.removeEventListener("popstate", back);
  }, []);
  useEffect(() => {
    if (!actionNotice) return;
    const timer = setTimeout(() => setActionNotice(""), 6000);
    return () => clearTimeout(timer);
  }, [actionNotice]);

  function toggleVisualiserProduct(item: CatalogueItem) {
    if (workspaceLock.current || activeEventRef.current !== activeEventId) return;
    setWorkspaceTouched(true);
    setPreviewSelection((selection) => ({...togglePreviewItem(selection, item.id), ...(item.visualiserUse === "outdoor" ? {environment:selection.environment === "tent-interior" ? "tent-interior" as const : "outdoor" as const} : {})}));
  }
  function removePreviewItem(itemId: string) {
    if (workspaceLock.current || activeEventRef.current !== activeEventId) return;
    setWorkspaceTouched(true);
    setPreviewSelection((selection) => ({ ...selection, itemIds: selection.itemIds.filter((id) => id !== itemId) }));
  }
  function changePreviewMode(mode: PreviewSelection["mode"]) {
    if (workspaceLock.current || activeEventRef.current !== activeEventId) return;
    setWorkspaceTouched(true);
    setPreviewSelection((selection) => ({ ...selection, mode }));
  }

  function addItem(item: CatalogueItem) {
    if (workspaceLock.current || activeEventRef.current !== activeEventId) return;
    setWorkspaceTouched(true);
    setBasket((b) => {
      if (b.some((l) => l.itemId === item.id)) return b;
      return [
        ...b,
        { itemId: item.id, quantity: suggestedQty(item, brief.guestCount) },
      ];
    });
  }
  function removeItem(itemId: string) {
    if (workspaceLock.current || activeEventRef.current !== activeEventId) return;
    setWorkspaceTouched(true);
    setBasket((b) => b.filter((l) => l.itemId !== itemId));
  }
  function setItemDates(
    itemId: string,
    hireDates?: import("@/lib/booking-dates").HireDates,
  ) {
    if (workspaceLock.current || activeEventRef.current !== activeEventId) return;
    setWorkspaceTouched(true);
    setBasket((lines) =>
      lines.map((line) =>
        line.itemId === itemId ? { ...line, hireDates } : line,
      ),
    );
  }
  function setQty(itemId: string, quantity: number) {
    if (workspaceLock.current || activeEventRef.current !== activeEventId) return;
    setWorkspaceTouched(true);
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

  const activeEventName =
    eventPlans.find((event) => event.id === activeEventId)?.name ||
    "Wedding day";

  return (
    <div className="studio-page-enter min-h-screen bg-cream">
      <SkipLink target="studio-content" />
      <header className="sticky top-0 z-30 border-b border-sand bg-cream/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center gap-x-2 px-3 py-1 sm:gap-x-3 sm:px-5 lg:gap-x-6">
          <Link href="/design?tab=wedding" aria-label="Styled wedding plan" className="shrink-0 font-serif text-2xl tracking-tight text-ink">Styled<span className="text-clay">.</span></Link>
          {workspaceLoaded && restored && <button type="button" title="Edit event dates" disabled={workspaceSaving || generationBusy || step !== "studio"} onClick={() => { setDateEditorRequest(n => n + 1); switchStudioTab("wedding"); }} className="inline-flex min-h-11 shrink-0 items-center rounded-sm px-1 focus-visible:outline-clay"><EventCountdown name={activeEventName} date={brief.weddingDate} /></button>}
          {step === "studio" && <div className="hidden min-w-0 md:order-last md:block md:w-full lg:order-none lg:w-auto lg:flex-1"><StudioNavigation venueSuppliers={venueScope?.policy.mode === "venue_only" || venueScope?.policy.mode === "venue_partners"} active={studioTab} onSelect={switchStudioTab} /></div>}
          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            {step === "studio" ? <button type="button" onClick={() => setMobileBasketOpen(true)} aria-label={`Open basket, ${basket.reduce((total, line) => total + line.quantity, 0)} items`} className="flex min-h-11 items-center gap-2 rounded-md px-2 text-xs text-ink/70 hover:bg-sand/30 hover:text-ink">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 7h14l1 14H4L5 7z M9 7V5a3 3 0 0 1 6 0v2" /></svg>
              <span className="tabular-nums">{basket.reduce((total, line) => total + line.quantity, 0)}</span>
            </button> : <button type="button" onClick={() => setStep("studio")} className="min-h-11 px-2 text-xs text-ink/65 hover:text-ink">Back to studio</button>}
            <button type="button" onClick={() => setShowHowTo(true)} aria-label="How it works" className="flex h-11 w-11 items-center justify-center rounded-md text-sm text-ink/60 hover:bg-sand/30 hover:text-ink">?</button>
            <CustomerInboxLink compact />
            <AccountMenu onOpenHelp={() => setShowHowTo(true)} onOpenOrders={() => openBookings()} />
          </div>
        </div>
        {workspaceLoaded && restored && <div className="border-t border-sand/60">
          <div className="mx-auto max-w-7xl px-3 sm:px-5">
          <EventPlans
            compact
            events={eventPlans}
            activeId={activeEventId}
            disabled={workspaceSaving || generationBusy || step !== "studio"}
            dirty={workspaceDirty}
            onSave={() => saveWorkspace()}
            onSwitch={(id) => switchEvent(id)}
            onCreate={(name, kind) =>
              switchEvent(crypto.randomUUID(), { name, kind })
            }
          />
          </div>
        </div>}
      </header>
      <main id="studio-content" className="mx-auto max-w-7xl px-3 pb-24 sm:px-5 md:pb-8">
        {actionNotice && (
          <p
            role="status"
            className="mt-4 rounded-xl border border-sand bg-white p-4 text-sm"
          >
            {actionNotice}
          </p>
        )}
        {step === "studio" && (
          <div className="py-5 sm:py-6">
            {(["catalogue", "saved", "visualiser"] as StudioTab[]).includes(
              studioTab,
            ) &&
              (catalogueLoading || catalogueError) && (
                <div
                  role={catalogueError ? "alert" : "status"}
                  className="mb-5 rounded-xl border border-sand bg-white p-4 text-sm"
                >
                  {catalogueError
                    ? catalogueError + " Your wedding plan, saved items and bookings are still available."
                    : "Loading catalogue pieces…"}
                  {catalogueError && (
                    <button
                      type="button"
                      onClick={() => void refreshCatalogue()}
                      className="ml-3 underline"
                    >
                      Retry catalogue
                    </button>
                  )}
                </div>
              )}
            {(["saved","looks"] as StudioTab[]).includes(studioTab)&&<nav aria-label="Your inspiration" className="studio-panel mb-5 flex flex-wrap gap-6 border-b border-sand">{([["saved","Saved items"],["looks","Saved looks"]] as [StudioTab,string][]).map(([id,label])=><button type="button" key={id} aria-current={studioTab===id?"page":undefined} onClick={()=>switchStudioTab(id)} className={`min-h-12 border-b-2 text-sm ${studioTab===id?"border-clay font-medium":"border-transparent text-ink/60"}`}>{label}</button>)}</nav>}
            {(["saved", "looks"] as StudioTab[]).includes(studioTab) && (
              <section aria-labelledby="saved-title" className="mb-6">
                <h1
                  id="saved-title"
                  className="font-serif text-3xl tracking-tight sm:text-4xl"
                >
                  {studioTab==="looks"?"Saved looks":"Saved items"}
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink/60">
                  {studioTab==="looks"?"Open a saved preview to return to the visualiser.":"Your favourite products, ready when you need them."}
                </p>


              </section>
            )}

            {draftWriteFailed && workspaceDirty && (
              <p role="status" className="mb-5 rounded-xl border border-clay p-4 text-sm">
                This browser could not keep your draft. Save your plan before leaving.
              </p>
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
                availability={shopAvailability}
                basket={basket}
                onQty={setQty}
                onRemove={removeItem}
                onChangeDates={() => switchStudioTab("wedding")}
                onAlternatives={() => switchStudioTab("catalogue")}
                savedError={savedItems.error || undefined}
                savingItems={savedItems.busy}
                onOpenSaved={() => switchStudioTab("saved")}
                onOpenLooks={() => switchStudioTab("looks")}
                onSaveItem={(id) => {
                  if (!savedItems.ids.includes(id)) void savedItems.toggle(id);
                }}
                onUseBoard={(board) => {
                  const inspiration=prepareBoard(board);
                  setBoardInspiration(inspiration);
                  setPreviewSelection(s=>({...s,mode:"manual",itemIds:inspiration.itemIds}));
                  setWorkspaceTouched(true);
                  setRenderId(null);
                  openVisualiser();
                }}
                onOpenLook={async (id) => {
                  const eventId = activeEventRef.current;
                  const look = savedLooks.find((l) => l.id === id);

                  const response = await fetch(`/api/renders/${id}`);
                  const data = response.ok ? savedRenderSnapshot(id, await response.json()) : null;
                  if (activeEventRef.current !== eventId) throw Error("Your event changed. Open the look again for this event.");
                  if (!data)
                    throw Error("This look is no longer available.");
                  loadSavedLook(
                    look || {
                      id,
                      styleId: "none",
                      styleName: "Board look",
                      originalUrl: data.originalUrl || undefined,
                      savedAt: Date.now(),
                    },
                    data.url,
                    data.itemIds,
                    data.look,
                    data.originalUrl,
                  );
                }}
              />
            </div>
            {studioTab === "looks" && (
              <SavedLooks
                onCreate={openVisualiser}
                embedded
                looks={savedLooks}
                onClose={() => switchStudioTab("catalogue")}
                onLoad={loadSavedLook}
                onUnsave={unsaveLook}
                busyIds={busyLooks}
                error={lookError}
              />
            )}
            {studioTab === "orders" && (
              <MyBookings
                onFindVenue={() => switchStudioTab("venues")}
                section={bookingSection}
                onSection={openBookings}
                onBrowse={() => switchStudioTab("catalogue")}
              />
            )}
            <div className="studio-panel" hidden={studioTab !== "wedding"}>
              <MyWedding
                key={activeEventId}
                dateEditorRequest={dateEditorRequest}
                eventName={
                  eventPlans.find((e) => e.id === activeEventId)?.name ||
                  "Wedding day"
                }
                basketCount={basket.length}
                previewUrl={currentRender?.url}
                selectedItems={basket.map((line) => ({
                  name: getItem(line.itemId)?.name || "Unlisted catalogue item",
                  quantity: line.quantity,
                }))}
                renderCount={versions.length}
                photos={workspacePhotos}
                brief={brief}
                onChange={patchBrief}
                onSave={(patch) => saveWorkspace(boards, patch)}
                saving={workspaceSaving}
                loaded={workspaceLoaded && restored}
                status={
                  !workspaceLoaded
                    ? "Loading saved details…"
                    : !workspaceDirty
                      ? "Saved to your account"
                      : "You have unsaved changes to your wedding plan"
                }
                onBrowse={() => switchStudioTab("catalogue")}
                onSaved={() => switchStudioTab("saved")}
                onBookings={(section) => openBookings(section || "suppliers")}
                onFindVenue={() => switchStudioTab("venues")}
                onVisualise={openVisualiser}
              />
            </div>
            <div className="studio-panel" hidden={studioTab !== "catalogue"}>
              {venueScope?.policy.mode!=="venue_only"&&<LocationFilter
                entity="suppliers"
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
              />}
            </div>
            <div className="studio-panel" hidden={studioTab !== "venues"}>
              {restored && (
                <VenueExplorer
                  matches={discovery?.placeMatches ? undefined : discovery?.venues}
                  placeMatches={discovery?.placeMatches?.venues}
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
                  onRequests={() => openBookings("venues")}
                  onVisualise={() => {
                    patchBrief({ venueChoice: "have" });
                    switchStudioTab("wedding");
                    setTimeout(
                      () =>
                        document.getElementById("plan-venue")?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        }),
                      0,
                    );
                  }}
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

                studioTab === "boards" || studioTab === "looks" ||
                studioTab === "orders"
              }
              className={`${studioTab === "venues" || studioTab === "wedding" ||  studioTab === "boards" || studioTab === "looks" || studioTab === "orders" ? "hidden" : "grid"} gap-5 ${basket.length ? "lg:grid-cols-[minmax(0,1fr)_340px]" : "lg:grid-cols-1"} lg:items-start`}
            >
              {/* Catalogue first, optional visualiser below. */}
              <div className="min-w-0 space-y-5">
                {venueScope && <VenueSupplierJourney name={venueScope.name} slug={venueScope.slug} policy={venueScope.policy} inStudio/>}
                {/* Marketplace catalogue */}
                <div
                  ref={productBrowserRef}
                  hidden={studioTab === "visualiser"}
                  className="studio-panel overflow-hidden rounded-3xl border border-sand bg-white shadow-sm"
                >
                  {venueScope?.policy.mode!=="venue_only" && <>
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
                  {studioTab === "catalogue" && !params.get("product") && <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand p-4 sm:p-5">
                    <p className="text-sm text-ink/70">
                      {previewSelection.itemIds.length
                        ? `${previewSelection.itemIds.length} preview ${previewSelection.itemIds.length === 1 ? "product" : "products"} for ${activeEventName}`
                        : "Choose products for a preview. Your basket stays separate."}
                    </p>
                    <button
                      type="button"
                      onClick={openVisualiser}
                      disabled={!workspaceLoaded || workspaceSaving}
                      className="min-h-11 rounded-full bg-ink px-5 py-3 text-sm text-cream disabled:opacity-40"
                    >
                      {previewSelection.itemIds.length ? "Visualise selected" : "Open visualiser"}
                    </button>
                  </div>}
                  <ProductBrowser
                    selectedVisualiserIds={previewSelection.itemIds}
                    onVisualise={toggleVisualiserProduct}
                    matches={discovery?.placeMatches ? undefined : discovery?.suppliers}
                    placeMatches={discovery?.placeMatches?.suppliers}
                    searchRadius={searchRadius}
                    styleId={brief.styleId}
                    basket={basket}
                    weddingDate={brief.weddingDate}
                    deliverySameDay={brief.deliverySameDay}
                    deliveryDate={brief.deliveryDate}
                    returnDate={brief.returnDate}
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
                  </>}
                </div>
                <div
                  ref={visualiserRef}
                  hidden={studioTab !== "visualiser"}
                  className="studio-panel scroll-mt-28 space-y-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4 px-1 py-2">
                    <div>
                      <h1 className="font-serif text-3xl sm:text-4xl">
                        AI visualiser
                      </h1>
                      <p className="mt-2 text-sm text-ink/60">
                        Choose a venue photo and preview the products selected for this event.
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
                  <div id="studio-visualiser">
                    {partnerError && (
                      <p role="alert" className="p-4 text-sm">
                        {partnerError}
                      </p>
                    )}{" "}
                    <RenderStage
                      key={activeEventId}
                      initialScene={
                        eventPlans.find((e) => e.id === activeEventId)?.kind ===
                        "ceremony"
                          ? "ceremony"
                          : eventPlans.find((e) => e.id === activeEventId)
                                ?.kind === "party"
                            ? "party"
                            : "reception"
                      }
                      onGeneratingChange={setGenerationBusy}
                      onBrowseProducts={() => switchStudioTab("catalogue")}
                      onRemoveItem={removePreviewItem}
                      venue={headerVenue}
                      uploadedImages={brief.uploadedImages}
                      style={style}
                      styleName={styleName}
                      renderUrl={currentRender?.url ?? null}
                      renderId={renderId}
                      versions={versions}
                      boardInspiration={boardInspiration}
                      itemIds={previewSelection.itemIds}
                      selectionMode={previewSelection.mode}
                      environment={previewSelection.environment}
                      tentColour={previewSelection.tentColour}
                      onEnvironment={(environment) => {setWorkspaceTouched(true);setPreviewSelection(selection=>({...selection,environment}));}}
                      onTentColour={(tentColour) => {setWorkspaceTouched(true);setPreviewSelection(selection=>({...selection,tentColour}));}}
                      onSelectionMode={changePreviewMode}
                      deliveryDate={deliveryDay(brief)}
                      weddingDate={brief.weddingDate}
                      onWeddingDate={(d) => patchBrief({ weddingDate: d })}
                      guestCount={brief.guestCount}
                      onRender={showRender}
                      onDeleteVersion={deleteVersion}
                      onStyle={(styleId) => {
                        if (workspaceLock.current || activeEventRef.current !== activeEventId) return;
                        setWorkspaceTouched(true);
                        setBrief((previous) => ({ ...previous, styleId }));
                      }}
                      onVenue={(id) =>
                        patchBrief({ venueId: id, venueChoice: "exploring" })
                      }
                      onAddAngle={(photo) => patchBrief({
                        uploadedImages: [...brief.uploadedImages, photo],
                      })}
                      onRemoveAngle={removeAngle}
                      onShopLook={(itemId) => {
                        setLookProductId(itemId||null);
                        lookProductsRef.current?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                      }}
                      isSaved={isCurrentSaved}
                      onToggleSave={toggleSaveCurrent}
                      saveBusy={!!renderId && busyLooks.has(renderId)}
                      saveError={lookError}
                    />
                  </div>
                  <div ref={lookProductsRef} className="scroll-mt-24">
                    <LookProducts
                      openProductId={lookProductId}
                      onCloseProduct={()=>setLookProductId(null)}
                      wide={basket.length === 0}
                      selectedIds={previewSelection.itemIds}
                      selectedVisualiserIds={previewSelection.itemIds}
                      onVisualise={toggleVisualiserProduct}
                      itemIds={currentRender?.itemIds || []}
                      report={currentRender?.look}
                      illustrative={currentRender?.id === "placeholder"}
                      styleId={currentRender?.demoStyleId || style.id}
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
                      onChangeDates={() => switchStudioTab("wedding")}
                    />
                  </div>
                </div>
              </div>

              {/* Show the basket beside the work once it has selections. */}
              {basket.length > 0 && (
                <div className="hidden lg:sticky lg:top-20 lg:block">
                  <div className="overflow-hidden rounded-3xl border border-sand bg-white shadow-sm lg:h-[calc(100vh-6rem)]">
                    <BasketPanel
                      basket={basket}
                      guestCount={brief.guestCount}
                      budget={budgetUnset ? null : brief.budget}
                      weddingDate={brief.weddingDate}
                      deliveryDate={deliveryDay(brief)}
                      returnDate={brief.returnDate}
                      onItemDates={setItemDates}
                      onQty={setQty}
                      onRemove={removeItem}
                      onChangeDates={() => switchStudioTab("wedding")}
                      onBrowse={() => switchStudioTab("catalogue")}
                      onCheckout={() => setStep("checkout")}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {step === "checkout" && (
          <CheckoutStep
            venueSlug={brief.venueId.startsWith("listing:")?brief.venueId.slice(8):undefined}
            key={activeEventId}
            eventName={
              eventPlans.find((e) => e.id === activeEventId)?.name ||
              "Wedding day"
            }
            basket={basket}
            onItemDates={setItemDates}
            weddingDate={brief.weddingDate}
            onWeddingDate={(d) => patchBrief({ weddingDate: d })}
            deliverySameDay={brief.deliverySameDay}
            deliveryDate={brief.deliveryDate}
            returnDate={brief.returnDate}
            onDates={patchBrief}
            styleId={brief.styleId}
            guestCount={brief.guestCount}
            venueLabel={venue.name}
            onBack={() => setStep("studio")}
            onOrdered={() => {
              setBasket([]);
              void saveWorkspace(boards, undefined, []);
            }}
          />
        )}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-sand pt-4 text-xs text-ink/70">
          <SupportButton label="Ask a question or contact support" className="min-h-11 text-left text-sm underline underline-offset-4" />
          <div className="flex flex-wrap gap-4"><a href="/service-info" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center">Service information ↗</a><a href="/privacy" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center">Privacy ↗</a><a href="/terms" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center">Terms ↗</a></div>
        </div>
      </main>

      {step === "studio" && (
        <StudioNavigation
          venueSuppliers={venueScope?.policy.mode==="venue_only"||venueScope?.policy.mode==="venue_partners"}
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
            budget={budgetUnset ? null : brief.budget}
            weddingDate={brief.weddingDate}
            deliveryDate={deliveryDay(brief)}
            returnDate={brief.returnDate}
            onItemDates={setItemDates}
            onQty={setQty}
            onRemove={removeItem}
            onChangeDates={() => {
              setMobileBasketOpen(false);
              switchStudioTab("wedding");
            }}
            onBrowse={() => {
              setMobileBasketOpen(false);
              switchStudioTab("catalogue");
            }}
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
