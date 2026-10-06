"use client";

import { useRef, useState } from "react";
import type { SampleVenue, StylePreset } from "@/lib/types";
import { STYLES, SAMPLE_VENUES } from "@/lib/styles";
import { uploadVenuePhoto } from "@/lib/upload-venue-photo";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

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
}

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
  onVenue,
  onAddAngle,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Describe how you'd like the room laid out — a stage along the back wall, round tables, a flower arch at the entrance. I'll generate a styled version around your brief.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [primaryPhoto, setPrimaryPhoto] = useState(0);
  const [showFullChat, setShowFullChat] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const primary = Math.min(primaryPhoto, Math.max(0, uploadedImages.length - 1));
  const live = useRef({ styleId: style.id, venueId: venue.id });
  live.current = { styleId: style.id, venueId: venue.id };

  // Only show real images — uploaded photo or a finished render. Never the
  // illustrative style renders; the empty state prompts the user to upload instead.
  const uploadedPreview = uploadedImages[primary] ?? null;
  const previewImage = renderUrl ?? uploadedPreview;
  const lastAssistantMsg = [...messages].reverse().find((m) => m.role === "assistant");
  const hasUserMessages = messages.some((m) => m.role === "user");

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setDraft("");
    setSending(true);
    setShowFullChat(true);
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
        const done = await waitForRender(data.renderId);
        if (live.current.styleId !== sentFor.styleId || live.current.venueId !== sentFor.venueId) {
          reply = "Your venue or style changed while that was rendering, so I've set it aside.";
        } else {
          onRender({ id: data.renderId, url: done.imageUrl });
          reply = refining
            ? "Done — keep tweaking, or tap an earlier version to go back."
            : `Here's your room in ${style.name}. Tell me what to change and I'll restyle it.`;
        }
      } else {
        reply =
          data?.message ??
          data?.error ??
          "Got it — the generation engine will bring this to life shortly.";
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
        if (++networkFailures >= 4) throw new Error("Lost connection. Please try again.");
        continue;
      }
      if (data?.status === "succeeded" && data.imageUrl) return { imageUrl: data.imageUrl };
      if (data?.status === "failed" || data?.ok === false) {
        throw new Error(data.error ?? "Something went wrong. Please try again.");
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

      {/* ── MAIN IMAGE ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-sand/40">
        {previewImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={previewImage}
              src={previewImage}
              alt={`${venue.name} in ${style.name}`}
              className="aspect-video w-full animate-fade-in object-cover"
            />

            {/* Top-left: label */}
            <div className="absolute left-3 top-3 rounded-full bg-ink/55 px-3 py-1 text-[11px] text-cream backdrop-blur-sm">
              {renderUrl ? `${style.name} · AI render` : "Your venue"}
            </div>

            {/* Top-right: version history thumbnails */}
            {versions.length > 1 && (
              <div className="absolute right-3 top-3 flex items-center gap-1.5">
                {versions.map((v, i) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => onRender(v)}
                    aria-pressed={v.id === renderId}
                    title={`Version ${i + 1}`}
                    className={`h-9 w-9 overflow-hidden rounded-lg border-2 transition-colors ${
                      v.id === renderId ? "border-clay" : "border-white/50 hover:border-white"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={v.url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Gradient scrim at bottom */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/65 to-transparent px-4 pb-3 pt-10">
              {renderUrl ? (
                /* After generating: just show the current style + start over */
                <div className="flex items-center gap-3">
                  <span className="rounded-full border border-white/40 bg-white/15 px-3 py-1 text-[11px] text-white backdrop-blur-sm">
                    {style.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRender(null)}
                    className="text-[11px] text-white/60 underline-offset-2 hover:text-white hover:underline transition-colors"
                  >
                    Start over
                  </button>
                </div>
              ) : (
                /* Before generating: show all style options */
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-0.5 text-[11px] text-white/50">Style</span>
                  {STYLES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => onStyle(s.id)}
                      className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
                        s.id === style.id
                          ? "border-white bg-white/20 text-white backdrop-blur-sm"
                          : "border-white/30 text-white/70 hover:border-white/60 hover:text-white"
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Empty state — no upload yet */
          <div className="aspect-video flex flex-col items-center justify-center gap-4 px-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-clay/40">
              <svg className="h-7 w-7 text-clay/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3 20.25h18M16.5 3.75a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5Z" />
              </svg>
            </div>
            <div>
              <p className="font-serif text-2xl text-ink">Add your venue &amp; generate your look</p>
              <p className="mt-2 max-w-sm text-sm text-ink/50">
                Upload a photo of your room, choose a style, describe your vision — and we'll generate exactly how your wedding could look.
              </p>
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-full bg-clay px-7 py-2.5 text-sm font-medium text-cream hover:bg-clay/90 transition-colors"
            >
              Upload venue photo
            </button>
            <p className="text-xs text-ink/35">or pick a sample room below</p>
          </div>
        )}
      </div>

      {/* ── VENUE / ROOM PICKER ROW ─────────────────────────────────── */}
      <div className="border-t border-sand px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-0.5 text-xs text-ink/40">Room</span>

          {/* Sample venue thumbnails — hidden once the couple uploads their own */}
          {uploadedImages.length === 0 &&
            SAMPLE_VENUES.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => onVenue(v.id)}
                aria-pressed={v.id === venue.id}
                title={v.name}
                className={`h-11 w-11 overflow-hidden rounded-lg border-2 transition-colors ${
                  v.id === venue.id ? "border-clay" : "border-sand hover:border-clay/50"
                }`}
              >
                {v.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.image} alt={v.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full" style={{ background: v.gradient }} />
                )}
              </button>
            ))}

          {/* Uploaded angle thumbnails */}
          {uploadedImages.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPrimaryPhoto(i)}
              aria-pressed={i === primary}
              title={i === primary ? "Current view" : "Style this angle instead"}
              className={`h-11 w-11 overflow-hidden rounded-lg border-2 transition-colors ${
                i === primary ? "border-clay" : "border-sand hover:border-clay/50"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Angle ${i + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}

          {/* Upload button */}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            title="Upload your venue photo"
            className="flex h-11 w-11 flex-col items-center justify-center rounded-lg border border-dashed border-sand text-ink/40 hover:border-clay hover:text-clay transition-colors"
          >
            <span className="text-lg leading-none">+</span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFiles} className="hidden" />

          <span className={`ml-1 text-[11px] ${uploadError ? "text-clay" : "text-ink/35"}`}>
            {uploading
              ? "Uploading…"
              : uploadError ??
                (uploadedImages.length > 0
                  ? "Add more angles to help us understand the room"
                  : "Upload your own venue photo or pick a sample")}
          </span>
        </div>
      </div>

      {/* ── AI STYLIST CHAT ─────────────────────────────────────────── */}
      <div className="border-t border-sand">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-clay/15 text-xs">
            ✦
          </span>
          <p className="text-sm font-medium text-ink">AI stylist</p>
          <span className="ml-auto flex items-center gap-2">
            {hasUserMessages && (
              <button
                type="button"
                onClick={() => setShowFullChat((s) => !s)}
                className="text-[11px] text-ink/40 hover:text-ink transition-colors"
              >
                {showFullChat ? "Hide chat" : "Show chat"}
              </button>
            )}
            <span className="rounded-full bg-clay/15 px-2 py-0.5 text-[10px] text-clay">
              Preview
            </span>
          </span>
        </div>

        {/* Message history (collapsible) */}
        {showFullChat && (
          <div className="max-h-48 space-y-2 overflow-y-auto border-t border-sand px-4 py-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  m.role === "user" ? "ml-auto bg-ink text-cream" : "bg-sand/60 text-ink"
                }`}
              >
                {m.text}
              </div>
            ))}
            {sending && (
              <div className="max-w-[85%] rounded-2xl bg-sand/60 px-3 py-2 text-sm text-ink/50">
                Styling your room…
              </div>
            )}
          </div>
        )}

        {/* Last assistant message shown as a prompt when chat is collapsed */}
        {!showFullChat && lastAssistantMsg && (
          <div className="border-t border-sand px-4 py-2">
            <p className="text-sm text-ink/55">{lastAssistantMsg.text}</p>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-sand px-4 py-3">
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
              placeholder={renderId ? "Tell me what to change…" : "Describe your room layout and what you're picturing…"}
              className="flex-1 resize-none rounded-xl border border-sand bg-cream/50 px-3 py-2 text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-clay/30"
            />
            <button
              type="button"
              onClick={send}
              disabled={!draft.trim() || sending}
              className="rounded-full bg-ink px-4 py-2.5 text-xs font-medium text-cream hover:bg-ink/90 disabled:bg-ink/30 transition-colors"
            >
              {sending ? "…" : "Generate"}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-ink/35">
            The more descriptive you are — table layout, lighting, focal points, colours — the closer the result will be to your vision.
          </p>
        </div>
      </div>
    </div>
  );
}
