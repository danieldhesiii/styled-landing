"use client";

import { useEffect, useRef, useState } from "react";
import type { Category, SampleVenue, StylePreset } from "@/lib/types";
import { STYLES } from "@/lib/styles";
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

// Approximate positions (% of image width/height) where each category
// of item would typically appear in a wedding venue render.
const HOTSPOT_POSITIONS: Partial<Record<Category, { x: number; y: number }[]>> = {
  backdrops:       [{ x: 50, y: 22 }],
  florals:         [{ x: 18, y: 58 }, { x: 78, y: 58 }],
  centrepieces:    [{ x: 50, y: 65 }, { x: 30, y: 68 }],
  furniture:       [{ x: 35, y: 78 }, { x: 60, y: 75 }],
  lighting:        [{ x: 50, y: 10 }],
  signage:         [{ x: 82, y: 42 }],
  linen_tableware: [{ x: 62, y: 72 }],
  bar:             [{ x: 86, y: 58 }],
  cake_favours:    [{ x: 74, y: 66 }],
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
  const { getItem } = useCatalogue();
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);
  const [showGenPanel, setShowGenPanel] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [primaryPhoto, setPrimaryPhoto] = useState(0);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const primary = Math.min(primaryPhoto, Math.max(0, uploadedImages.length - 1));
  const live = useRef({ styleId: style.id, venueId: venue.id });
  live.current = { styleId: style.id, venueId: venue.id };

  const uploadedPreview = uploadedImages[primary] ?? null;
  const previewImage = renderUrl ?? uploadedPreview;

  // Collapse the panel as soon as a render comes in.
  useEffect(() => {
    if (renderUrl) setShowGenPanel(false);
  }, [renderUrl]);

  // Build hotspot dots from basket items.
  const hotspots = (() => {
    if (!renderUrl) return [];
    const usedSlots: Partial<Record<Category, number>> = {};
    const result: { id: string; name: string; x: number; y: number }[] = [];
    for (const id of itemIds) {
      const item = getItem(id);
      if (!item) continue;
      const positions = HOTSPOT_POSITIONS[item.category];
      if (!positions) continue;
      const slot = usedSlots[item.category] ?? 0;
      if (slot >= positions.length) continue;
      usedSlots[item.category] = slot + 1;
      result.push({ id: item.id, name: item.name, x: positions[slot].x, y: positions[slot].y });
    }
    return result;
  })();

  async function generate() {
    if (sending) return;
    setSending(true);
    const sentFor = { styleId: style.id, venueId: venue.id };

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: description.trim(),
          styleId: style.id,
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
        if (live.current.styleId !== sentFor.styleId || live.current.venueId !== sentFor.venueId) {
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

  return (
    <div className="overflow-hidden rounded-3xl border border-sand bg-white shadow-sm">

      {/* ── IMAGE ──────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-sand/40">
        {previewImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={previewImage}
              src={previewImage}
              alt="Your venue"
              className="aspect-video w-full animate-fade-in object-cover"
            />

            {/* Top-left label */}
            <div className="absolute left-3 top-3 rounded-full bg-ink/55 px-3 py-1 text-[11px] text-cream backdrop-blur-sm">
              {renderUrl ? `${style.name} · AI render` : "Your venue"}
            </div>

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

            {/* Style badge + start over — only shown on a real render */}
            {renderUrl && (
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

            {/* ── ITEM HOTSPOTS ──────────────────────────────────── */}
            {hotspots.map((h) => (
              <div
                key={h.id}
                className="absolute"
                style={{ left: `${h.x}%`, top: `${h.y}%`, transform: "translate(-50%,-50%)" }}
              >
                {/* Tooltip */}
                {hoveredItem === h.id && (
                  <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-xl bg-ink px-3 py-2 text-xs text-cream shadow-lg">
                    <p className="font-medium">{h.name}</p>
                    <p className="mt-0.5 text-cream/60">Click to view in shop</p>
                  </div>
                )}
                <button
                  type="button"
                  onMouseEnter={() => setHoveredItem(h.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                  onClick={() => onShopItem(h.id)}
                  className="relative flex h-7 w-7 items-center justify-center"
                  aria-label={`View ${h.name} in shop`}
                >
                  {/* Pulse ring */}
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/60 opacity-75" />
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
                <p className="text-xs text-ink/35">or pick a sample room below</p>
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
      {renderUrl && !showGenPanel ? (
        /* Collapsed state — just show the "Generate new style" button */
        <div className="border-t border-sand px-4 py-3">
          <button type="button" onClick={() => setShowGenPanel(true)}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-sand py-2.5 text-sm font-medium text-ink/60 hover:border-clay hover:text-ink transition-colors">
            <span>↺</span> Generate new style
          </button>
        </div>
      ) : (
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

          {/* Style chips */}
          <div className="mb-4">
            <p className="mb-2 text-xs text-ink/50">Choose a style</p>
            <div className="flex flex-wrap gap-2">
              {STYLES.map((s) => (
                <button key={s.id} type="button" onClick={() => onStyle(s.id)}
                  className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${s.id === style.id ? "border-clay bg-clay text-cream" : "border-sand text-ink/60 hover:border-clay/50 hover:text-ink"}`}>
                  {s.name}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-ink/35">{style.tagline}</p>
          </div>

          {/* Description */}
          <div className="mb-4">
            <p className="mb-2 text-xs text-ink/50">Describe your vision <span className="text-ink/30">(optional)</span></p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="e.g. round tables down the middle, a floral arch at the entrance, fairy lights draped across the ceiling, a stage along the back wall…"
              className="w-full resize-none rounded-xl border border-sand bg-cream/50 px-3 py-2.5 text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-clay/30"
            />
            <p className="mt-1.5 text-[11px] text-ink/40">
              The more detail you give about your layout, lighting and focal points, the better the result.
            </p>
          </div>

          {/* Generate button */}
          <button type="button" onClick={() => { if (renderUrl) onRender(null); generate(); }}
            disabled={sending || (!uploadedImages.length && !venue.image)}
            className="w-full rounded-full bg-ink py-3 text-sm font-medium text-cream hover:bg-ink/90 disabled:bg-ink/30 transition-colors">
            {sending ? "Generating…" : "Generate →"}
          </button>

          {!uploadedImages.length && (
            <p className="mt-2 text-center text-[11px] text-ink/40">
              Upload a venue photo above to generate your look
            </p>
          )}
        </div>
      )}
    </div>
  );
}
