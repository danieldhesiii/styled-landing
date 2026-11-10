"use client";
import {useCatalogue} from "@/components/catalogue/CatalogueProvider";

import { useEffect, useId, useRef, useState } from "react";
import type { SampleVenue, StylePreset } from "@/lib/types";
import { SAMPLE_VENUES, STYLES, getStyle } from "@/lib/styles";
import { SCENES, DEFAULT_SCENE, type SceneId } from "@/lib/scenes";
import { uploadVenuePhoto } from "@/lib/upload-venue-photo";
import type { LookReport } from "@/lib/look";
import ContextHelp from "@/components/ui/ContextHelp";
import LookReportPanel from "@/components/design/LookReportPanel";

export interface RenderRef {
  id: string;
  url: string;
  originalUrl?: string;
  /** Catalogue item ids that make up this render — the "what's in the picture" list. */
  itemIds?: string[];
  demoStyleId?: string;
  /** What the picture was built from: pieces in it, pieces left out and why. */
  look?: LookReport;
}

import type { BoardInspiration } from "@/lib/board-inspiration";

interface Props {
  initialScene?: SceneId;
  onGeneratingChange?: (busy: boolean) => void;
  boardInspiration?: BoardInspiration | null;
  venue: SampleVenue;
  uploadedImages: { id: string; url: string }[];
  style: StylePreset;
  /** Display name for the committed look — "Your design" when no preset was used. */
  styleName: string;
  renderUrl: string | null;
  renderId: string | null;
  versions: RenderRef[];
  itemIds: string[];
  selectionMode?: "manual" | "auto";
  onSelectionMode?: (mode: "manual" | "auto") => void;
  onBrowseProducts?: () => void;
  onRemoveItem?: (id: string) => void;
  guestCount: number;
  /** The couple's wedding date (YYYY-MM-DD or ""), so a render only uses what's free on it. */
  weddingDate: string;
  deliveryDate?: string;
  onWeddingDate: (date: string) => void;
  isSaved: boolean;
  saveBusy?: boolean;
  saveError?: string;
  onRender: (render: RenderRef | null) => void;
  /** Remove a generated version from the strip. */
  onDeleteVersion: (id: string) => void;
  /** A style id, or "none" for a description-led look. */
  onStyle: (id: string) => void;
  onVenue: (venueId: string) => void;
  onAddAngle: (photo: { id: string; url: string }) => void;
  /** Remove an uploaded venue photo (and its stored file). */
  onRemoveAngle: (id: string) => void;
  /** Reveal the "Shop this look" list of pieces that make up this render. */
  onShopLook: (itemId?:string) => void;
  onToggleSave: () => void;
}

// Example venues shown in the empty state so couples can try the studio without
// uploading a photo first. Each pre-fills a description and sets the sample
// venue — the generate API uses the venue image when no upload is present.
const EXAMPLE_VENUES = [
  {
    id: "manor_orangery",
    label: "Manor Orangery",
    image: "/img/venues/manor_orangery.png",
    description:
      "Romantic garden reception in a light, airy orangery with blush and ivory florals, round tables with white linen, trailing greenery and warm candlelight throughout",
  },
  {
    id: "oak_barn",
    label: "Oak Barn",
    image: "/img/venues/oak_barn.png",
    description:
      "Rustic barn reception with exposed oak beams, loose wildflowers, festoon lights, wooden trestle tables and warm earthy tones",
  },
] as const;

// The mood each preset gives a render. These mirror the style direction sent to
// the image model. They describe colour and feeling, not objects: which pieces
// appear depends on what's in stock for the couple's date.
const STYLE_BLURBS: Record<string, string> = {
  garden_romance:
    "Romantic, soft and abundant: blush, ivory, soft gold and fresh greenery in a warm, candlelit glow.",
  classic_elegance:
    "Refined, formal and black-tie: ivory, white and gold with crisp, polished finishes.",
  modern_minimal:
    "Clean and contemporary: white and soft greige with sculptural, architectural restraint.",
  rustic_barn:
    "Relaxed, natural and warm: sage, meadow colours and warm wood with a loose, undone charm.",
};

