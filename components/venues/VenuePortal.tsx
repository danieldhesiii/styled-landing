"use client";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
  useRef,
  type FormEvent,
} from "react";
import type { VenueListing } from "@/lib/venues";
import { listingMissing } from "@/lib/venue-details";
import { venueEmbed } from "@/lib/venue-input";
import VenueDetailsFields from "./VenueDetailsFields";
import VenueTour from "./VenueTour";
import VenueRequestCard, { type VenueRequest } from "./VenueRequestCard";
type Listing = VenueListing & { active: boolean };
type Draft = { payload: Listing; status: string; updated_at: string };
const field =
  "mt-2 block w-full rounded-lg border border-sand bg-white p-3 text-sm";
export default function VenuePortal() {
  const [venues, setVenues] = useState<Listing[]>([]),
    [selected, setSelected] = useState(""),
    [venue, setVenue] = useState<Listing | null>(null),
    [draft, setDraft] = useState<Draft | null>(null),
    [requests, setRequests] = useState<VenueRequest[]>([]),
    [blocks, setBlocks] = useState<{ day: string; note: string | null }[]>([]),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [tab, setTab] = useState("listing"),
    [adding, setAdding] = useState(false),
    [retry, setRetry] = useState(0);
  const loadSequence = useRef(0);
  const load = useCallback(
    async (id = selected) => {
      const sequence = ++loadSequence.current;
      const r = await fetch(
        `/api/venue-portal${id ? `?venueId=${encodeURIComponent(id)}` : ""}`,
        { cache: "no-store" },
      );
      const d = await r.json();
      if (!r.ok) throw Error(d.error || "Could not load your venue.");
      if (sequence !== loadSequence.current) return;
      setVenues(d.venues);
      setVenue(d.venue || null);
      setDraft(d.draft || null);
      setRequests(d.requests || []);
      setBlocks(d.blocks || []);
      if (d.venue) setSelected(d.venue.id);
      setLoading(false);
    },
    [selected],
  );
  useEffect(() => {
    let active = true;
    load().catch((e) => {
      if (active) {
        setError(e.message);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [load, retry]);
  async function action(body: Record<string, unknown>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await fetch("/api/venue-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, venueId: selected }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || "Could not save.");
      setNotice(
        body.action === "submit"
          ? "Your listing is with Styled for review. We will publish it after checking the details."
          : body.action === "respond"
            ? "Your response is saved. The couple can see it in their venue requests."
            : "Saved.",
      );
      if (d.id) {
        setSelected(d.id);
        setAdding(false);
      }
      await load(d.id || selected);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function profile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const button = (e.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    await action({
      ...Object.fromEntries(f),
      features: f.getAll("features"),
      action: button?.value === "submit" ? "submit" : "save",
    });
  }
  async function upload(input: HTMLInputElement) {
    const file = input.files?.[0];
    if (!file || !selected) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Choose a photo smaller than 5 MB.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(Error("Could not read photo."));
        reader.readAsDataURL(file);
      });
      const r = await fetch("/api/venue-portal/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueId: selected, image }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      const form = document.getElementById("venue-profile") as HTMLFormElement;
      const target = form.elements.namedItem(
        input.dataset.kind === "hero" ? "hero_image" : "gallery_images",
      ) as HTMLInputElement | HTMLTextAreaElement;
      if (input.dataset.kind === "hero") target.value = d.url;
      else {
        const lines = target.value.split("\n").filter(Boolean);
        if (lines.length >= 20)
          throw Error(
            "Your gallery already has 20 photos. Remove one before adding this upload.",
          );
        target.value = [...lines, d.url].join("\n");
      }
      setNotice(
        "Photo added to this form. Save your draft to keep it, then submit for review when ready.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not upload.");
    } finally {
      input.value = "";
      setBusy(false);
    }
  }
  const value = draft?.payload || venue;
  if (loading)
    return (
      <p role="status" className="py-20">
        Loading your venue workspace…
      </p>
    );
  return (
    <div className="py-10 sm:py-16">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs uppercase tracking-widest text-clay">
            For venue teams
          </p>
          <h1 className="mt-3 font-serif text-4xl sm:text-5xl">
            Your venue workspace
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink/60">
            Prepare your listing, manage date requests and keep your calendar up
            to date. Styled reviews listing changes before publishing them.
          </p>
        </div>
        <Link href="/venues" className="text-sm underline">
          Explore the directory →
        </Link>
      </div>
      {error && (
        <div
          role="alert"
          className="my-6 rounded-xl border border-clay p-4 text-sm"
        >
          {error}
          <button
            onClick={() => {
              setError("");
              setRetry((n) => n + 1);
            }}
            type="button"
            className="ml-3 underline"
          >
            Reload
          </button>
        </div>
      )}
      {notice && (
        <p role="status" className="my-6 rounded-xl bg-blush p-4 text-sm">
          {notice}
        </p>
      )}
      {!!venues.length && (
        <div className="my-8 flex flex-wrap items-end gap-4">
          <label className="min-w-0 flex-1 text-sm">
            Your venues
            <select
              className={field}
              value={selected}
              onChange={(e) => {
                setSelected(e.target.value);
                setAdding(false);
                setNotice("");
              }}
            >
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                  {v.active ? " (published)" : " (not published)"}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => setAdding((a) => !a)}
            className="rounded-full border border-sand px-5 py-3 text-sm"
          >
            {adding ? "Close" : "Add another venue"}
          </button>
        </div>
      )}
      {(!venues.length || adding) && (
        <section className="my-8 max-w-2xl rounded-2xl bg-white p-6 sm:p-8">
          <h2 className="font-serif text-3xl">Start your venue listing</h2>
          <p className="mt-3 text-sm text-ink/60">
            Create a private draft first. You can add photography, prices,
            facilities and walkthroughs before submitting it to Styled.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void action({
                ...Object.fromEntries(new FormData(e.currentTarget)),
                action: "create",
              });
            }}
            className="mt-6 grid gap-4 sm:grid-cols-2"
          >
            {[
              ["name", "Venue name"],
              ["location", "Town / location"],
              ["county", "County"],
            ].map(([k, l]) => (
              <label key={k} className="text-sm">
                {l}
                <input name={k} required maxLength={100} className={field} />
              </label>
            ))}
            <button
              disabled={busy}
              className="self-end rounded-full bg-ink px-5 py-3 text-sm text-cream disabled:opacity-50"
            >
              Create private listing
            </button>
          </form>
        </section>
      )}
      {venue && value && (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-3 text-xs">
            <span className="rounded-lg bg-sand px-3 py-2">
              {venue.active ? "Listing published" : "Listing not yet published"}
            </span>
            {draft && (
              <span className="rounded-lg bg-blush px-3 py-2">
                {draft.status === "submitted"
                  ? "Changes awaiting review"
                  : "Draft changes saved"}
              </span>
            )}
            {venue.active && (
              <Link href={`/venues/${venue.slug}`} className="underline">
                View public listing ↗
              </Link>
            )}
          </div>
          <nav
            aria-label="Venue management"
            className="mb-8 grid grid-cols-3 gap-2 border-b border-sand pb-3"
          >
            {[
              ["listing", "Listing"],
              [
                "requests",
                `Requests (${requests.filter((r) => r.status === "new").length})`,
              ],
              ["calendar", "Calendar"],
            ].map(([k, l]) => (
              <button
                key={k}
                type="button"
                aria-current={tab === k ? "page" : undefined}
                onClick={() => setTab(k)}
                className={`rounded-full px-2 py-3 text-xs sm:px-5 sm:text-sm ${tab === k ? "bg-ink text-cream" : "border border-sand"}`}
              >
                {l}
              </button>
            ))}
          </nav>
          <section hidden={tab !== "listing"}>
            <div className="mb-6 max-w-3xl text-sm leading-relaxed text-ink/60">
              <p>
                Save your draft before switching venues. Draft changes stay
                private until Styled approves them; your currently published
                page stays as it is.
              </p>
              <p className="mt-2">
                {listingMissing(value).length
                  ? `Before submitting, add: ${listingMissing(value).join(", ")}.`
                  : "Your core details are ready. Check your facilities, inclusions and media before submitting."}
              </p>
            </div>
            <form
              id="venue-profile"
              key={`${venue.id}-${draft?.updated_at || "live"}`}
              onSubmit={profile}
              className="grid gap-5 rounded-2xl border border-sand bg-white p-5 sm:grid-cols-2 sm:p-8"
            >
              {(
                [
                  ["name", "Venue name"],
                  ["location", "Town / location"],
                  ["county", "County"],
                  ["capacity_min", "Minimum wedding guests"],
                  ["capacity_max", "Maximum seated wedding guests"],
                ] as const
              ).map(([k, l]) => (
                <label key={k} className="text-sm">
                  {l}
                  <input
                    name={k}
                    required={["name", "location", "county"].includes(k)}
                    type={k.startsWith("capacity") ? "number" : "text"}
                    min="1"
                    maxLength={200}
                    defaultValue={value[k] ?? ""}
                    className={field}
                  />
                </label>
              ))}
              <label className="text-sm">
                Setting
                <select
                  name="indoor_outdoor"
                  defaultValue={value.indoor_outdoor || ""}
                  className={field}
                >
                  <option value="">Not specified</option>
                  <option value="indoor">Indoor</option>
                  <option value="outdoor">Outdoor</option>
                  <option value="both">Both</option>
                </select>
              </label>
              <label className="text-sm sm:col-span-2">
                About your venue
                <textarea
                  name="description"
                  rows={5}
                  maxLength={10000}
                  defaultValue={value.description || ""}
                  className={field}
                />
              </label>
              <VenueDetailsFields details={value.details} pricesInPounds />
              <fieldset className="grid gap-5 border-t border-sand pt-6 sm:col-span-2 sm:grid-cols-2">
                <legend className="mb-4 font-serif text-2xl">
                  Photography & walkthroughs
                </legend>
                <p className="text-sm text-ink/60 sm:col-span-2">
                  Use venue photography you have permission to publish. Uploads
                  are hosted for your public listing. Save the draft after
                  uploading.
                </p>
                <label className="text-sm">
                  Main photograph URL
                  <input
                    name="hero_image"
                    defaultValue={value.hero_image || ""}
                    className={field}
                  />
                  <input
                    type="file"
                    data-kind="hero"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={busy}
                    onChange={(e) => void upload(e.currentTarget)}
                    className="mt-3 block w-full text-xs"
                  />
                </label>
                <label className="text-sm">
                  Gallery URLs (one per line, up to 20)
                  <textarea
                    name="gallery_images"
                    rows={4}
                    defaultValue={value.gallery_images?.join("\n") || ""}
                    className={field}
                  />
                  <input
                    type="file"
                    data-kind="gallery"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={busy}
                    onChange={(e) => void upload(e.currentTarget)}
                    className="mt-3 block w-full text-xs"
                  />
                </label>
                <label className="text-sm">
                  360° / 3D walkthrough URL
                  <input
                    name="matterport_url"
                    defaultValue={value.matterport_url || ""}
                    placeholder="Matterport or Kuula share URL"
                    className={field}
                  />
                  <span className="mt-2 block text-xs leading-relaxed text-ink/60">
                    Leave blank until you have a captured tour. Add a public
                    Matterport or Kuula share link, not iframe code. Ordinary
                    photos do not automatically become a walkable tour.
                  </span>
                </label>
                <label className="text-sm">
                  Video tour URL
                  <input
                    name="video_url"
                    defaultValue={value.video_url || ""}
                    placeholder="YouTube or Vimeo URL"
                    className={field}
                  />
                </label>
                <label className="text-sm">
                  Google Maps embed URL
                  <input
                    name="map_embed_url"
                    defaultValue={value.map_embed_url || ""}
                    className={field}
                  />
                </label>
                <label className="text-sm">
                  Styling from (£, optional)
                  <input
                    name="styling_from_pounds"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={
                      value.package_from_pence != null
                        ? value.package_from_pence / 100
                        : ""
                    }
                    className={field}
                  />
                  <span className="mt-2 block text-xs text-ink/60">
                    Only for decor and styling, separate from venue hire. Styled
                    can help set up styling packages.
                  </span>
                </label>
              </fieldset>
              <div className="flex flex-wrap gap-3 border-t border-sand pt-6 sm:col-span-2">
                <button
                  name="intent"
                  value="save"
                  disabled={busy}
                  className="rounded-full border border-sand px-6 py-3 text-sm disabled:opacity-50"
                >
                  Save draft
                </button>
                <button
                  name="intent"
                  value="submit"
                  disabled={busy}
                  className="rounded-full bg-ink px-6 py-3 text-sm text-cream disabled:opacity-50"
                >
                  Submit for review
                </button>
              </div>
            </form>
            <VenueTour
              management
              name={value.name}
              url={venueEmbed(value.matterport_url, "tour")}
            />
            <p className="mt-3 text-xs text-ink/60">
              This preview uses your last saved tour link.
            </p>
          </section>
          <section hidden={tab !== "requests"}>
            <h2 className="font-serif text-3xl">Booking & viewing requests</h2>
            <p className="mt-3 text-sm text-ink/60">
              Review plans, confirm dates manually and offer alternatives where
              needed. Contact details are visible only to your venue team and
              Styled staff.
            </p>
            {!requests.length && (
              <p className="mt-6 rounded-xl bg-white p-6 text-sm text-ink/60">
                No requests yet. Once your venue is published, couples can
                contact you here.
              </p>
            )}
            {requests.map((r) => (
              <VenueRequestCard
                key={r.id}
                request={r}
                busy={busy}
                onRespond={(v) => void action({ ...v, action: "respond" })}
              />
            ))}
          </section>
          <section hidden={tab !== "calendar"}>
            <h2 className="font-serif text-3xl">Dates & availability</h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink/60">
              Block dates booked elsewhere, maintenance days or dates you cannot
              host. Confirmed Styled bookings are blocked automatically. An
              unblocked date is still subject to your confirmation.
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                if (
                  await action({
                    ...Object.fromEntries(new FormData(form)),
                    action: "block",
                    block: true,
                  })
                )
                  form.reset();
              }}
              className="my-6 grid max-w-2xl gap-4 rounded-xl bg-white p-5 sm:grid-cols-2"
            >
              <label className="text-sm">
                Date
                <input type="date" required name="day" className={field} />
              </label>
              <label className="text-sm">
                Private note (optional)
                <input name="note" maxLength={300} className={field} />
              </label>
              <button
                disabled={busy}
                className="justify-self-start rounded-full bg-ink px-5 py-3 text-sm text-cream disabled:opacity-50"
              >
                Block date
              </button>
            </form>
            <ul className="max-w-2xl divide-y divide-sand">
              {blocks.map((b) => (
                <li
                  key={b.day}
                  className="flex items-center justify-between gap-4 py-4 text-sm"
                >
                  <div>
                    {b.day}
                    <p className="mt-1 text-ink/60">
                      {b.note || "Unavailable"}
                    </p>
                  </div>
                  <button
                    disabled={busy}
                    type="button"
                    onClick={() =>
                      void action({ action: "block", day: b.day, block: false })
                    }
                    className="underline"
                  >
                    Unblock
                  </button>
                </li>
              ))}
            </ul>
            {requests
              .filter((r) => r.status === "booked")
              .map((r) => (
                <p key={r.id} className="mt-3 text-sm">
                  {r.preferred_date} · Confirmed Styled booking · {r.name}
                </p>
              ))}
            {!blocks.length && !requests.some((r) => r.status === "booked") && (
              <p className="mt-5 text-sm text-ink/60">
                No blocked or confirmed dates yet.
              </p>
            )}
          </section>
        </>
      )}
      <p className="mt-12 text-sm text-ink/60">
        Need help with an existing listing or your team’s access?{" "}
        <a href="mailto:support@styleduk.com" className="underline">
          support@styleduk.com
        </a>
      </p>
    </div>
  );
}
