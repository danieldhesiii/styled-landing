"use client";

import { useId, useRef, useState } from "react";
import { uploadVenuePhoto } from "@/lib/upload-venue-photo";
import { SAMPLE_VENUES, STYLES } from "@/lib/styles";
import { formatGBP } from "@/lib/quote";

/** An uploaded venue photo: its id (so it can be removed) and a signed URL. */
export interface UploadedPhoto {
  id: string;
  url: string;
}

export interface Brief {
  planSetupComplete?: boolean;
  guestCountEstimated?: boolean;
  budgetUnknown?: boolean;
  venueChoice?: "exploring" | "looking" | "have";
  venueName?: string;
  venuePostcode?: string;
  deliverySameDay?: boolean;
  deliveryDate?: string;
  returnDate?: string;
  venueId: string;
  uploadedImages: UploadedPhoto[];
  styleId: string;
  guestCount: number;
  weddingDate: string;
  budget: number;
}

interface Props {
  brief: Brief;
  onChange: (patch: Partial<Brief>) => void;
  onStart: () => void;
}

export default function BriefStep({ brief, onChange, onStart }: Props) {
  const fieldId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const photo = await uploadVenuePhoto(file);
      onChange({ uploadedImages: [{ id: photo.id, url: photo.url }] });
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Upload failed. Please try again.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl py-8 motion-reduce:[&_*]:transition-none sm:py-12">
      <h1 className="font-serif text-4xl leading-tight tracking-tight text-ink sm:text-5xl">
        Visualise your event.
      </h1>
      <p className="mt-3 max-w-xl text-ink/60">
        Choose your venue and products, or let us suggest a setup.
      </p>

      {/* Venue */}
      <section className="mt-8 border-t border-sand/80 pt-7">
        <h2 className="flex items-center gap-3 font-serif text-2xl text-ink"><span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full border border-clay/35 font-sans text-[10px] font-medium tabular-nums text-clay">01</span>Your venue</h2>
        <p className="mt-1 text-sm text-ink/50">
          Pick a sample room or upload a photo of yours.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SAMPLE_VENUES.map((v) => {
            const active =
              brief.venueId === v.id && brief.uploadedImages.length === 0;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => onChange({ venueId: v.id, uploadedImages: [] })}
                aria-pressed={active}
                className={`group overflow-hidden rounded-2xl border text-left transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/50 motion-reduce:transition-none ${
                  active
                    ? "border-clay/60 bg-cream ring-1 ring-clay/20"
                    : "border-sand/80 hover:border-clay/50"
                }`}
              >
                <div
                  className="aspect-[3/2] bg-sand"
                  style={{ background: v.gradient }}
                >
                  {v.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={v.image}
                      alt={v.name}
                      className="h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.025] motion-reduce:transition-none"
                    />
                  )}
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-medium leading-snug text-ink">
                    {v.name}
                  </p>
                  <p className="text-[11px] text-ink/40">{v.area}</p>
                </div>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label={brief.uploadedImages.length ? "Change venue photo" : "Upload your venue"}
            className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed p-3 text-center transition-colors ${
              brief.uploadedImages.length > 0
                ? "border-clay/60 bg-cream ring-1 ring-clay/20"
                : "border-sand/80 hover:border-clay/50"
            }`}
          >
            {brief.uploadedImages.length > 0 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={brief.uploadedImages[0].url}
                alt="Your venue"
                className="aspect-[3/2] w-full rounded-lg object-cover"
              />
            ) : (
              <>
                <span className="text-2xl text-ink/40">＋</span>
                <span className="text-xs text-ink/50">Upload your venue</span>
              </>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />
        </div>
        {uploading && (
          <p className="mt-3 text-xs text-ink/50">Uploading your photo…</p>
        )}
        {uploadError && <p className="mt-3 text-xs text-clay">{uploadError}</p>}
      </section>

      {/* Style */}
      <section className="mt-8 border-t border-sand/80 pt-7">
        <h2 className="flex items-center gap-3 font-serif text-2xl text-ink"><span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full border border-clay/35 font-sans text-[10px] font-medium tabular-nums text-clay">02</span>Your style</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onChange({ styleId: s.id })}
              aria-pressed={brief.styleId === s.id}
              className={`group overflow-hidden rounded-2xl border text-left transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/50 motion-reduce:transition-none ${
                brief.styleId === s.id
                  ? "border-clay/60 bg-cream ring-1 ring-clay/20"
                  : "border-sand/80 hover:border-clay/50"
              }`}
            >
              <div className="aspect-[3/2]">
                {s.render && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.render}
                    alt={s.name}
                    className="h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.025] motion-reduce:transition-none"
                  />
                )}
              </div>
              <div className="p-2.5">
                <p className="text-xs font-medium text-ink">{s.name}</p>
                <p className="text-[11px] leading-snug text-ink/40">
                  {s.tagline}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Details */}
      <section className="mt-8 grid gap-5 border-t border-sand/80 pt-7 sm:grid-cols-3">
        <div>
          <label htmlFor={`${fieldId}-guests`} className="text-sm font-medium text-ink">Guest count</label>
          <input
            id={`${fieldId}-guests`}
            type="number"
            min={10}
            max={400}
            value={brief.guestCount}
            onChange={(e) =>
              onChange({ guestCount: Math.max(1, Number(e.target.value)) })
            }
            className="mt-2 w-full rounded-xl border border-sand bg-white px-4 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-clay/30"
          />
        </div>
        <div>
          <label htmlFor={`${fieldId}-date`} className="text-sm font-medium text-ink">Wedding date</label>
          <input
            id={`${fieldId}-date`}
            type="date"
            value={brief.weddingDate}
            onChange={(e) => onChange({ weddingDate: e.target.value })}
            className="mt-2 w-full rounded-xl border border-sand bg-white px-4 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-clay/30"
          />
        </div>
        <div>
          <label htmlFor={`${fieldId}-budget`} className="text-sm font-medium text-ink">
            Product budget{" "}
            <span className="text-ink/40">{formatGBP(brief.budget)}</span>
          </label>
          <input
            id={`${fieldId}-budget`}
            type="range"
            min={2000}
            max={20000}
            step={500}
            value={brief.budget}
            onChange={(e) => onChange({ budget: Number(e.target.value) })}
            className="mt-4 w-full accent-clay"
          />
        </div>
      </section>

      <button
        type="button"
        onClick={onStart}
        className="mt-8 min-h-12 rounded-full bg-ink px-8 py-3.5 text-sm font-medium text-cream transition-colors duration-200 hover:bg-ink/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/50 focus-visible:ring-offset-2 motion-reduce:transition-none"
      >
        Choose products →
      </button>
    </div>
  );
}
