"use client";

import { useEffect, useRef, useState } from "react";
import type { SampleVenue, StylePreset } from "@/lib/types";
import { STYLES, getStyle } from "@/lib/styles";
import { uploadVenuePhoto } from "@/lib/upload-venue-photo";

export interface RenderRef {
  id: string;
  url: string;
  /** Catalogue item ids that make up this render — the "what's in the picture" list. */
  itemIds?: string[];
}

interface Props {
  venue: SampleVenue;
  uploadedImages: string[];
  style: StylePreset;
  /** Display name for the committed look — "Your design" when no preset was used. */
  styleName: string;
  renderUrl: string | null;
  renderId: string | null;
  versions: RenderRef[];
  itemIds: string[];
  guestCount: number;
  isSaved: boolean;
  onRender: (render: RenderRef | null) => void;
  /** Remove a generated version from the strip. */
  onDeleteVersion: (id: string) => void;
  /** A style id, or "none" for a description-led look. */
  onStyle: (id: string) => void;
  onVenue: (venueId: string) => void;
  onAddAngle: (url: string) => void;
  /** Reveal the "Shop this look" list of pieces that make up this render. */
  onShopLook: () => void;
  onToggleSave: () => void;
}

// A short description of the look each preset produces. These mirror the style
// direction sent to the image model, so the couple knows what they'll get.
const STYLE_BLURBS: Record<string, string> = {
  garden_romance:
    "Lush blush & white garden roses, trailing greenery, gold chiavari chairs and warm fairy lights.",
  classic_elegance:
    "Tall gold candelabra, crisp white floor-length linen and crystal glassware — a refined black-tie look.",
  modern_minimal:
    "Long tables, a neutral white & greige palette, low architectural greenery and clean sculptural stems.",
  rustic_barn:
    "Loose meadow wildflowers, timber trestle tables, crossback chairs and festoon lights overhead.",
};

