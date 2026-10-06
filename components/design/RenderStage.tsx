"use client";

import { useEffect, useRef, useState } from "react";
import type { Category, SampleVenue, StylePreset } from "@/lib/types";
import { STYLES, getStyle } from "@/lib/styles";
import { uploadVenuePhoto } from "@/lib/upload-venue-photo";
import { useCatalogue } from "@/components/catalogue/CatalogueProvider";

export interface RenderRef {
  id: string;
  url: string;
}

interface Props {
  venue: SampleVenue;
  uploadedImages: string[];
  style: StylePreset;
  renderUrl: string | null;
  renderId: string | null;
  versions: RenderRef[];
  itemIds: string[];
  guestCount: number;
  onRender: (render: RenderRef | null) => void;
  onStyle: (id: string) => void;
  onVenue: (venueId: string) => void;
  onAddAngle: (url: string) => void;
  onShopItem: (itemId: string) => void;
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

// Approximate positions (% of image width/height) per category.
const HOTSPOT_POSITIONS: Partial<Record<Category, { x: number; y: number }>> = {
  backdrops:       { x: 50, y: 22 },
  florals:         { x: 18, y: 55 },
  centrepieces:    { x: 50, y: 65 },
  furniture:       { x: 35, y: 76 },
  lighting:        { x: 72, y: 12 },
  signage:         { x: 82, y: 44 },
  linen_tableware: { x: 62, y: 72 },
  cake_favours:    { x: 74, y: 66 },
};

export default function RenderStage({
  venue,
  uploadedImages,
  style,
  renderUrl,
  renderId,
  versions,
  itemIds,
  guestCount,
  onRender,
  onStyle,
  onVenue: _onVenue,
  onAddAngle,
  onShopItem,
}: Props) {
  const { itemsForCategory } = useCatalogue();
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);
  const [showGenPanel, setShowGenPanel] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [primaryPhoto, setPrimaryPhoto] = useState(0);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  // The style selected in the panel for the NEXT generation. Kept separate from
  // the committed style so browsing presets doesn't wipe the current render.
  const [draftStyleId, setDraftStyleId] = useState(style.id);
  const fileRef = useRef<HTMLInputElement>(null);

  const primary = Math.min(primaryPhoto, Math.max(0, uploadedImages.length - 1));
  const live = useRef({ styleId: style.id, venueId: venue.id });
  live.current = { styleId: style.id, venueId: venue.id };

  const uploadedPreview = uploadedImages[primary] ?? null;
  const previewImage = renderUrl ?? uploadedPreview;

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

  // Build hotspot dots from style-matched catalogue items (one per category).
  // We use the catalogue rather than the basket so there are always dots on a render
  // — the user clicks them to discover what's available to buy.
  const hotspots = (() => {
    if (!renderUrl || showOriginal) return [];
    const result: { id: string; name: string; x: number; y: number }[] = [];
    for (const [cat, pos] of Object.entries(HOTSPOT_POSITIONS) as [Category, { x: number; y: number }][]) {
      // Prefer basket items for this category, fall back to best style-matched catalogue item.
      const basketItemInCat = itemIds
        .map((id) => itemsForCategory(cat).find((i) => i.id === id))
        .find(Boolean);
      const catalogueItem =
        basketItemInCat ??
        itemsForCategory(cat).find((i) => i.styles.includes(style.id)) ??
        itemsForCategory(cat)[0];
      if (!catalogueItem) continue;
      result.push({ id: catalogueItem.id, name: catalogueItem.name, x: pos.x, y: pos.y });
    }
    return result;
  })();