export default function RenderStage({
  boardInspiration,
  venue,
  uploadedImages,
  style,
  styleName,
  renderUrl,
  renderId,
  versions,
  itemIds,
  selectionMode = "manual",
  onSelectionMode,
  onBrowseProducts,
  onRemoveItem,
  guestCount,
  weddingDate,
  deliveryDate,
  onWeddingDate,
  isSaved,
  saveBusy = false,
  saveError = "",
  onRender,
  onDeleteVersion,
  onStyle,
  onVenue: _onVenue,
  onAddAngle,
  onRemoveAngle,
  onShopLook,
  onToggleSave,
  initialScene = DEFAULT_SCENE,
  onGeneratingChange,
}: Props) {
  const catalogueState=useCatalogue();
  const selectionError = selectionMode === "manual" && [...new Set(itemIds)].filter(id => id.startsWith("demo-crescent-moon-")).length > 1
    ? "Use one reference lighting design per preview."
    : selectionMode === "manual" && new Set(itemIds).size > 12 ? "Use up to 12 products per preview." : "";
  const venueOnly=catalogueState.scope?.policy.mode==="venue_only";
  const currentLook=versions.find(v=>v.id===renderId)?.look;
  const inheritedSupplier=currentLook?.supplierId;

  const fieldId = useId();
  const descriptionId = `${fieldId}-description`;
  const changeId = `${fieldId}-change`;
  const illustrationId = `${fieldId}-illustration`;
  const saveErrorId = `${fieldId}-save-error`;
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);
  useEffect(() => { onGeneratingChange?.(sending); }, [sending, onGeneratingChange]);
  const [showGenPanel, setShowGenPanel] = useState(false);
  // "new" generates a fresh look from the venue photo (clears the current render);
  // "tweak" edits the render that's showing, keeping everything the change doesn't
  // mention. Tweak is only offered once a render exists.
  const [panelMode, setPanelMode] = useState<"new" | "tweak">("new");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [primaryPhoto, setPrimaryPhoto] = useState(0);
  const [showOriginal, setShowOriginal] = useState(false);
  // "single" shows one image with the before/after filmstrip; "split" shows the
  // original and the styled render side by side (original left, styled right).
  const [compareMode, setCompareMode] = useState<"single" | "split">("single");
  // After a fresh render, nudge the couple towards the Shop-this-look list.
  const [showShopPrompt, setShowShopPrompt] = useState(false);
  // Why a generation didn't happen (declined, failed or timed out), shown to the
  // couple so a failed render never looks like nothing happened.
  const [genError, setGenError] = useState<string | null>(null);
  // The style selected in the panel for the NEXT generation. Kept separate from
  // the committed style so browsing presets doesn't wipe the current render.
  const [draftStyleId, setDraftStyleId] = useState(style.id);
  // Which wedding scene we're setting the room up for (reception, ceremony,
  // party, drinks, proposal).
  const [setting, setSetting] = useState<SceneId>(initialScene);
  const [improving, setImproving] = useState(false);
  const [descriptionBeforeImprove, setDescriptionBeforeImprove] = useState<string | null>(null);
  const descriptionRef = useRef(description);
  descriptionRef.current = description;
  const [improveError, setImproveError] = useState<string | null>(null);
  // Restore the saved sample from the authoritative event venue, never local
  // example state left behind by a different room or event.
  const activeExample = uploadedImages.length === 0
    ? EXAMPLE_VENUES.find(example => example.id === venue.id) ?? null
    : null;
  const fileRef = useRef<HTMLInputElement>(null);
  const venueStageRef = useRef<HTMLDivElement>(null);
  const selectionStageRef = useRef<HTMLElement>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const primary = Math.min(
    primaryPhoto,
    Math.max(0, uploadedImages.length - 1),
  );
  const live = useRef({ styleId: style.id, venueId: venue.id });
  live.current = { styleId: style.id, venueId: venue.id };

  const uploadedPreview = uploadedImages[primary]?.url ?? null;
  const samplePreview = uploadedImages.length === 0
    ? SAMPLE_VENUES.find(sample => sample.id === venue.id)?.image ?? null
    : null;
  const partnerPreview = venue.id.startsWith("listing:")
    ? (venue.image ?? null)
    : null;
  const originalImage = uploadedPreview ?? partnerPreview ?? samplePreview;
  const previewImage = renderUrl ?? originalImage;

  // Keep the draft style in sync with the committed style (e.g. after a render
  // commits, or state is restored).
  useEffect(() => {
    setDraftStyleId(style.id);
  }, [style.id]);

  useEffect(() => {
    if (originalImage && !renderUrl) setShowGenPanel(true);
  }, [originalImage, renderUrl]);

  // Collapse the panel and reset compare when a render arrives.
  useEffect(() => {
    if (renderUrl) {
      setShowGenPanel(false);
      setShowOriginal(false);
    }
  }, [renderUrl]);

  const selectionSignature = JSON.stringify([selectionMode, [...new Set(itemIds)].sort()]);
  const previousSelection = useRef(selectionSignature);
  useEffect(() => {
    if (previousSelection.current === selectionSignature) return;
    previousSelection.current = selectionSignature;
    setPanelMode("new");
    setGenError(null);
    setShowGenPanel(true);
  }, [selectionSignature]);

  // Ask the server to rewrite the couple's rough note into a fuller styling
  // brief, then drop it back into the box for them to tweak before generating.
  async function improveDescription() {
    const original = description;
    const current = original.trim();
    if (!current || improving) return;
    setImproving(true);
    setImproveError(null);
    try {
      const res = await fetch("/api/improve-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: current,
          styleId: draftStyleId || "none",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setImproveError(
          data?.error ?? "Couldn't improve that just now. Try again.",
        );
      } else if (typeof data.prompt === "string" && data.prompt.trim()) {
        // A slow helper response must not overwrite edits made while it ran.
        if (descriptionRef.current !== original) return;
        if (data.prompt.trim() !== current) {
          setDescriptionBeforeImprove(original);
          setDescription(data.prompt.trim());
        }
        if (data.changed === false) {
          setImproveError(
            "That already reads well. Tweak it or generate when ready.",
          );
        }
      }
    } catch {
      setImproveError(
        "Couldn't reach the writing helper. Check your connection.",
      );
    } finally {
      setImproving(false);
    }
  }

  // Open the generate panel in a given mode, starting from a clean note so a
  // leftover new-look brief never becomes a tweak instruction (or vice versa).
  function openPanel(mode: "new" | "tweak") {
    setPanelMode(mode);
    setDescription("");
    setDescriptionBeforeImprove(null);
    setGenError(null);
    setImproveError(null);
    setShowGenPanel(true);
  }

  // Generate a render. With `parentRenderId` this is a *tweak*: the model edits
  // that render in place (keeping the room, angle, lighting and everything the
  // note doesn't mention) and the result lands as a new version. Otherwise it's a
  // fresh look from the venue photo, which replaces the current render.
  async function generate(
    useStyleId: string,
    opts?: { parentRenderId?: string; promptOverride?: string },
  ) {
    if (sending || improving) return;
    if (selectionError && !venueOnly) {
      setGenError(selectionError);
      return;
    }
    if (selectionMode === "manual" && !itemIds.length && !venueOnly) {
      setGenError("Choose products or select Choose for me.");
      return;
    }
    const refining = !!opts?.parentRenderId;
    // Commit style only after success, so a failed request keeps the current look.
    setSending(true);
    setGenError(null);
    const sentFor = { styleId: useStyleId, venueId: venue.id };

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: [
            opts?.promptOverride ?? description.trim(),
            !refining && boardInspiration?.notes
              ? `Board mood notes: ${boardInspiration.notes}`
              : "",
          ]
            .filter(Boolean)
            .join(". "),
          styleId: useStyleId,
          venueId: venue.id,
          images: uploadedImages.map((p) => p.url),
          photoIds: uploadedImages.map((p) => p.id),
          inspirationPhotoIds: refining ? [] : boardInspiration?.photoIds || [],
          itemIds: selectionMode === "manual" ? itemIds : [],
          selectionMode: venueOnly ? "auto" : selectionMode,
          supplierId: refining ? inheritedSupplier : null,
          guestCount,
          weddingDate: weddingDate || undefined,
          deliveryDate: deliveryDate || undefined,
          primaryIndex: primary,
          setting,
          ...(opts?.parentRenderId
            ? { parentRenderId: opts.parentRenderId }
            : {}),
        }),
      });
      const data = await res.json().catch(() => null);

      if (res.status === 202 && data?.renderId) {
        const done = await waitForRender(data.renderId);
        if (!mounted.current) return;
        if (live.current.venueId !== sentFor.venueId) {
          setShowGenPanel(true);
        } else {
          if (!refining) onStyle(useStyleId);
          onRender({
            id: data.renderId,
            url: done.imageUrl,
            itemIds: done.itemIds,
            look: done.look,
          });
          setShowShopPrompt(true);
        }
      } else if (mounted.current && res.ok && data?.imageUrl && live.current.venueId === sentFor.venueId) {
        if (!refining) onStyle(useStyleId);
        onRender({
          id: data.renderId ?? "placeholder", url: data.imageUrl,
          itemIds: data.itemIds, look: data.look,
          ...(!data.renderId ? { demoStyleId: useStyleId } : {}),
        });
        setShowShopPrompt(true);
      } else {
        // The server declined (e.g. a render is still in flight, a daily limit,
        // or a bad request). Show why instead of silently doing nothing.
        setGenError(
          data?.error ??
            "Couldn't start your render. Please try again in a moment.",
        );
        setShowGenPanel(true);
      }
    } catch (err) {
      // The render itself failed or timed out, or the network dropped — tell the user.
      setGenError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
      setShowGenPanel(true);
    } finally {
      setSending(false);
    }
  }

  async function waitForRender(
    id: string,
  ): Promise<{ imageUrl: string; itemIds?: string[]; look?: LookReport }> {
    const deadline = Date.now() + 7 * 60 * 1000;
    let failures = 0;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 2000));
      let data;
      try {
        data = await (await fetch(`/api/renders/${id}`)).json();
        failures = 0;
      } catch {
        if (++failures >= 4) throw new Error("Connection lost.");
        continue;
      }
      if (data?.status === "succeeded" && data.imageUrl)
        return {
          imageUrl: data.imageUrl,
          itemIds: data.itemIds,
          look: data.look ?? undefined,
        };
      if (data?.status === "failed" || data?.ok === false) {
        throw new Error(data?.error ?? "Render failed.");
      }
    }
    throw new Error("Timed out.");
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const photo = await uploadVenuePhoto(file, { append: true });
      onAddAngle({ id: photo.id, url: photo.url });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  const [downloading, setDownloading] = useState(false);

  // Save the current render to the couple's device. Signed URLs are cross-origin,
  // so fetch the bytes and download a blob (the download attribute is ignored
  // cross-origin); fall back to opening the image if that's blocked.
  async function downloadRender() {
    if (!renderUrl || downloading) return;
    setDownloading(true);
    try {
      const res = await fetch(renderUrl);
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `styled-${style.id}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch {
      window.open(renderUrl, "_blank", "noopener");
    } finally {
      setDownloading(false);
    }
  }

  // The image to actually display (before/after toggle).
  const displayImage = showOriginal ? originalImage : previewImage;
  // Side-by-side compare is only possible once we have both a render and an
  // original to compare it against.
  const canSplit = !!renderUrl && !!originalImage;
  const splitView = canSplit && compareMode === "split";

  // Shared overlays, used by both the single and side-by-side image layouts.
  const generatingOverlay = sending && (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-ink/50 backdrop-blur-sm">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      <p className="text-sm text-white">Generating your look…</p>
    </div>
  );

  // A gentle pop-up after a fresh render, pointing the couple at the shop list.
  const shopPromptCard = showShopPrompt && renderUrl && (
    <div className="px-4 pb-4 animate-fade-in">
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-cream px-4 py-3">
        <span className="text-lg">🛍</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-ink">Your look is ready</p>
          <p className="text-[11px] leading-snug text-ink/55">
            {venueOnly?"Your venue coordinates its own suppliers. Use this image as inspiration to discuss with its team.":"Review the catalogue references below and add your favourites to your basket."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowShopPrompt(false);
            onShopLook();
          }}
          className="shrink-0 rounded-full bg-ink px-3 py-1.5 text-[11px] font-medium text-cream hover:bg-ink/90 transition-colors"
        >
          {venueOnly?"Venue suppliers →":"Shop this look →"}
        </button>
        <button
          type="button"
          onClick={() => setShowShopPrompt(false)}
          aria-label="Dismiss"
          className="shrink-0 text-ink/40 hover:text-ink transition-colors"
        >
          ×
        </button>
      </div>
    </div>
  );

  // The gradient action bar (Shop / Save / Download) that sits on the styled render.
  const actionBar = (
    <div className="border-t border-sand bg-white p-2 sm:absolute sm:inset-x-0 sm:bottom-0 sm:border-0 sm:bg-transparent sm:bg-gradient-to-t sm:from-ink/55 sm:to-transparent sm:px-4 sm:pb-3 sm:pt-8">
      <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-3">
        <span className="hidden rounded-full border border-white/40 bg-white/15 px-3 py-1 text-[11px] text-white backdrop-blur-sm sm:inline">
          {styleName}
        </span>
        <button
          type="button"
          onClick={() => onRender(null)}
          className="order-2 min-h-11 px-2 text-xs text-ink/65 underline-offset-2 hover:underline sm:order-none sm:min-h-0 sm:px-0 sm:text-[11px] sm:text-white/70"
        >
          Start over
        </button>
        <div className="grid w-full grid-cols-3 items-stretch gap-2 sm:ml-auto sm:flex sm:w-auto sm:items-center">
          <button
            type="button"
            onClick={()=>onShopLook()}
            title={venueOnly?"View your venue’s supplier guidance":"See the pieces that make up this look"}
            className="flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-clay bg-clay px-2 py-2 text-xs font-medium text-cream shadow-sm hover:bg-clay/90 sm:min-h-0 sm:px-3.5 sm:py-1 sm:text-[11px]"
          >
            <span aria-hidden="true">🛍</span> {venueOnly?"Venue suppliers":"Shop this look"}
          </button>
          <button
            type="button"
            onClick={onToggleSave}
            disabled={saveBusy}
            aria-busy={saveBusy}
            aria-describedby={saveError ? saveErrorId : undefined}
            aria-pressed={isSaved}
            title={saveBusy ? "Saving your change…" : isSaved ? "Remove from your saved looks" : "Save to your looks"}
            className={`flex min-h-11 items-center justify-center gap-1.5 rounded-full border px-2 py-2 text-xs transition-colors disabled:cursor-wait disabled:opacity-60 sm:min-h-0 sm:px-3 sm:py-1 sm:text-[11px] sm:backdrop-blur-sm ${isSaved ? "border-clay bg-clay text-cream" : "border-sand text-ink sm:border-white/40 sm:bg-white/15 sm:text-white sm:hover:bg-white/25"}`}
          >
            <span aria-hidden>{isSaved ? "♥" : "♡"}</span> {saveBusy ? "Saving…" : isSaved ? "Saved" : "Save"}
          </button>
          <button
            type="button"
            onClick={downloadRender}
            disabled={downloading}
            title="Download image"
            className="flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-sand px-2 py-2 text-xs text-ink disabled:opacity-60 sm:min-h-0 sm:border-white/40 sm:bg-white/15 sm:px-3 sm:py-1 sm:text-[11px] sm:text-white sm:backdrop-blur-sm sm:hover:bg-white/25"
          >
            <span>⤓</span> {downloading ? "Saving…" : "Download"}
          </button>
        </div>
      </div>
    </div>
  );

  const selectedIds = [...new Set(itemIds)];

  const currentStep = sending || showGenPanel ? 2 : renderUrl ? 3 : originalImage ? 2 : 1;

  return (
    <div className="overflow-hidden rounded-3xl border border-sand/80 bg-white motion-reduce:[&_*]:animate-none motion-reduce:[&_*]:transition-none">
      <div className="border-b border-sand/70 px-5 pb-3 pt-5 sm:px-7 sm:pt-6">
        <ol aria-label="Visualise progress" className="mx-auto flex max-w-lg">
          {["Venue", "Your selection", "Preview"].map((label, index) => {
            const step = index + 1;
            const active = currentStep === step;
            const complete = step < currentStep;
            return <li key={label} aria-current={active ? "step" : undefined} data-state={active ? "active" : complete ? "complete" : "upcoming"}
              className={`relative min-w-0 flex-1 after:absolute after:left-[calc(50%+1.25rem)] after:top-4 after:h-px after:w-[calc(100%-2.5rem)] last:after:hidden ${complete ? "after:bg-clay/60" : "after:bg-sand"}`}>
              <button type="button" disabled={sending || (step === 3 && !renderUrl)} aria-label={`${label}${complete ? ", complete" : ""}`}
                onClick={() => {
                  if (step === 1) venueStageRef.current?.scrollIntoView({ block: "center" });
                  if (step === 2) { openPanel("new"); selectionStageRef.current?.scrollIntoView({ block: "start" }); }
                  if (step === 3) setShowGenPanel(false);
                }}
                className="group relative z-10 flex min-h-16 w-full flex-col items-center gap-2 rounded-lg pb-2 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/50 disabled:cursor-default">
                <span aria-hidden="true" className={`flex h-8 w-8 items-center justify-center rounded-full border text-[11px] font-medium tabular-nums transition-colors duration-300 motion-reduce:transition-none ${active ? "border-ink bg-ink text-cream" : complete ? "border-clay/40 bg-cream text-clay" : "border-sand bg-white text-ink/40"}`}>
                  {complete ? <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5"><path d="m4 8 2.5 2.5L12 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> : `0${step}`}
                </span>
                <span className={`text-xs tracking-wide transition-colors duration-300 motion-reduce:transition-none ${active ? "font-medium text-ink" : complete ? "text-ink/70" : "text-ink/40"}`}>{label}</span>
              </button>
            </li>;
          })}
        </ol>
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-4">
          <p id={illustrationId} className="text-xs text-ink/50">AI preview</p>
          <ContextHelp title="Preview details" className="max-w-xl">
            <p>Generated images are inspiration, not exact product photographs or a guaranteed result. Scale, layout, quantities and details can differ. Check catalogue listings, dimensions and supplier photographs before booking. Confirm suitability, availability and delivery with suppliers in writing.</p>
          </ContextHelp>
        </div>
      </div>
      {!venueOnly && <section ref={selectionStageRef} aria-label="Selected products" className="scroll-mt-24 border-b border-sand/70 px-5 py-4 sm:px-7">
        <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
          <div role="group" aria-label="Product selection" className="inline-flex max-w-full rounded-full bg-cream p-1">
            {([['manual', 'Choose products'], ['auto', 'Choose for me']] as const).map(([mode, label]) => <button key={mode} type="button" aria-pressed={selectionMode === mode} disabled={sending || !onSelectionMode} onClick={() => onSelectionMode?.(mode)} className={`min-h-10 rounded-full px-3 text-xs font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/50 disabled:opacity-50 motion-reduce:transition-none sm:px-4 ${selectionMode === mode ? "bg-white text-ink shadow-[0_1px_4px_rgba(43,38,34,0.06)]" : "text-ink/55 hover:text-ink"}`}>{label}</button>)}
          </div>
          {selectionMode === "manual" && onBrowseProducts && <button type="button" onClick={onBrowseProducts} className="inline-flex min-h-11 items-center gap-2 text-xs font-medium text-clay underline-offset-4 transition-colors hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/50 motion-reduce:transition-none">Browse products <span aria-hidden="true">↗</span></button>}
        </div>
        {selectionMode === "auto" ? <p className="mt-3 text-sm text-ink/60">We’ll choose catalogue products from your description and style.</p> : selectedIds.length ? <ul aria-label={`${selectedIds.length} selected products`} className="mt-3 flex flex-wrap gap-2">
          {selectedIds.map(id => {
            const item = catalogueState.getItem(id);
            const name = item?.name || (catalogueState.loading ? "Loading product…" : "Product no longer listed");
            return <li key={id} className="inline-flex max-w-full items-center gap-2 rounded-full border border-sand/90 bg-white py-1 pl-1.5 pr-1 motion-safe:animate-fade-in">
              {item?.image ? <img src={item.image} alt="" className="h-8 w-8 shrink-0 rounded-full bg-cream object-contain p-1"/> : <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cream text-xs text-clay">{item?.icon || "·"}</span>}
              <span className="min-w-0 max-w-[10rem] truncate text-xs font-medium text-ink sm:max-w-[14rem]" title={name}>{name}{item && <span className="sr-only"> · {item.supplier}</span>}</span>
              {onRemoveItem && <button type="button" disabled={sending} onClick={() => onRemoveItem(id)} aria-label={`Remove ${name}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink/45 transition-colors hover:bg-cream hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/50 disabled:opacity-40 motion-reduce:transition-none"><span aria-hidden="true" className="text-lg">×</span><span className="sr-only">Remove</span></button>}
            </li>;
          })}
        </ul> : <p className="mt-3 text-sm text-ink/55">Choose the pieces you’d like to see in your room.</p>}
        {selectionError && <p role="alert" className="mt-3 text-sm text-clay">{selectionError}</p>}
      </section>}
      {saveError && <p id={saveErrorId} role="alert" className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{saveError}</p>}
      {/* ── ERROR BANNER ───────────────────────────────────────────── */}
      {genError && (
        <div className="flex items-start gap-2 border-b border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700">
          <span aria-hidden>⚠</span>
          <span className="flex-1 leading-snug">{genError}</span>
          <button
            type="button"
            onClick={() => setGenError(null)}
            aria-label="Dismiss"
            className="shrink-0 text-red-400 hover:text-red-700 transition-colors"
          >
            ×
          </button>
        </div>
      )}

      {/* ── IMAGE ──────────────────────────────────────────────────── */}
      <div ref={venueStageRef} className="relative mx-4 my-5 scroll-mt-24 overflow-hidden rounded-2xl bg-cream sm:mx-6 sm:my-6">
        {splitView ? (
          /* ── SIDE-BY-SIDE COMPARE: original left, styled right ─────── */
          <>
            <div className="grid grid-cols-2">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={originalImage!}
                  alt="Your original venue"
                  className="aspect-video w-full motion-safe:animate-fade-in object-contain"
                />
                <div className="absolute left-3 top-3 rounded-full bg-ink/55 px-3 py-1 text-[11px] text-cream backdrop-blur-sm">
                  Original
                </div>
              </div>
              <div className="relative border-l border-white/50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewImage!}
                  alt="Illustrative AI preview of your venue"
                  className="aspect-video w-full motion-safe:animate-fade-in object-contain"
                />
                <div className="absolute right-3 top-3 rounded-full bg-ink/55 px-3 py-1 text-[11px] text-cream backdrop-blur-sm">
                  Styled · {styleName}
                </div>
              </div>
            </div>
            {actionBar}
            {generatingOverlay}
          </>
        ) : displayImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={displayImage}
              src={displayImage}
              alt={showOriginal || !renderUrl ? "Original venue photo" : "Illustrative AI preview of your venue"}
              className="block h-auto max-h-[45svh] w-full motion-safe:animate-fade-in object-contain sm:max-h-none"
            />

            {/* Top-left label */}
            <div className="absolute left-3 top-3 rounded-full bg-ink/55 px-3 py-1 text-[11px] text-cream backdrop-blur-sm">
              {showOriginal
                ? "Your venue · before"
                : renderUrl
                  ? styleName
                  : activeExample
                    ? `Example · ${activeExample.label}`
                    : venue.id.startsWith("listing:")
                      ? venue.name
                      : "Your venue"}
            </div>

            {/* Example switcher — bottom-left overlay when showing an example with no render */}
            {activeExample && !renderUrl && (
              <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
                {(
                  EXAMPLE_VENUES as ReadonlyArray<
                    (typeof EXAMPLE_VENUES)[number]
                  >
                )
                  .filter((ex) => ex.id !== activeExample.id)
                  .map((ex) => (
                    <button
                      key={ex.id}
                      type="button"
                      title={`Switch to ${ex.label}`}
                      onClick={() => {
                        _onVenue(ex.id);
                        setDescription(ex.description);
                        setPanelMode("new");
                        setShowGenPanel(true);
                      }}
                      className="group relative h-9 w-12 overflow-hidden rounded-lg border-2 border-white/60 shadow-md hover:border-white transition-colors"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={ex.image}
                        alt={ex.label}
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-ink/50 to-transparent pb-0.5 text-[9px] leading-none text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        {ex.label}
                      </span>
                    </button>
                  ))}
                <button
                  type="button"
                  onClick={() => {
                    fileRef.current?.click();
                  }}
                  className="text-[10px] text-white/70 hover:text-white transition-colors"
                  title="Use your own photo"
                >
                  × own photo
                </button>
              </div>
            )}

            {/* Style badge + actions — only on the styled render */}
            {renderUrl && !showOriginal && actionBar}

            {generatingOverlay}
          </>
        ) : (
          /* ── EMPTY STATE ─────────────────────────────────────────── */
          <div className="aspect-video flex flex-col items-center justify-center gap-4 px-8 text-center">
            {sending ? (
              <>
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-clay/30 border-t-clay" />
                <p className="font-serif text-xl text-ink">
                  Generating your look…
                </p>
                <p className="text-sm text-ink/50">
                  This usually takes about 30 seconds.
                </p>
              </>
            ) : (
              <>
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-clay/40">
                  <svg
                    className="h-7 w-7 text-clay/50"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3 20.25h18M16.5 3.75a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5Z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-serif text-2xl text-ink">
                    Add a venue photo
                  </p>
                  <p className="mt-2 max-w-sm text-sm text-ink/50">
                    Upload your room or try an example, then choose products and a style.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="rounded-full bg-clay px-7 py-2.5 text-sm font-medium text-cream hover:bg-clay/90 transition-colors"
                >
                  Upload venue photo
                </button>
                {/* Example venue thumbnails — click to try without uploading */}
                <div className="flex items-center gap-2.5">
                  <span className="text-[11px] text-ink/35">
                    or try an example:
                  </span>
                  {EXAMPLE_VENUES.map((ex) => (
                    <button
                      key={ex.id}
                      type="button"
                      title={ex.label}
                      onClick={() => {
                        _onVenue(ex.id);
                        setDescription(ex.description);
                        setPanelMode("new");
                        setShowGenPanel(true);
                      }}
                      className="group relative h-10 w-14 overflow-hidden rounded-lg border-2 border-sand hover:border-clay/70 transition-colors"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={ex.image}
                        alt={ex.label}
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-ink/50 to-transparent pb-0.5 text-[9px] leading-none text-white opacity-0 transition-opacity group-hover:opacity-100">
                        {ex.label}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {shopPromptCard}
      {/* ── WHAT'S IN THIS PICTURE ─────────────────────────────────── */}
      {selectionMode === "auto" && renderUrl &&
        !showOriginal &&
        versions.find((v) => v.id === renderId)?.look && (
          <LookReportPanel
            onOpenProduct={onShopLook}
            look={versions.find((v) => v.id === renderId)!.look!}
            weddingDate={weddingDate}
            onWeddingDate={onWeddingDate}
          />
        )}

      {/* ── COMPARE / VERSIONS BAR ─────────────────────────────────── */}
      {/* A clear filmstrip: the original venue photo plus every look you've made.
          Tap any one to view it full-size above — this is the compare & history. */}
      {renderUrl && (
        <div className="border-t border-sand px-4 py-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-ink/50">Compare</span>
            <span className="text-[11px] text-ink/35">
              tap to view · × to remove a version
            </span>
            {canSplit && (
              <div className="ml-auto flex overflow-hidden rounded-full border border-sand text-[11px]">
                <button
                  type="button"
                  onClick={() => setCompareMode("single")}
                  className={`px-3 py-1 transition-colors ${compareMode === "single" ? "bg-clay text-cream" : "text-ink/55 hover:text-ink"}`}
                >
                  Single
                </button>
                <button
                  type="button"
                  onClick={() => setCompareMode("split")}
                  className={`px-3 py-1 transition-colors ${compareMode === "split" ? "bg-clay text-cream" : "text-ink/55 hover:text-ink"}`}
                >
                  Side by side
                </button>
              </div>
            )}
          </div>
          <div className="flex items-end gap-2.5 overflow-x-auto pb-1">
            {/* Original */}
            {originalImage && (
              <button
                type="button"
                onClick={() => setShowOriginal(true)}
                aria-pressed={showOriginal}
                className="shrink-0 text-center"
                title="Your original venue"
              >
                <span
                  className={`block h-14 w-20 overflow-hidden rounded-lg border-2 transition-colors ${showOriginal ? "border-clay" : "border-sand hover:border-clay/50"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={originalImage}
                    alt="Original venue"
                    className="h-full w-full object-cover"
                  />
                </span>
                <span
                  className={`mt-1 block text-[10px] ${showOriginal ? "text-clay" : "text-ink/45"}`}
                >
                  Original
                </span>
              </button>
            )}
            {/* Each generated version, oldest first */}
            {versions.map((v, i) => {
              const active = !showOriginal && v.id === renderId;
              return (
                <div key={v.id} className="group relative shrink-0 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setShowOriginal(false);
                      onRender(v);
                    }}
                    aria-pressed={active}
                    className="block"
                    title={`Version ${i + 1}`}
                  >
                    <span
                      className={`block h-14 w-20 overflow-hidden rounded-lg border-2 transition-colors ${active ? "border-clay" : "border-sand hover:border-clay/50"}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={v.url}
                        alt={`Version ${i + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </span>
                    <span
                      className={`mt-1 block text-[10px] ${active ? "text-clay" : "text-ink/45"}`}
                    >
                      Version {i + 1}
                    </span>
                  </button>
                  {/* Remove this version from the strip. */}
                  <button
                    type="button"
                    onClick={() => onDeleteVersion(v.id)}
                    aria-label={`Delete version ${i + 1}`}
                    title="Delete this version"
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-sand bg-white text-ink/50 shadow-sm hover:border-clay hover:text-clay transition-colors"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ROOM PHOTO ROW ─────────────────────────────────────────── */}
      <div className="border-t border-sand px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-0.5 text-xs text-ink/40">Room</span>
          {uploadedImages.map((p, i) => (
            <div key={p.id} className="group relative h-11 w-11">
              <button
                type="button"
                onClick={() => setPrimaryPhoto(i)}
                aria-pressed={i === primary}
                title={i === primary ? "Primary view" : "Use as primary view"}
                className={`h-11 w-11 overflow-hidden rounded-lg border-2 transition-colors ${i === primary ? "border-clay" : "border-sand hover:border-clay/50"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt={`Angle ${i + 1}`}
                  className="h-full w-full object-cover"
                />
              </button>
              <button
                type="button"
                onClick={() => onRemoveAngle(p.id)}
                aria-label={`Remove angle ${i + 1}`}
                title="Remove photo"
                className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-sand bg-white text-[10px] leading-none text-ink/50 opacity-0 shadow-sm transition-opacity hover:text-clay group-hover:opacity-100 focus:opacity-100"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex h-11 w-11 flex-col items-center justify-center rounded-lg border border-dashed border-sand text-ink/40 hover:border-clay hover:text-clay transition-colors"
            title="Upload venue photo"
          >
            <span className="text-lg leading-none">+</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFiles}
            className="hidden"
          />
          <span
            className={`ml-1 text-[11px] ${uploadError ? "text-clay" : "text-ink/35"}`}
          >
            {uploading
              ? "Uploading…"
              : (uploadError ??
                (uploadedImages.length > 0
                  ? "Add more angles to help us understand the room"
                  : "Upload your venue photos"))}
          </span>
        </div>
      </div>

      {/* ── GENERATE PANEL ─────────────────────────────────────────── */}

      {/* Hide panel only when nothing is ready to work with */}
      {!uploadedImages.length &&
      !renderUrl &&
      !showGenPanel &&
      !activeExample ? null : renderUrl && !showGenPanel ? (
        /* Collapsed — tweak the current look, or start a fresh style */
        <div className="flex gap-2 border-t border-sand px-4 py-3">
          <button
            type="button"
            onClick={() => openPanel("tweak")}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-ink py-2.5 text-sm font-medium text-cream hover:bg-ink/90 transition-colors"
          >
            <span>✎</span> Tweak this look
          </button>
          <button
            type="button"
            onClick={() => openPanel("new")}
            className="flex flex-1 items-center justify-center gap-2 rounded-full border border-sand py-2.5 text-sm font-medium text-ink/60 hover:border-clay hover:text-ink transition-colors"
          >
            <span>↺</span> New style
          </button>
        </div>
      ) : showGenPanel ? (
        <div className="border-t border-sand/70 px-5 py-6 motion-safe:animate-fade-in sm:px-7">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-serif text-2xl tracking-tight text-ink">
              {!renderUrl
                ? "Preview your setup"
                : panelMode === "tweak"
                  ? "Tweak this look"
                  : "New style"}
            </h3>
            {/* Cancel back to the render (when a render exists), but don't show
                a close button when an example is active — mirrors the uploaded-photo
                experience where the panel stays open until you generate. */}
            {(renderUrl || (!uploadedImages.length && !activeExample)) && (
              <button
                type="button"
                onClick={() => setShowGenPanel(false)}
                className="text-xs text-ink/40 hover:text-ink transition-colors"
              >
                {renderUrl ? "Cancel" : "✕ Close"}
              </button>
            )}
          </div>

          {/* Mode toggle — edit the current render, or start a fresh look. Only
              meaningful once a render exists to tweak. */}
          {renderUrl && (
            <div className="mb-4 flex overflow-hidden rounded-full border border-sand text-xs">
              <button
                type="button"
                onClick={() => openPanel("tweak")}
                aria-pressed={panelMode === "tweak"}
                className={`flex-1 px-3 py-1.5 transition-colors ${panelMode === "tweak" ? "bg-clay text-cream" : "text-ink/55 hover:text-ink"}`}
              >
                ✎ Tweak this look
              </button>
              <button
                type="button"
                onClick={() => openPanel("new")}
                aria-pressed={panelMode === "new"}
                className={`flex-1 px-3 py-1.5 transition-colors ${panelMode === "new" ? "bg-clay text-cream" : "text-ink/55 hover:text-ink"}`}
              >
                ↺ New style
              </button>
            </div>
          )}

          {renderUrl && panelMode === "tweak" ? (
            /* ── TWEAK: a small change to the render that's showing ───────── */
            <>
              <p className="mb-4 text-xs leading-relaxed text-ink/50">
                Describe your changes. Compare versions with your original photo.
              </p>
              <div className="mb-4">
                <label htmlFor={changeId} className="mb-2 block text-xs font-medium text-ink/60">
                  What would you like to change?
                </label>
                <textarea
                  id={changeId}
                  aria-describedby={`${changeId}-help ${illustrationId}`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="e.g. make the floral arch fuller with blush roses, swap the chairs for gold chiavari, warmer lighting…"
                  className="w-full resize-none rounded-xl border border-sand bg-cream/50 px-3 py-2.5 text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-clay/30"
                />
                <p id={`${changeId}-help`} className="mt-1.5 text-[11px] text-ink/60">
                  {genError ? (
                    <span className="text-clay">{genError}</span>
                  ) : (
                    "One or two changes at a time works best. Your new version is added alongside this one so you can compare."
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (renderId)
                    generate(style.id, { parentRenderId: renderId });
                }}
                disabled={sending || !!selectionError || !description.trim() || !renderId}
                className="w-full rounded-full bg-ink py-3 text-sm font-medium text-cream hover:bg-ink/90 disabled:bg-ink/30 disabled:cursor-not-allowed transition-colors"
              >
                {sending ? "Applying your changes…" : "Apply changes →"}
              </button>
            </>
          ) : (
            <>
              <p className="mb-4 text-xs leading-relaxed text-ink/50">
                Describe your colours, flowers, lighting and layout, or choose a style.
              </p>

              {/* Which wedding scene to set the room up for */}
              <div className="mb-4">
                <p className="mb-2 text-xs text-ink/50">
                  What are we setting up?
                </p>
                <div className="flex flex-wrap gap-2">
                  {SCENES.map((s) => {
                    const active = setting === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSetting(s.id)}
                        aria-pressed={active}
                        title={s.blurb}
                        className={`min-h-11 rounded-full border px-4 py-2 text-left text-xs transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/50 motion-reduce:transition-none ${active ? "border-clay/50 bg-cream text-ink" : "border-sand/80 text-ink/60 hover:border-clay/50"}`}
                      >
                        <span
                          className={`block text-xs font-medium ${active ? "text-ink" : "text-ink/70"}`}
                        >
                          {s.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description — the primary input */}
              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor={descriptionId} className="text-xs font-medium text-ink/60">
                    Describe your dream setup
                  </label>
                  <button
                    type="button"
                    onClick={improveDescription}
                    disabled={improving || sending || !description.trim()}
                    className="flex items-center gap-1 rounded-full border border-sand px-2.5 py-1 text-[11px] text-clay hover:border-clay/60 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                    title="Let us expand your description into a clearer brief"
                  >
                    {improving ? "Improving…" : "Improve my description"}
                  </button>
                </div>
                <textarea
                  id={descriptionId}
                  aria-describedby={`${descriptionId}-help ${illustrationId}`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Name catalogue products you want, or describe your style. For example: blush and ivory roses with lots of trailing greenery, round tables down the middle, warm fairy lights across the ceiling, gold candlesticks and a floral arch at the entrance…"
                  className="w-full resize-none rounded-xl border border-sand bg-cream/50 px-3 py-2.5 text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-clay/30"
                />
                {descriptionBeforeImprove !== null && <button type="button" onClick={() => { setDescription(descriptionBeforeImprove); setDescriptionBeforeImprove(null); setImproveError(null); }} className="mt-2 min-h-11 text-sm underline">Undo improvement</button>}
                <p id={`${descriptionId}-help`} className="mt-1.5 text-[11px] text-ink/60">
                  {improveError ? (
                    <span className="text-clay">{improveError}</span>
                  ) : (
                    "Include the details that matter to you."
                  )}
                </p>
              </div>

              {/* Optional style starting point — compact chips, not required */}
              <div className="mb-5">
                <p className="mb-2 text-xs text-ink/50">
                  Start from a style{" "}
                  <span className="text-ink/30">(optional)</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setDraftStyleId("")}
                    aria-pressed={draftStyleId === ""}
                    className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${draftStyleId === "" ? "border-clay bg-clay/10 font-medium text-ink" : "border-sand text-ink/60 hover:border-clay/50"}`}
                  >
                    Just my description
                  </button>
                  {STYLES.map((s) => {
                    const selected = s.id === draftStyleId;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setDraftStyleId(s.id)}
                        aria-pressed={selected}
                        title={STYLE_BLURBS[s.id] ?? s.tagline}
                        className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${selected ? "border-clay bg-clay/10 font-medium text-ink" : "border-sand text-ink/60 hover:border-clay/50"}`}
                      >
                        {s.name}
                      </button>
                    );
                  })}
                </div>
                {draftStyleId !== "" && (
                  <p className="mt-2 text-[11px] leading-snug text-ink/45">
                    {STYLE_BLURBS[draftStyleId] ??
                      getStyle(draftStyleId).tagline}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => generate(draftStyleId || "none")}
                disabled={
                  sending || improving || !!selectionError || (!venueOnly && selectionMode === "manual" && !itemIds.length) || (selectionMode === "auto" && draftStyleId === "" && !description.trim())
                }
                className="w-full rounded-full bg-ink py-3 text-sm font-medium text-cream hover:bg-ink/90 disabled:bg-ink/30 disabled:cursor-not-allowed transition-colors"
              >
                {sending
                  ? "Generating…"
                  : draftStyleId === ""
                    ? itemIds.length && !description.trim() ? "Preview selected products →" : "Generate from my description →"
                    : renderUrl
                      ? `Generate ${getStyle(draftStyleId).name} →`
                      : "Generate →"}
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
