"use client";

import { useRef, useState } from "react";
import type { SampleVenue, StylePreset } from "@/lib/types";
import { STYLES } from "@/lib/styles";
import { uploadVenuePhoto } from "@/lib/upload-venue-photo";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

// A finished render: its server id (needed to refine it) and a signed image URL.
export interface RenderRef {
  id: string;
  url: string;
}

interface Props {
  venue: SampleVenue;
  uploadedImages: string[];
  style: StylePreset;
  renderUrl: string | null;
  renderId: string | null; // the render currently shown; the next message refines it
  versions: RenderRef[]; // every render made for this look, oldest first
  itemIds: string[]; // catalogue items in the basket, so the render includes them
  guestCount: number;
  // Show/keep a render (also used to pick an earlier version). null = start over.
  onRender: (render: RenderRef | null) => void;
  onStyle: (id: string) => void;
  onAddAngle: (dataUrl: string) => void;
}

type View = "render" | "tour";

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
  onAddAngle,
}: Props) {
  const [view, setView] = useState<View>("render");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Tell me what you're picturing — a stage along the back wall, round tables down the middle, a flower arch at the entrance. I'll style the room around it.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Which uploaded photo the couple wants styled; the others are reference angles.
  const [primaryPhoto, setPrimaryPhoto] = useState(0);
  const primary = Math.min(primaryPhoto, Math.max(0, uploadedImages.length - 1));
  // Lets a finished render check it still matches what's on screen.
  const live = useRef({ styleId: style.id, venueId: venue.id });
  live.current = { styleId: style.id, venueId: venue.id };

  // The base image for the preview: the chosen uploaded angle, else the venue photo.
  const baseImage = uploadedImages[primary] ?? venue.image ?? null;
  const previewImage = renderUrl ?? style.render ?? baseImage;

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setDraft("");
    setSending(true);
    const sentFor = { styleId: style.id, venueId: venue.id };
    const refining = renderId !== null;

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text,
          styleId: style.id,
          venueId: venue.id,
          images: uploadedImages,
          itemIds,
          guestCount,
          primaryIndex: primary,
          parentRenderId: renderId ?? undefined,
        }),
      });
      const data = await res.json();

      let reply: string;
      if (res.status === 202 && data?.renderId) {
        // Rendering takes a while: the server replies at once and we poll for the result.
        const done = await waitForRender(data.renderId);
        if (live.current.styleId !== sentFor.styleId || live.current.venueId !== sentFor.venueId) {
          reply = "Your venue or style changed while that was rendering, so I've set it aside.";
        } else {
          onRender({ id: data.renderId, url: done.imageUrl });
          reply = refining
            ? "Done. Keep tweaking, or tap an earlier version to go back."
            : `Here's your room in ${style.name}. Tell me what to change and I'll restyle it.`;
        }
      } else {
        // Placeholder mode (no render engine configured) or an error from the server.
        reply =
          data?.message ??
          data?.error ??
          "Got it — I've noted that for your render. The generation engine will bring this to life shortly.";
      }
      setMessages((m) => [...m, { role: "assistant", text: reply }]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: err instanceof Error ? err.message : "I've captured that for your brief.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  // Poll until the render finishes. Throws an Error with a message fit to show.
  async function waitForRender(id: string): Promise<{ imageUrl: string }> {
    const deadline = Date.now() + 7 * 60 * 1000;
    let networkFailures = 0;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 2000));
      let data;
      try {
        data = await (await fetch(`/api/renders/${id}`)).json();
        networkFailures = 0;
      } catch {
        if (++networkFailures >= 4) throw new Error("I lost my connection. Please try again.");
        continue;
      }
      if (data?.status === "succeeded" && data.imageUrl) return { imageUrl: data.imageUrl };
      if (data?.status === "failed" || data?.ok === false) {
        throw new Error(data.error ?? "Something went wrong creating your render. Please try again.");
      }
    }
    throw new Error("This is taking longer than expected. Please try again.");
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
      setUploadError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-sand bg-white shadow-sm">
      {/* View tabs */}
      <div className="flex items-center gap-1 border-b border-sand px-3 py-2">
        <button
          type="button"
          onClick={() => setView("render")}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            view === "render" ? "bg-ink text-cream" : "text-ink/60 hover:text-ink"
          }`}
        >
          Styled render
        </button>
        <button
          type="button"
          onClick={() => setView("tour")}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            view === "tour" ? "bg-ink text-cream" : "text-ink/60 hover:text-ink"
          }`}
        >
          3D look-around
          <span className="rounded-full bg-clay/15 px-1.5 py-0.5 text-[9px] text-clay">Soon</span>
        </button>
        <span className="ml-auto pr-1 text-[11px] text-ink/35">
          {renderUrl ? "AI render of your room" : "Illustrative · AI render"}
        </span>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* Preview */}
        <div className="relative min-h-[300px] bg-sand/30">
          {view === "render" ? (
            previewImage ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={previewImage}
                  src={previewImage}
                  alt={`${venue.name} styled as ${style.name}`}
                  className="h-full max-h-[460px] w-full animate-fade-in object-cover"
                />
                {/* The wash tints the illustrative images; a real render needs none. */}
                {!renderUrl && (
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{ backgroundColor: style.wash }}
                  />
                )}
                <div className="absolute left-3 top-3 rounded-full bg-ink/60 px-3 py-1 text-[11px] text-cream">
                  {venue.name} · {style.name}
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-ink/40">
                No preview yet
              </div>
            )
          ) : (
            // 3D look-around placeholder
            <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-clay/40 text-2xl">
                🧭
              </div>
              <p className="font-serif text-xl text-ink">Walk around your venue</p>
              <p className="max-w-xs text-sm text-ink/50">
                {venue.tour
                  ? "This venue has a 3D tour. Soon you'll step inside and look around the room with your chosen styling in place."
                  : "Upload a set of photos around the room and we'll stitch them into a 3D look-around you can explore."}
              </p>
              <span className="rounded-full bg-clay/10 px-3 py-1 text-xs text-clay">
                Preview coming soon
              </span>
            </div>
          )}
        </div>

        {/* AI stylist chat */}
        <div className="flex max-h-[460px] flex-col border-t border-sand lg:border-l lg:border-t-0">
          <div className="flex items-center gap-2 border-b border-sand px-4 py-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-clay/15 text-xs">
              ✦
            </span>
            <p className="text-sm font-medium text-ink">AI stylist</p>
            <span className="ml-auto rounded-full bg-clay/15 px-2 py-0.5 text-[10px] text-clay">
              Preview
            </span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "ml-auto bg-ink text-cream"
                    : "bg-sand/60 text-ink"
                }`}
              >
                {m.text}
              </div>
            ))}
            {sending && (
              <div className="max-w-[85%] rounded-2xl bg-sand/60 px-3 py-2 text-sm text-ink/50">
                Styling your room… this can take up to a minute.
              </div>
            )}
          </div>

          <div className="border-t border-sand p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={2}
                placeholder={renderId ? "Tell me what to change…" : "Describe your day…"}
                className="flex-1 resize-none rounded-xl border border-sand bg-cream/50 px-3 py-2 text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-clay/30"
              />
              <button
                type="button"
                onClick={send}
                disabled={!draft.trim() || sending}
                className="rounded-full bg-ink px-4 py-2 text-xs text-cream hover:bg-ink/90 disabled:bg-ink/30"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Style + venue angles footer */}
      <div className="border-t border-sand px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs text-ink/40">Style</span>
          {STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onStyle(s.id)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                s.id === style.id
                  ? "border-clay bg-clay text-cream"
                  : "border-sand text-ink/60 hover:border-clay/50 hover:text-ink"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>

        {renderId && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs text-ink/40">Versions</span>
            {versions.map((v, i) => (
              <button
                key={v.id}
                type="button"
                onClick={() => onRender(v)}
                title={`Version ${i + 1}`}
                aria-pressed={v.id === renderId}
                disabled={sending}
                className={`h-11 w-11 overflow-hidden rounded-lg border-2 transition-colors disabled:opacity-50 ${
                  v.id === renderId ? "border-clay" : "border-sand hover:border-clay/50"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={v.url} alt={`Version ${i + 1}`} className="h-full w-full object-cover" />
              </button>
            ))}
            <button
              type="button"
              onClick={() => onRender(null)}
              disabled={sending}
              className="ml-1 text-[11px] text-ink/45 underline-offset-2 hover:text-clay hover:underline disabled:opacity-50"
              title="Discard these renders and style your venue photo again"
            >
              Start over
            </button>
          </div>
        )}

        <div className="mt-3 flex items-center gap-2">
          <span className="mr-1 text-xs text-ink/40">Venue photos</span>
          {uploadedImages.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPrimaryPhoto(i)}
              aria-pressed={i === primary}
              title={i === primary ? "The view we style" : "Style this view instead"}
              className={`h-11 w-11 overflow-hidden rounded-lg border-2 transition-colors ${
                uploadedImages.length > 1 && i === primary
                  ? "border-clay"
                  : "border-sand hover:border-clay/50"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Angle ${i + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-dashed border-sand text-ink/40 hover:border-clay hover:text-clay"
            title="Add another angle of your venue"
          >
            +
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFiles}
            className="hidden"
          />
          <span className={`text-[11px] ${uploadError ? "text-clay" : "text-ink/35"}`}>
            {uploading
              ? "Uploading…"
              : uploadError ??
                (uploadedImages.length > 1
                  ? renderId
                    ? "Start over to style a different view"
                    : "Tap a photo to choose the view we style; the others help us understand the room"
                  : "Add more angles of the room to help us understand it")}
          </span>
        </div>
      </div>
    </div>
  );
}
