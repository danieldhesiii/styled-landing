"use client";
import { useRef, useState } from "react";
import type { WeddingBrief } from "@/lib/wedding";
import DeliveryDates from "./DeliveryDates";
import { uploadVenuePhoto } from "@/lib/upload-venue-photo";
export default function MyWedding({
  brief,
  photos,
  onChange,
  onSave,
  saving,
  loaded,
  status,
  onFindVenue,
  onVisualise,
}: {
  brief: WeddingBrief;
  photos: Record<string, string>;
  onChange: (p: Partial<WeddingBrief>) => void;
  onSave: () => void;
  saving: boolean;
  loaded: boolean;
  status: string;
  onFindVenue: () => void;
  onVisualise: () => void;
}) {
  const [uploading, setUploading] = useState(false),
    [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const field =
    "mt-2 block w-full min-w-0 rounded-xl border border-sand bg-white px-3 py-2.5 text-sm";
  async function upload(file?: File) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const p = await uploadVenuePhoto(file);
      onChange({
        uploadedImages: [...brief.uploadedImages, { id: p.id, url: p.url }],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not upload.");
    } finally {
      setUploading(false);
    }
  }
  return (
    <section className="rounded-2xl border border-sand bg-white p-5 sm:p-8">
      <p className="text-xs uppercase tracking-widest text-clay">
        A place for your plans
      </p>
      <h1 className="mt-3 font-serif text-4xl sm:text-5xl">Wedding details</h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink/60">
        Keep your dates, guest count, budget and chosen venue in one private
        space. Use Venues to discover places to book, then save your plans here.
      </p>
      <div className="mt-8 grid gap-10 lg:grid-cols-2">
        <div className="space-y-8">
          <fieldset>
            <legend className="font-serif text-2xl">
              Where are you in your plans?
            </legend>
            <div className="mt-4 flex flex-wrap gap-2">
              {(
                [
                  ["have", "I have a venue"],
                  ["looking", "I’m looking for a venue"],
                  ["exploring", "I’m just exploring"],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={(brief.venueChoice || "exploring") === v}
                  onClick={() => onChange({ venueChoice: v })}
                  className={`rounded-full border px-4 py-2 text-sm ${(brief.venueChoice || "exploring") === v ? "border-ink bg-ink text-cream" : "border-sand"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
          {brief.venueChoice === "have" && (
            <label className="block text-sm">
              Venue name
              <input
                maxLength={160}
                value={brief.venueName || ""}
                onChange={(e) =>
                  onChange({
                    venueName: e.target.value,
                    venueId: "manor_orangery",
                  })
                }
                placeholder="The place you’ve chosen"
                className={field}
              />
            </label>
          )}
          <label className="block text-sm">
            {brief.venueChoice === "have"
              ? "Venue postcode"
              : "Wedding search postcode"}
            <input
              maxLength={10}
              autoComplete="postal-code"
              value={brief.venuePostcode || ""}
              onChange={(e) =>
                onChange({ venuePostcode: e.target.value.toUpperCase() })
              }
              placeholder="e.g. SW1A 1AA"
              className={field}
            />
            <span className="mt-2 block text-xs text-ink/50">
              Use the wedding location so recommendations are relevant to your
              day.
            </span>
          </label>
          {brief.venueChoice === "looking" && (
            <button
              type="button"
              onClick={onFindVenue}
              className="rounded-full border border-sand px-5 py-2 text-sm"
            >
              Explore venues →
            </button>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              Guests
              <input
                type="number"
                min={1}
                max={1000}
                value={brief.guestCount}
                onChange={(e) =>
                  onChange({ guestCount: Number(e.target.value) })
                }
                className={field}
              />
            </label>
            <label className="text-sm">
              Budget (£)
              <input
                type="number"
                min={0}
                max={1000000}
                value={brief.budget}
                onChange={(e) => onChange({ budget: Number(e.target.value) })}
                className={field}
              />
            </label>
          </div>
        </div>
        <DeliveryDates {...brief} onChange={onChange} id="planning" />
      </div>
      <section className="mt-10 border-t border-sand pt-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-3xl">Your venue photographs</h2>
            <p className="mt-2 text-sm text-ink/60">
              Save different rooms and angles. The first photo is the starting
              image for your visualiser. These stay private.
            </p>
          </div>
          <button
            type="button"
            disabled={uploading || brief.uploadedImages.length >= 20}
            onClick={() => input.current?.click()}
            className="rounded-full border border-sand px-5 py-2 text-sm disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Add a venue photo"}
          </button>
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
            className="hidden"
            onChange={(e) => {
              void upload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
        {error && (
          <p role="alert" className="mt-3 text-sm text-clay">
            {error}
          </p>
        )}
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {brief.uploadedImages.map((p, i) => (
            <figure key={p.id}>
              <img
                src={p.url}
                alt={`Your private venue, angle ${i + 1}`}
                className="aspect-[4/3] w-full rounded-xl object-cover"
              />
              <figcaption className="mt-2 flex flex-wrap gap-3 text-xs">
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      uploadedImages: [
                        p,
                        ...brief.uploadedImages.filter((v) => v.id !== p.id),
                      ],
                    })
                  }
                  className="underline"
                >
                  {i === 0 ? "Starting image" : "Use as starting image"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      uploadedImages: brief.uploadedImages.filter(
                        (v) => v.id !== p.id,
                      ),
                    })
                  }
                  className="underline"
                >
                  Remove from wedding
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
        {!brief.uploadedImages.length && (
          <p className="mt-5 rounded-xl bg-cream p-5 text-sm text-ink/50">
            Add a photograph when you’re ready. You can browse the catalogue
            without one.
          </p>
        )}
      </section>
      {Object.keys(photos).some(
        (id) => !brief.uploadedImages.some((p) => p.id === id),
      ) && (
        <details className="mt-6">
          <summary className="cursor-pointer text-sm underline">
            Choose from your other private images
          </summary>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Object.entries(photos)
              .filter(([id]) => !brief.uploadedImages.some((p) => p.id === id))
              .map(([id, url]) => (
                <button
                  type="button"
                  key={id}
                  onClick={() =>
                    onChange({
                      uploadedImages: [...brief.uploadedImages, { id, url }],
                    })
                  }
                  className="text-left text-xs"
                >
                  <img
                    src={url}
                    alt="Private image from your account"
                    className="mb-2 aspect-[4/3] w-full rounded-xl object-cover"
                  />
                  Add to venue photographs
                </button>
              ))}
          </div>
        </details>
      )}
      <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-sand pt-6">
        <button
          type="button"
          disabled={!loaded || saving || uploading}
          onClick={onSave}
          className="rounded-full bg-ink px-6 py-3 text-sm text-cream disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save wedding details"}
        </button>
        <button
          type="button"
          onClick={onVisualise}
          className="rounded-full border border-sand px-5 py-3 text-sm"
        >
          Open visualiser
        </button>
        <p role="status" className="text-xs text-ink/60">
          {status}
        </p>
      </div>
    </section>
  );
}
