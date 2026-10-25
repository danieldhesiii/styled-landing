"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { SampleVenue, StylePreset } from "@/lib/types";
import { STYLES, getStyle } from "@/lib/styles";
import { SCENES, DEFAULT_SCENE, type SceneId } from "@/lib/scenes";
import { uploadVenuePhoto } from "@/lib/upload-venue-photo";
import type { LookReport } from "@/lib/look";
import LookReportPanel from "@/components/design/LookReportPanel";

export interface RenderRef {
  id: string;
  url: string;
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
  onShopLook: () => void;
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
  const [improveError, setImproveError] = useState<string | null>(null);
  const [activeExample, setActiveExample] = useState<
    (typeof EXAMPLE_VENUES)[number] | null
  >(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const primary = Math.min(
    primaryPhoto,
    Math.max(0, uploadedImages.length - 1),
  );
  const live = useRef({ styleId: style.id, venueId: venue.id });
  live.current = { styleId: style.id, venueId: venue.id };

  const uploadedPreview = uploadedImages[primary]?.url ?? null;
  // When an example venue is active and no real upload exists, use the example
  // image as the stage background so the experience mirrors having uploaded a photo.
  const activeExampleUrl =
    uploadedImages.length === 0 ? (activeExample?.image ?? null) : null;
  const partnerPreview = venue.id.startsWith("listing:")
    ? (venue.image ?? null)
    : null;
  const originalImage = uploadedPreview ?? activeExampleUrl ?? partnerPreview;
  const previewImage = renderUrl ?? originalImage;

  // Keep the draft style in sync with the committed style (e.g. after a render
  // commits, or state is restored).
  useEffect(() => {
    setDraftStyleId(style.id);
  }, [style.id]);

  // Expand the panel when a photo is uploaded (but no render yet).
  useEffect(() => {
    if (uploadedImages.length > 0 && !renderUrl) setShowGenPanel(true);
  }, [uploadedImages.length, renderUrl]);

  useEffect(() => {
    if (partnerPreview && !renderUrl) setShowGenPanel(true);
  }, [partnerPreview, renderUrl]);

  // Once a real upload lands, the example is no longer needed.
  useEffect(() => {
    if (uploadedImages.length > 0) setActiveExample(null);
  }, [uploadedImages.length]);

  // Collapse the panel and reset compare when a render arrives.
  useEffect(() => {
    if (renderUrl) {
      setShowGenPanel(false);
      setShowOriginal(false);
    }
  }, [renderUrl]);

  // Ask the server to rewrite the couple's rough note into a fuller styling
  // brief, then drop it back into the box for them to tweak before generating.
  async function improveDescription() {
    const current = description.trim();
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
        setDescription(data.prompt.trim());
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
    opts?: { parentRenderId?: string },
  ) {
    if (sending) return;
    const refining = !!opts?.parentRenderId;
    // A new look commits the chosen style (this clears the old render, which is
    // correct — a render only represents the style it was made from). A tweak
    // keeps the current render and style; we're editing it, not restyling.
    if (!refining) onStyle(useStyleId);
    setSending(true);
    setGenError(null);
    const sentFor = { styleId: useStyleId, venueId: venue.id };

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: [
            description.trim(),
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
          itemIds,
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
        if (live.current.venueId !== sentFor.venueId) {
          setShowGenPanel(true);
        } else {
          onRender({
            id: data.renderId,
            url: done.imageUrl,
            itemIds: done.itemIds,
            look: done.look,
          });
          setShowShopPrompt(true);
        }
      } else if (data?.imageUrl) {
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
            Review the catalogue references below and add your favourites to your basket.
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
          Shop this look →
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
    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/55 to-transparent px-4 pb-3 pt-8">
      <div className="flex items-center gap-3">
        <span className="rounded-full border border-white/40 bg-white/15 px-3 py-1 text-[11px] text-white backdrop-blur-sm">
          {styleName}
        </span>
        <button
          type="button"
          onClick={() => onRender(null)}
          className="text-[11px] text-white/55 underline-offset-2 hover:text-white hover:underline transition-colors"
        >
          Start over
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onShopLook}
            title="See the pieces that make up this look"
            className="flex items-center gap-1.5 rounded-full border border-clay bg-clay px-3.5 py-1 text-[11px] font-medium text-cream shadow-sm hover:bg-clay/90 transition-colors"
          >
            <span>🛍</span> Shop this look
          </button>
          <button
            type="button"
            onClick={onToggleSave}
            disabled={saveBusy}
            aria-busy={saveBusy}
            aria-describedby={saveError ? saveErrorId : undefined}
            aria-pressed={isSaved}
            title={saveBusy ? "Saving your change…" : isSaved ? "Remove from your saved looks" : "Save to your looks"}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] backdrop-blur-sm transition-colors disabled:cursor-wait disabled:opacity-60 ${isSaved ? "border-clay bg-clay text-cream" : "border-white/40 bg-white/15 text-white hover:bg-white/25"}`}
          >
            <span aria-hidden>{isSaved ? "♥" : "♡"}</span> {saveBusy ? "Saving…" : isSaved ? "Saved" : "Save"}
          </button>
          <button
            type="button"
            onClick={downloadRender}
            disabled={downloading}
            title="Download image"
            className="flex items-center gap-1.5 rounded-full border border-white/40 bg-white/15 px-3 py-1 text-[11px] text-white backdrop-blur-sm hover:bg-white/25 transition-colors disabled:opacity-60"
          >
            <span>⤓</span> {downloading ? "Saving…" : "Download"}
          </button>
        </div>
      </div>
    </div>
  );

  const currentStep = sending || showGenPanel ? 2 : renderUrl ? 3 : originalImage ? 2 : 1;

  return (
    <div className="overflow-hidden rounded-2xl border border-sand bg-white">
      <div className="border-b border-sand px-4 py-3">
        <ol aria-label="Visualise progress" className="grid grid-cols-3 gap-3 text-xs sm:text-sm">
          {["Venue photo", "Describe", "Review & shop"].map((label, index) => (
            <li key={label} aria-current={currentStep === index + 1 ? "step" : undefined}
              className={currentStep === index + 1 ? "font-medium text-ink" : "text-ink/60"}>
              {index + 1}. {label}
            </li>
          ))}
        </ol>
        <p id={illustrationId} className="mt-2 text-xs leading-relaxed text-ink/60">
          AI-generated inspiration, not an exact product photograph or a guaranteed result. Colours, scale, layout, quantities and item details may differ. Check each catalogue listing, dimensions and supplier photographs before booking. Confirm suitability, availability and delivery in writing with the supplier.
        </p>
      </div>
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
      <div className="relative mx-3 my-3 overflow-hidden rounded-xl bg-cream sm:mx-4 sm:my-4">
        {splitView ? (
          /* ── SIDE-BY-SIDE COMPARE: original left, styled right ─────── */
          <>
            <div className="grid grid-cols-2">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={originalImage!}
                  alt="Your original venue"
                  className="aspect-video w-full animate-fade-in object-contain"
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
                  className="aspect-video w-full animate-fade-in object-contain"
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
              className="max-h-[65vh] w-full animate-fade-in object-contain"
            />

            {/* Top-left label */}
            <div className="absolute left-3 top-3 rounded-full bg-ink/55 px-3 py-1 text-[11px] text-cream backdrop-blur-sm">
              {showOriginal
                ? "Your venue · before"
                : renderUrl
                  ? `${styleName} · AI render`
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
                        setActiveExample(ex);
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
                    setActiveExample(null);
                    setShowGenPanel(false);
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
                    Add your venue &amp; generate your look
                  </p>
                  <p className="mt-2 max-w-sm text-sm text-ink/50">
                    Upload a photo of your room, then just describe the look you
                    want, or try an example. Generate an illustrative AI preview,
                    then review the look and explore the catalogue pieces.
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
                        setActiveExample(ex);
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
      {renderUrl &&
        !showOriginal &&
        versions.find((v) => v.id === renderId)?.look && (
          <LookReportPanel
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
        <div className="border-t border-sand px-5 py-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-serif text-lg text-ink">
              {!renderUrl
                ? "Generate your look"
                : panelMode === "tweak"
                  ? "Tweak this look"
                  : "Generate new style"}
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
                Describe the changes you want to explore. AI may also change
                room details, angle or lighting. Compare the new version with
                your original photo and earlier looks.
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
                disabled={sending || !description.trim() || !renderId}
                className="w-full rounded-full bg-ink py-3 text-sm font-medium text-cream hover:bg-ink/90 disabled:bg-ink/30 disabled:cursor-not-allowed transition-colors"
              >
                {sending ? "Applying your changes…" : "Apply changes →"}
              </button>
            </>
          ) : (
            <>
              <p className="mb-4 text-xs leading-relaxed text-ink/50">
                Just describe the look you want in your own words: colours,
                flowers, lighting, layout, anything. You don't have to pick a
                style; your description leads the design.
              </p>

              {/* Which wedding scene to set the room up for */}
              <div className="mb-4">
                <p className="mb-2 text-xs text-ink/50">
                  What are we setting up?
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {SCENES.map((s) => {
                    const active = setting === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSetting(s.id)}
                        aria-pressed={active}
                        title={s.blurb}
                        className={`rounded-xl border px-3 py-2 text-left transition-colors ${active ? "border-clay bg-clay/10" : "border-sand hover:border-clay/50"}`}
                      >
                        <span
                          className={`block text-xs font-medium ${active ? "text-ink" : "text-ink/70"}`}
                        >
                          {s.icon} {s.label}
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-snug text-ink/45">
                          {s.blurb}
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
                    <span>✨</span>{" "}
                    {improving ? "Improving…" : "Improve my description"}
                  </button>
                </div>
                <textarea
                  id={descriptionId}
                  aria-describedby={`${descriptionId}-help ${illustrationId}`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="e.g. blush and ivory roses with lots of trailing greenery, round tables down the middle, warm fairy lights across the ceiling, gold candlesticks and a floral arch at the entrance…"
                  className="w-full resize-none rounded-xl border border-sand bg-cream/50 px-3 py-2.5 text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-clay/30"
                />
                <p id={`${descriptionId}-help`} className="mt-1.5 text-[11px] text-ink/60">
                  {improveError ? (
                    <span className="text-clay">{improveError}</span>
                  ) : (
                    "The more detail about your colours, flowers, lighting and layout, the better the result. Tap ✨ to have us flesh it out for you."
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
                  sending || (draftStyleId === "" && !description.trim())
                }
                className="w-full rounded-full bg-ink py-3 text-sm font-medium text-cream hover:bg-ink/90 disabled:bg-ink/30 disabled:cursor-not-allowed transition-colors"
              >
                {sending
                  ? "Generating…"
                  : draftStyleId === ""
                    ? "Generate from my description →"
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
