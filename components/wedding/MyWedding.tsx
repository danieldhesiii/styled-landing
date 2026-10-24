"use client";
import { useEffect, useRef, useState } from "react";
import type { WeddingBrief } from "@/lib/wedding";
import { dateRangeLabel } from "@/lib/booking-dates";
import { deliveryDay } from "@/lib/wedding";
import DeliveryDates from "./DeliveryDates";
import { uploadVenuePhoto } from "@/lib/upload-venue-photo";

type Panel = "setup" | "overview" | "day" | "venue" | "photos";
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
  onChange: (patch: Partial<WeddingBrief>) => void;
  onSave: (patch?: Partial<WeddingBrief>) => Promise<boolean>;
  saving: boolean;
  loaded: boolean;
  status: string;
  onFindVenue: () => void;
  onVisualise: () => void;
  onBrowse: () => void;
  onBoards: () => void;
  onBookings: (section?: "venues") => void;
}) {
  const [panel, setPanel] = useState<Panel>("setup");
  const initialised = useRef(false);
  useEffect(() => {
    if (loaded && !initialised.current) {
      initialised.current = true;
      setPanel(
        brief.planSetupComplete || brief.weddingDate || brief.venueName
          ? "overview"
          : "setup",
      );
    }
  }, [loaded, brief.planSetupComplete, brief.weddingDate, brief.venueName]);
  const [uploading, setUploading] = useState(false),
    [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const field =
    "mt-2 block w-full min-w-0 rounded-xl border border-sand bg-white px-3 py-2.5 text-sm";
  const starting = brief.planSetupComplete !== true && panel === "setup";
  const estimated = brief.guestCountEstimated ?? starting;
  const unknownBudget = brief.budgetUnknown ?? starting;
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
  async function save(finish = false) {
    setError("");
    const patch = finish
      ? {
          planSetupComplete: true,
          guestCountEstimated: estimated,
          budgetUnknown: unknownBudget,
          ...(unknownBudget ? { budget: 0 } : {}),
        }
      : undefined;
    if (await onSave(patch)) setPanel("overview");
  }
  const dateLabel = brief.weddingDate
    ? new Date(brief.weddingDate + "T12:00:00").toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Date undecided";
  const venueName =
    brief.venueChoice === "have" && brief.venueName
      ? brief.venueName
      : "Still finding a venue";
  return (
    <section className="rounded-2xl border border-sand bg-white p-5 sm:p-8">
      <p className="text-xs uppercase tracking-widest text-clay">
        Your private planning space
      </p>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <h1 className="font-serif text-4xl sm:text-5xl">Wedding plan</h1>
        {loaded && panel !== "setup" && (
          <p
            role="status"
            className="max-w-xs text-xs leading-relaxed text-ink/70"
          >
            {saving ? "Saving your changes…" : status}
          </p>
        )}
      </div>
      {!loaded ? (
        <div role="status" className="mt-8 space-y-4">
          <p className="text-sm text-ink/70">
            Loading your saved plan before you edit…
          </p>
          <div className="h-24 animate-pulse rounded-xl bg-sand/40" />
        </div>
      ) : (
        <>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink/70">
            {panel === "setup"
              ? "A few details will help us find relevant pieces. Estimates are fine, and you can edit everything later."
              : "Your dates guide availability, guests guide quantities, and your budget covers the supplier basket. Venue hire is agreed separately."}
          </p>
          {panel === "overview" && (
            <>
              <div className="mt-7 grid gap-6 border-y border-sand py-6 sm:grid-cols-3">
                {(
                  [
                    [
                      "Your day",
                      dateLabel,
                      `${estimated ? "Estimated " : ""}${brief.guestCount} guests · Default hire: ${dateRangeLabel(deliveryDay(brief), brief.returnDate || brief.weddingDate)}`,
                      "day",
                    ],
                    [
                      "Supplier budget",
                      unknownBudget
                        ? "Not set yet"
                        : new Intl.NumberFormat("en-GB", {
                            style: "currency",
                            currency: "GBP",
                            maximumFractionDigits: 0,
                          }).format(brief.budget),
                      "Products and styling, excluding venue hire",
                      "day",
                    ],
                    [
                      "Your planned venue",
                      venueName,
                      "Your private choice, not a booking confirmation",
                      "venue",
                    ],
                  ] as const
                ).map(([label, value, note, target]) => (
                  <section key={label} className="min-w-0">
                    <h2 className="text-xs text-ink/70">{label}</h2>
                    <p className="mt-2 break-words font-serif text-2xl">
                      {value}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-ink/70">
                      {note}
                    </p>
                    <button
                      type="button"
                      onClick={() => setPanel(target)}
                      className="mt-3 min-h-10 text-sm underline"
                    >
                      Edit {label.toLowerCase()} →
                    </button>
                  </section>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-serif text-2xl">Venue photographs</h2>
                  <p className="mt-2 text-sm text-ink/70">
                    {brief.uploadedImages.length
                      ? `${brief.uploadedImages.length} private photos for your visualiser`
                      : "Add photos when you have them. You can shop without uploading."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPanel("photos")}
                  className="rounded-full border border-sand px-5 py-3 text-sm"
                >
                  Manage photos
                </button>
              </div>
              <div className="mt-8 flex flex-wrap gap-3 border-t border-sand pt-6">
                <button
                  type="button"
                  onClick={onBrowse}
                  className="rounded-full bg-ink px-6 py-3 text-sm text-cream"
                >
                  Browse pieces for your day →
                </button>
                <button
                  type="button"
                  onClick={onBoards}
                  className="rounded-full border border-sand px-5 py-3 text-sm"
                >
                  Collect ideas on Boards
                </button>
                <button
                  type="button"
                  onClick={() => onBookings()}
                  className="px-2 py-3 text-sm underline"
                >
                  My bookings
                </button>
              </div>
            </>
          )}
          {(panel === "setup" || panel === "day") && (
            <div className="mt-7 grid gap-6 lg:grid-cols-2">
              <div className="space-y-5">
                <div>
                  <label className="text-sm">
                    Estimated wedding guests
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={brief.guestCount}
                      onChange={(e) =>
                        onChange({
                          guestCount: Number(e.target.value),
                          guestCountEstimated: false,
                        })
                      }
                      className={field}
                    />
                  </label>
                  <label className="mt-3 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={estimated}
                      onChange={(e) =>
                        onChange({ guestCountEstimated: e.target.checked })
                      }
                    />
                    I’m still estimating
                  </label>
                  <p className="mt-2 text-xs text-ink/70">
                    {estimated
                      ? "Using this estimate to suggest quantities. Change it whenever you know more."
                      : "Use the number you are planning for."}
                  </p>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={unknownBudget}
                      onChange={(e) =>
                        onChange({
                          budgetUnknown: e.target.checked,
                          ...(e.target.checked ? { budget: 0 } : {}),
                        })
                      }
                    />
                    I haven’t set a supplier budget
                  </label>
                  {!unknownBudget && (
                    <label className="mt-3 block text-sm">
                      Supplier basket budget (£)
                      <input
                        type="number"
                        min="0"
                        max="1000000"
                        value={brief.budget}
                        onChange={(e) =>
                          onChange({
                            budget: Number(e.target.value),
                            budgetUnknown: false,
                          })
                        }
                        className={field}
                      />
                    </label>
                  )}
                  <p className="mt-2 text-xs text-ink/70">
                    For products and styling. Your venue hire is separate.
                  </p>
                </div>
              </div>
              <div>
                <DeliveryDates {...brief} onChange={onChange} id="plan-setup" />
                <p className="mt-2 text-xs text-ink/70">
                  Date undecided? Leave it blank and browse for ideas.
                </p>
              </div>
            </div>
          )}
          {(panel === "setup" || panel === "venue") && (
            <section
              id="plan-venue"
              className="mt-7 scroll-mt-24 border-t border-sand pt-6"
            >
              <h2 className="font-serif text-2xl">
                {panel === "setup"
                  ? "Where are you with your venue?"
                  : "Your venue choice"}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink/70">
                Use Find venues to discover places and request dates. Save the
                place you’re planning around here, including one booked
                elsewhere.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(
                  [
                    ["have", "I have a venue"],
                    ["looking", "I’m looking"],
                    ["exploring", "Just exploring"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={(brief.venueChoice || "exploring") === value}
                    onClick={() => onChange({ venueChoice: value })}
                    className={`min-h-11 rounded-full border px-4 py-2 text-sm ${(brief.venueChoice || "exploring") === value ? "border-ink bg-ink text-cream" : "border-sand"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                {brief.venueChoice === "have" && (
                  <label className="text-sm">
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
                <label className="text-sm">
                  {brief.venueChoice === "have"
                    ? "Venue postcode"
                    : "Preferred area postcode (optional)"}
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
                </label>
              </div>
              {panel !== "setup" && (
                <div className="mt-5 flex flex-wrap gap-5 text-sm">
                  <button
                    type="button"
                    onClick={onFindVenue}
                    className="underline"
                  >
                    Find venues →
                  </button>
                  {brief.venueId.startsWith("listing:") && (
                    <a
                      href={`/venues/${encodeURIComponent(brief.venueId.slice(8))}`}
                      className="underline"
                    >
                      View this venue / request a date →
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => onBookings("venues")}
                    className="underline"
                  >
                    Check venue requests →
                  </button>
                </div>
              )}
              <p className="mt-3 text-xs leading-relaxed text-ink/70">
                Saving here keeps your choice private. It does not publish a
                listing or reserve a date.
              </p>
            </section>
          )}
          {panel === "photos" && (
            <>
              <section className="mt-10 border-t border-sand pt-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="font-serif text-3xl">
                      Your venue photographs
                    </h2>
                    <p className="mt-2 text-sm text-ink/60">
                      Save different rooms and angles. The first photo is the
                      starting image for your visualiser. These stay private.
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
                                ...brief.uploadedImages.filter(
                                  (v) => v.id !== p.id,
                                ),
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
                    Add a photograph when you’re ready. You can browse the
                    catalogue without one.
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
                      .filter(
                        ([id]) =>
                          !brief.uploadedImages.some((p) => p.id === id),
                      )
                      .map(([id, url]) => (
                        <button
                          type="button"
                          key={id}
                          onClick={() =>
                            onChange({
                              uploadedImages: [
                                ...brief.uploadedImages,
                                { id, url },
                              ],
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
              <button
                type="button"
                onClick={onVisualise}
                className="mt-5 rounded-full border border-sand px-5 py-3 text-sm"
              >
                Open visualiser →
              </button>
            </>
          )}
          {(panel !== "overview" || status.includes("unsaved") || saving) && (
            <div className="sticky bottom-20 mt-7 flex flex-wrap items-center gap-3 rounded-xl border border-sand bg-cream p-4 shadow-sm md:bottom-3">
              <button
                type="button"
                disabled={saving || uploading}
                onClick={() => void save(panel === "setup")}
                className="rounded-full bg-ink px-6 py-3 text-sm text-cream disabled:opacity-50"
              >
                {saving
                  ? "Saving…"
                  : panel === "setup"
                    ? "Save & start planning →"
                    : "Save changes"}
              </button>
              {panel !== "overview" && panel !== "setup" && (
                <button
                  type="button"
                  onClick={() => setPanel("overview")}
                  className="px-3 py-3 text-sm underline"
                >
                  Back to overview
                </button>
              )}
              {panel === "setup" && (
                <button
                  type="button"
                  onClick={onBrowse}
                  className="px-2 py-3 text-sm underline"
                >
                  Explore first
                </button>
              )}
              <p
                role="status"
                className="basis-full text-xs leading-relaxed text-ink/70 sm:basis-auto"
              >
                {saving ? "Saving your changes…" : status}
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