export default function RenderStage({
  venue,
  uploadedImages,
  style,
  styleName,
  renderUrl,
  renderId,
  versions,
  itemIds,
  guestCount,
  isSaved,
  onRender,
  onDeleteVersion,
  onStyle,
  onVenue: _onVenue,
  onAddAngle,
  onShopLook,
  onToggleSave,
}: Props) {
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);
  const [showGenPanel, setShowGenPanel] = useState(false);
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
  // What the room is being set for: the seated reception or the ceremony aisle.
  const [setting, setSetting] = useState<"reception" | "ceremony">("reception");
  const [improving, setImproving] = useState(false);
  const [improveError, setImproveError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const primary = Math.min(primaryPhoto, Math.max(0, uploadedImages.length - 1));
  const live = useRef({ styleId: style.id, venueId: venue.id });
  live.current = { styleId: style.id, venueId: venue.id };

  const uploadedPreview = uploadedImages[primary] ?? null;
  // The "before" image to compare a render against — only the couple's own
  // uploaded photo. We deliberately do NOT fall back to a stock venue image, so
  // before anything is uploaded the stage shows the text prompt, not a photo.
  const originalImage = uploadedPreview;
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
        body: JSON.stringify({ prompt: current, styleId: draftStyleId || "none" }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setImproveError(data?.error ?? "Couldn't improve that just now — try again.");
      } else if (typeof data.prompt === "string" && data.prompt.trim()) {
        setDescription(data.prompt.trim());
        if (data.changed === false) {
          setImproveError("That already reads well — tweak it or generate when ready.");
        }
      }
    } catch {
      setImproveError("Couldn't reach the writing helper — check your connection.");
    } finally {
      setImproving(false);
    }
  }

  async function generate(useStyleId: string) {
    if (sending) return;
    // Commit the chosen style (this clears the old render, which is correct —
    // a render only represents the style it was made from).
    onStyle(useStyleId);
    setSending(true);
    setGenError(null);
    const sentFor = { styleId: useStyleId, venueId: venue.id };

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: description.trim(),
          styleId: useStyleId,
          venueId: venue.id,
          images: uploadedImages,
          itemIds,
          guestCount,
          primaryIndex: primary,
          setting,
        }),
      });
      const data = await res.json().catch(() => null);

      if (res.status === 202 && data?.renderId) {
        const done = await waitForRender(data.renderId);
        if (live.current.venueId !== sentFor.venueId) {
          setShowGenPanel(true);
        } else {
          onRender({ id: data.renderId, url: done.imageUrl, itemIds: done.itemIds });
          setShowShopPrompt(true);
        }
      } else if (data?.imageUrl) {
        onRender({ id: data.renderId ?? "placeholder", url: data.imageUrl });
        setShowShopPrompt(true);
      } else {
        // The server declined (e.g. a render is still in flight, a daily limit,
        // or a bad request). Show why instead of silently doing nothing.
        setGenError(data?.error ?? "Couldn't start your render. Please try again in a moment.");
        setShowGenPanel(true);
      }
    } catch (err) {
      // The render itself failed or timed out, or the network dropped — tell the user.
      setGenError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setShowGenPanel(true);
    } finally {
      setSending(false);
    }
  }

  async function waitForRender(id: string): Promise<{ imageUrl: string; itemIds?: string[] }> {
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
        return { imageUrl: data.imageUrl, itemIds: data.itemIds };
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
      onAddAngle(photo.url);
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
    <div className="absolute inset-x-0 top-14 z-10 flex justify-center px-4 animate-fade-in">
      <div className="flex max-w-md items-center gap-3 rounded-2xl border border-sand bg-cream/95 px-4 py-2.5 shadow-xl backdrop-blur">
        <span className="text-lg">🛍</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-ink">Your look is ready</p>
          <p className="text-[11px] leading-snug text-ink/55">
            See the pieces in this picture and add the ones you love to your design.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setShowShopPrompt(false); onShopLook(); }}
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
        <button type="button" onClick={() => onRender(null)}
          className="text-[11px] text-white/55 underline-offset-2 hover:text-white hover:underline transition-colors">
          Start over
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={onShopLook}
            title="See the pieces that make up this look"
            className="flex items-center gap-1.5 rounded-full border border-clay bg-clay px-3.5 py-1 text-[11px] font-medium text-cream shadow-sm hover:bg-clay/90 transition-colors">
            <span>🛍</span> Shop this look
          </button>
          <button type="button" onClick={onToggleSave}
            aria-pressed={isSaved}
            title={isSaved ? "Saved to your looks" : "Save to your looks"}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] backdrop-blur-sm transition-colors ${isSaved ? "border-clay bg-clay text-cream" : "border-white/40 bg-white/15 text-white hover:bg-white/25"}`}>
            <span>{isSaved ? "♥" : "♡"}</span> {isSaved ? "Saved" : "Save"}
          </button>
          <button type="button" onClick={downloadRender} disabled={downloading}
            title="Download image"
            className="flex items-center gap-1.5 rounded-full border border-white/40 bg-white/15 px-3 py-1 text-[11px] text-white backdrop-blur-sm hover:bg-white/25 transition-colors disabled:opacity-60">
            <span>⤓</span> {downloading ? "Saving…" : "Download"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="overflow-hidden rounded-3xl border border-sand bg-white shadow-sm">

      {/* ── ERROR BANNER ───────────────────────────────────────────── */}
      {genError && (
        <div className="flex items-start gap-2 border-b border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700">
          <span aria-hidden>⚠</span>
          <span className="flex-1 leading-snug">{genError}</span>
          <button type="button" onClick={() => setGenError(null)} aria-label="Dismiss"
            className="shrink-0 text-red-400 hover:text-red-700 transition-colors">
            ×
          </button>
        </div>
      )}

      {/* ── IMAGE ──────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-sand/40">
        {splitView ? (
          /* ── SIDE-BY-SIDE COMPARE: original left, styled right ─────── */
          <>
            <div className="grid grid-cols-2">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={originalImage!} alt="Your original venue"
                  className="aspect-video w-full animate-fade-in object-cover" />
                <div className="absolute left-3 top-3 rounded-full bg-ink/55 px-3 py-1 text-[11px] text-cream backdrop-blur-sm">
                  Original
                </div>
              </div>
              <div className="relative border-l border-white/50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewImage!} alt="Your styled venue"
                  className="aspect-video w-full animate-fade-in object-cover" />
                <div className="absolute right-3 top-3 rounded-full bg-ink/55 px-3 py-1 text-[11px] text-cream backdrop-blur-sm">
                  Styled · {styleName}
                </div>
              </div>
            </div>
            {actionBar}
            {shopPromptCard}
            {generatingOverlay}
          </>
        ) : displayImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={displayImage}
              src={displayImage}
              alt={showOriginal ? "Your original venue" : "Your styled venue"}
              className="aspect-video w-full animate-fade-in object-cover"
            />

            {/* Top-left label */}
            <div className="absolute left-3 top-3 rounded-full bg-ink/55 px-3 py-1 text-[11px] text-cream backdrop-blur-sm">
              {showOriginal ? "Your venue · before" : renderUrl ? `${styleName} · AI render` : "Your venue"}
            </div>

            {/* Style badge + actions — only on the styled render */}
            {renderUrl && !showOriginal && actionBar}

            {shopPromptCard}
            {generatingOverlay}
          </>
        ) : (
          /* ── EMPTY STATE ─────────────────────────────────────────── */
          <div className="aspect-video flex flex-col items-center justify-center gap-4 px-8 text-center">
            {sending ? (
              <>
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-clay/30 border-t-clay" />
                <p className="font-serif text-xl text-ink">Generating your look…</p>
                <p className="text-sm text-ink/50">This usually takes about 30 seconds.</p>
              </>
            ) : (
              <>
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-clay/40">
                  <svg className="h-7 w-7 text-clay/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3 20.25h18M16.5 3.75a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5Z" />
                  </svg>
                </div>
                <div>
                  <p className="font-serif text-2xl text-ink">Add your venue &amp; generate your look</p>
                  <p className="mt-2 max-w-sm text-sm text-ink/50">
                    Upload a photo of your room, then just describe the look you want — no need to pick a style. We'll generate exactly how your wedding could look.
                  </p>
                </div>
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="rounded-full bg-clay px-7 py-2.5 text-sm font-medium text-cream hover:bg-clay/90 transition-colors">
                  Upload venue photo
                </button>
              </>
            )}
          </div>
        )}
      </div>

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
                  <img src={originalImage} alt="Original venue" className="h-full w-full object-cover" />
                </span>
                <span className={`mt-1 block text-[10px] ${showOriginal ? "text-clay" : "text-ink/45"}`}>
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
                      <img src={v.url} alt={`Version ${i + 1}`} className="h-full w-full object-cover" />
                    </span>
                    <span className={`mt-1 block text-[10px] ${active ? "text-clay" : "text-ink/45"}`}>
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
          {uploadedImages.map((src, i) => (
            <button key={i} type="button" onClick={() => setPrimaryPhoto(i)}
              aria-pressed={i === primary}
              className={`h-11 w-11 overflow-hidden rounded-lg border-2 transition-colors ${i === primary ? "border-clay" : "border-sand hover:border-clay/50"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Angle ${i + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
          <button type="button" onClick={() => fileRef.current?.click()}
            className="flex h-11 w-11 flex-col items-center justify-center rounded-lg border border-dashed border-sand text-ink/40 hover:border-clay hover:text-clay transition-colors"
            title="Upload venue photo">
            <span className="text-lg leading-none">+</span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFiles} className="hidden" />
          <span className={`ml-1 text-[11px] ${uploadError ? "text-clay" : "text-ink/35"}`}>
            {uploading ? "Uploading…" : uploadError ?? (uploadedImages.length > 0 ? "Add more angles to help us understand the room" : "Upload your venue photos")}
          </span>
        </div>
      </div>

      {/* ── GENERATE PANEL ─────────────────────────────────────────── */}

      {/* No photo uploaded yet — nothing to generate from */}
      {!uploadedImages.length && !renderUrl ? null : renderUrl && !showGenPanel ? (
        /* Collapsed — show "Generate new style" button */
        <div className="border-t border-sand px-4 py-3">
          <button type="button" onClick={() => setShowGenPanel(true)}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-sand py-2.5 text-sm font-medium text-ink/60 hover:border-clay hover:text-ink transition-colors">
            <span>↺</span> Generate new style
          </button>
        </div>
      ) : showGenPanel ? (
        <div className="border-t border-sand px-5 py-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-serif text-lg text-ink">
              {renderUrl ? "Generate new style" : "Generate your look"}
            </h3>
            {renderUrl && (
              <button type="button" onClick={() => setShowGenPanel(false)}
                className="text-xs text-ink/40 hover:text-ink transition-colors">
                Cancel
              </button>
            )}
          </div>

          <p className="mb-4 text-xs leading-relaxed text-ink/50">
            Just describe the look you want in your own words — colours, flowers, lighting, layout,
            anything. You don't have to pick a style; your description leads the design.
          </p>

          {/* What the room is being set up for */}
          <div className="mb-4">
            <p className="mb-2 text-xs text-ink/50">What are we setting up?</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSetting("reception")}
                aria-pressed={setting === "reception"}
                className={`flex-1 rounded-xl border px-3 py-2 text-left transition-colors ${setting === "reception" ? "border-clay bg-clay/10" : "border-sand hover:border-clay/50"}`}
              >
                <span className={`block text-xs font-medium ${setting === "reception" ? "text-ink" : "text-ink/70"}`}>
                  🍽 Reception
                </span>
                <span className="mt-0.5 block text-[11px] leading-snug text-ink/45">
                  Seated meal — dining tables &amp; centrepieces
                </span>
              </button>
              <button
                type="button"
                onClick={() => setSetting("ceremony")}
                aria-pressed={setting === "ceremony"}
                className={`flex-1 rounded-xl border px-3 py-2 text-left transition-colors ${setting === "ceremony" ? "border-clay bg-clay/10" : "border-sand hover:border-clay/50"}`}
              >
                <span className={`block text-xs font-medium ${setting === "ceremony" ? "text-ink" : "text-ink/70"}`}>
                  💍 Ceremony
                </span>
                <span className="mt-0.5 block text-[11px] leading-snug text-ink/45">
                  Aisle — rows of chairs facing an arch
                </span>
              </button>
            </div>
          </div>

          {/* Description — the primary input */}
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-ink/60">Describe your dream setup</p>
              <button
                type="button"
                onClick={improveDescription}
                disabled={improving || sending || !description.trim()}
                className="flex items-center gap-1 rounded-full border border-sand px-2.5 py-1 text-[11px] text-clay hover:border-clay/60 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                title="Let us expand your description into a clearer brief"
              >
                <span>✨</span> {improving ? "Improving…" : "Improve my description"}
              </button>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="e.g. blush and ivory roses with lots of trailing greenery, round tables down the middle, warm fairy lights across the ceiling, gold candlesticks and a floral arch at the entrance…"
              className="w-full resize-none rounded-xl border border-sand bg-cream/50 px-3 py-2.5 text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-clay/30"
            />
            <p className="mt-1.5 text-[11px] text-ink/40">
              {improveError
                ? <span className="text-clay">{improveError}</span>
                : "The more detail about your colours, flowers, lighting and layout, the better the result. Tap ✨ to have us flesh it out for you."}
            </p>
          </div>

          {/* Optional style starting point — compact chips, not required */}
          <div className="mb-5">
            <p className="mb-2 text-xs text-ink/50">
              Start from a style <span className="text-ink/30">(optional)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDraftStyleId("")}
                aria-pressed={draftStyleId === ""}
                className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${draftStyleId === "" ? "border-clay bg-clay/10 font-medium text-ink" : "border-sand text-ink/60 hover:border-clay/50"}`}
              >
                No style — just my description
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
                {STYLE_BLURBS[draftStyleId] ?? getStyle(draftStyleId).tagline}
              </p>
            )}
          </div>

          <button type="button" onClick={() => generate(draftStyleId || "none")}
            disabled={sending || (draftStyleId === "" && !description.trim())}
            className="w-full rounded-full bg-ink py-3 text-sm font-medium text-cream hover:bg-ink/90 disabled:bg-ink/30 disabled:cursor-not-allowed transition-colors">
            {sending
              ? "Generating…"
              : draftStyleId === ""
                ? "Generate from my description →"
                : renderUrl
                  ? `Generate ${getStyle(draftStyleId).name} →`
                  : "Generate →"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