  async function generate(useStyleId: string) {
    if (sending) return;
    // Commit the chosen style (this clears the old render, which is correct —
    // a render only represents the style it was made from).
    onStyle(useStyleId);
    setSending(true);
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
        }),
      });
      const data = await res.json();

      if (res.status === 202 && data?.renderId) {
        const done = await waitForRender(data.renderId);
        if (live.current.venueId !== sentFor.venueId) {
          setShowGenPanel(true);
        } else {
          onRender({ id: data.renderId, url: done.imageUrl });
        }
      } else if (data?.imageUrl) {
        onRender({ id: data.renderId ?? "placeholder", url: data.imageUrl });
      }
    } catch {
      // Silent — user can try again
    } finally {
      setSending(false);
    }
  }

  async function waitForRender(id: string): Promise<{ imageUrl: string }> {
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
      if (data?.status === "succeeded" && data.imageUrl) return { imageUrl: data.imageUrl };
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

  // The image to actually display (before/after toggle).
  const displayImage = showOriginal ? uploadedPreview : previewImage;

  return (
    <div className="overflow-hidden rounded-3xl border border-sand bg-white shadow-sm">

      {/* ── IMAGE ──────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-sand/40">
        {displayImage ? (
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
              {showOriginal ? "Your venue" : renderUrl ? `${style.name} · AI render` : "Your venue"}
            </div>

            {/* Before/after toggle — only when render AND original both exist */}
            {renderUrl && uploadedPreview && (
              <div className="absolute left-1/2 top-3 -translate-x-1/2">
                <div className="flex overflow-hidden rounded-full border border-white/30 bg-ink/50 backdrop-blur-sm text-[11px] text-white">
                  <button
                    type="button"
                    onClick={() => setShowOriginal(false)}
                    className={`px-3 py-1 transition-colors ${!showOriginal ? "bg-white/20 font-medium" : "hover:bg-white/10"}`}
                  >
                    Styled
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowOriginal(true)}
                    className={`px-3 py-1 transition-colors ${showOriginal ? "bg-white/20 font-medium" : "hover:bg-white/10"}`}
                  >
                    Original
                  </button>
                </div>
              </div>
            )}

            {/* Version thumbnails top-right */}
            {versions.length > 1 && (
              <div className="absolute right-3 top-3 flex gap-1.5">
                {versions.map((v, i) => (
                  <button key={v.id} type="button" onClick={() => onRender(v)}
                    aria-pressed={v.id === renderId} title={`Version ${i + 1}`}
                    className={`h-9 w-9 overflow-hidden rounded-lg border-2 transition-colors ${v.id === renderId ? "border-clay" : "border-white/50 hover:border-white"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={v.url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Style badge + start over — only on the styled render */}
            {renderUrl && !showOriginal && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/55 to-transparent px-4 pb-3 pt-8">
                <div className="flex items-center gap-3">
                  <span className="rounded-full border border-white/40 bg-white/15 px-3 py-1 text-[11px] text-white backdrop-blur-sm">
                    {style.name}
                  </span>
                  <button type="button" onClick={() => onRender(null)}
                    className="text-[11px] text-white/55 underline-offset-2 hover:text-white hover:underline transition-colors">
                    Start over
                  </button>
                </div>
              </div>
            )}

            {/* ── ITEM HOTSPOTS (styled view only) ───────────────── */}
            {hotspots.map((h) => (
              <div
                key={h.id}
                className="absolute"
                style={{ left: `${h.x}%`, top: `${h.y}%`, transform: "translate(-50%,-50%)" }}
              >
                {hoveredItem === h.id && (
                  <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-xl bg-ink px-3 py-2 text-xs text-cream shadow-lg z-10">
                    <p className="font-medium">{h.name}</p>
                    <p className="mt-0.5 text-cream/60">Click to view in shop →</p>
                  </div>
                )}
                <button
                  type="button"
                  onMouseEnter={() => setHoveredItem(h.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                  onClick={() => onShopItem(h.id)}
                  className="relative flex h-8 w-8 items-center justify-center"
                  aria-label={`View ${h.name} in shop`}
                >
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/50 opacity-75" />
                  <span className="relative flex h-4 w-4 rounded-full border-2 border-white bg-clay shadow-md" />
                </button>
              </div>
            ))}

            {/* Generating overlay */}
            {sending && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink/50 backdrop-blur-sm">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                <p className="text-sm text-white">Generating your look…</p>
              </div>
            )}
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
                    Upload a photo of your room, pick a style and describe your vision — we'll generate exactly how your wedding could look.
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

          {/* Style preview cards — thumbnail + what the look produces */}
          <div className="mb-4">
            <p className="mb-2 text-xs text-ink/50">Choose a style</p>
            <div className="grid grid-cols-2 gap-2.5">
              {STYLES.map((s) => {
                const selected = s.id === draftStyleId;
                return (
                  <button key={s.id} type="button" onClick={() => setDraftStyleId(s.id)}
                    aria-pressed={selected}
                    className={`group overflow-hidden rounded-xl border text-left transition-colors ${selected ? "border-clay ring-2 ring-clay/30" : "border-sand hover:border-clay/50"}`}>
                    <div className="relative aspect-[4/3] bg-sand/40">
                      {s.render && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.render} alt={s.name} className="h-full w-full object-cover" />
                      )}
                      {selected && (
                        <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-clay text-[11px] text-cream shadow">
                          ✓
                        </span>
                      )}
                    </div>
                    <div className="px-2.5 py-2">
                      <p className={`text-xs font-medium ${selected ? "text-ink" : "text-ink/70"}`}>{s.name}</p>
                      <p className="mt-0.5 text-[11px] leading-snug text-ink/45">
                        {STYLE_BLURBS[s.id] ?? s.tagline}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div className="mb-4">
            <p className="mb-2 text-xs text-ink/50">Describe your vision <span className="text-ink/30">(optional)</span></p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="e.g. round tables down the middle, a floral arch at the entrance, fairy lights across the ceiling, a stage along the back wall…"
              className="w-full resize-none rounded-xl border border-sand bg-cream/50 px-3 py-2.5 text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-clay/30"
            />
            <p className="mt-1.5 text-[11px] text-ink/40">
              The more detail you give about your layout, lighting and focal points, the better the result.
            </p>
          </div>

          <button type="button" onClick={() => generate(draftStyleId)}
            disabled={sending}
            className="w-full rounded-full bg-ink py-3 text-sm font-medium text-cream hover:bg-ink/90 disabled:bg-ink/30 transition-colors">
            {sending ? "Generating…" : renderUrl ? `Generate ${getStyle(draftStyleId).name} →` : "Generate →"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
