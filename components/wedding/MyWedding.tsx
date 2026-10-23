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
  onBrowse,
  onBoards,
  onBookings,
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
  onBrowse: () => void;
  onBoards: () => void;
  onBookings: (section?: "venues") => void;
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
        Your private planning space
      </p>
      <h1 className="mt-3 font-serif text-4xl sm:text-5xl">Wedding plan</h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink/60">
        Set the details that guide your shopping: dates for availability, guests
        for quantities and a budget for your supplier basket. Keep your chosen
        venue and photos here too. Update the plan as your day takes shape.
      </p>
      <dl className="mt-7 grid grid-cols-2 gap-x-5 gap-y-6 border-y border-sand py-6 lg:grid-cols-4">
        {[
          [
            "Wedding date",
            brief.weddingDate
              ? new Date(brief.weddingDate + "T12:00:00").toLocaleDateString(
                  "en-GB",
                  { day: "numeric", month: "short", year: "numeric" },
                )
              : "Not set yet",
          ],
          ["Wedding guests", String(brief.guestCount)],
          [
            "Supplier basket budget",
            new Intl.NumberFormat("en-GB", {
              style: "currency",
              currency: "GBP",
              maximumFractionDigits: 0,
            }).format(brief.budget),
          ],
          [
            "Planned venue",
            brief.venueChoice === "have" && brief.venueName
              ? brief.venueName
              : "Still exploring",
          ],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-xs text-ink/60">{label}</dt>
            <dd className="mt-2 break-words font-serif text-xl">{value}</dd>
          </div>
        ))}
      </dl>
      <section id="plan-day" className="mt-8 scroll-mt-24">
        <h2 className="font-serif text-3xl">1. Your day & budget</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink/60">
          Your wedding and delivery dates carry into the catalogue. Guest
          numbers help estimate quantities. The budget tracks your supplier
          basket; venue hire is agreed separately.
        </p>
        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <div className="grid content-start gap-5 sm:grid-cols-2">
            <label className="text-sm">
              Wedding guests
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
              Supplier basket budget (£)
              <input
                type="number"
                min={0}
                max={1000000}
                value={brief.budget}
                onChange={(e) => onChange({ budget: Number(e.target.value) })}
                className={field}
              />
              <span className="mt-2 block text-xs text-ink/50">
                For products and styling, excluding venue hire.
              </span>
            </label>
          </div>
          <DeliveryDates {...brief} onChange={onChange} id="planning" />
        </div>
      </section>
      <section
        id="plan-venue"
        className="mt-10 scroll-mt-24 border-t border-sand pt-7"
      >
        <h2 className="font-serif text-3xl">2. Your venue choice</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink/60">
          Use Find venues to discover places and request a viewing or booking.
          This part of your plan records the place you are planning around,
          including a venue booked outside Styled.
        </p>
        <fieldset className="mt-5">
          <legend className="text-sm font-medium">
            Where are you with your venue?
          </legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {(
              [
                ["have", "I have chosen a venue"],
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
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {brief.venueChoice === "have" && (
            <label className="text-sm">
              Your chosen venue name
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
              <span className="mt-2 block text-xs text-ink/50">
                Saved privately to your wedding plan. This does not publish a
                venue listing or confirm a booking.
              </span>
            </label>
          )}
          <label className="text-sm">
            {brief.venueChoice === "have"
              ? "Venue postcode"
              : "Preferred wedding area postcode"}
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
              Helps find nearby venues and suppliers. You can add this before
              choosing a venue.
            </span>
          </label>
        </div>
        <div className="mt-5 flex flex-wrap gap-5 text-sm">
          <button type="button" onClick={onFindVenue} className="underline">
            {brief.venueChoice === "have"
              ? "Explore other venues →"
              : "Find a venue in the directory →"}
          </button>
          {brief.venueId.startsWith("listing:") && (
            <a
              href={`/venues/${encodeURIComponent(brief.venueId.slice(8))}`}
              className="underline"
            >
              View your planned venue / request a date →
            </a>
          )}
          <button
            type="button"
            onClick={() => onBookings("venues")}
            className="underline"
          >
            Check venue requests in My bookings →
          </button>
        </div>
        <p className="mt-4 rounded-xl bg-cream p-4 text-xs leading-relaxed text-ink/60">
          A planned venue is a personal choice, not a reservation. Follow the
          actual booking status under My bookings, then Venue requests. For
          bookings made elsewhere, confirm dates directly with your venue.
        </p>
      </section>
      <section className="mt-10 border-t border-sand pt-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-3xl">3. Your venue photographs</h2>
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
      <section className="mt-10 border-t border-sand pt-7">
        <h2 className="font-serif text-3xl">Continue planning</h2>
        <p className="mt-3 text-sm text-ink/60">
          Save changes below to keep them across devices. You can explore the
          rest of Styled without completing every detail.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {[
            [
              "Find pieces",
              "Shop with your dates, guest count and budget.",
              onBrowse,
            ],
            [
              "Collect ideas",
              "Keep inspiration, products and looks on your boards.",
              onBoards,
            ],
            [
              "Track bookings",
              "Follow supplier orders and venue requests.",
              () => onBookings(),
            ],
          ].map(([title, description, action]) => (
            <button
              type="button"
              key={String(title)}
              onClick={action as () => void}
              className="border-b border-sand py-4 text-left"
            >
              <span className="block font-serif text-2xl">
                {String(title)} ↗
              </span>
              <span className="mt-2 block text-sm leading-relaxed text-ink/60">
                {String(description)}
              </span>
            </button>
          ))}
        </div>
      </section>
      <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-sand pt-6">
        <button
          type="button"
          disabled={!loaded || saving || uploading}
          onClick={onSave}
          className="rounded-full bg-ink px-6 py-3 text-sm text-cream disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save wedding plan"}
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
