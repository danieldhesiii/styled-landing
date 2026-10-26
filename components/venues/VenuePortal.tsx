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
  const profileRef = useRef<HTMLFormElement>(null);
  const dirtyFormRef = useRef<HTMLFormElement | null>(null);
  const leavingRef = useRef(false);
  const unsavedDialogRef = useRef<HTMLDialogElement>(null);
  const stayButtonRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const [dirty, setDirty] = useState(false);
  const [missing, setMissing] = useState<string[] | null>(null);
  const [onboarding, setOnboarding] = useState("new");
  type Destination =
    | { venueId: string }
    | { href: string }
    | { add: boolean }
    | { reload: true };
  const [pending, setPending] = useState<Destination | null>(null);
  function navigate(to: Destination) {
    setPending(null);
    setDirty(false);
    setMissing(null);
    if ("href" in to) {
      leavingRef.current = true;
      window.location.assign(to.href);
    } else if ("venueId" in to) {
      setSelected(to.venueId);
      setAdding(false);
      setNotice("");
    } else if ("reload" in to) setRetry((n) => n + 1);
    else setAdding(to.add);
  }
  function openUnsavedDialog(to: Destination, trigger?: HTMLElement) {
    restoreFocusRef.current =
      trigger ??
      (document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null);
    setPending(to);
  }
  function requestNavigation(to: Destination) {
    if (dirty) openUnsavedDialog(to);
    else navigate(to);
  }
  useEffect(() => {
    if (!pending) return;
    const dialog = unsavedDialogRef.current;
    if (!dialog) return;
    const previousFocus = restoreFocusRef.current;
    if (!dialog.open) dialog.showModal();
    stayButtonRef.current?.focus();
    return () => {
      if (dialog.open) dialog.close();
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [pending]);
  useEffect(() => {
    if (!dirty) return;
    const unload = (e: BeforeUnloadEvent) => {
      if (!leavingRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const click = (e: MouseEvent) => {
      const a = (e.target as Element).closest?.(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (
        !a ||
        a.target === "_blank" ||
        a.download ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey ||
        e.button !== 0 ||
        !/^https?:/.test(a.href)
      )
        return;
      e.preventDefault();
      openUnsavedDialog({ href: a.href }, a);
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", click, true);
    };
  }, [dirty]);
  function markDirty() {
    dirtyFormRef.current = profileRef.current;
    setDirty(true);
    if (profileRef.current)
      setMissing(
        listingMissing(
          Object.fromEntries(
            new FormData(profileRef.current),
          ) as unknown as Parameters<typeof listingMissing>[0],
        ),
      );
  }
  const load = useCallback(async (id = "", keepEdits = false) => {
    const sequence = ++loadSequence.current;
    const r = await fetch(
      `/api/venue-portal${id ? `?venueId=${encodeURIComponent(id)}` : ""}`,
      { cache: "no-store" },
    );
    const d = await r.json();
    if (!r.ok) throw Error(d.error || "Could not load your venue.");
    if (sequence !== loadSequence.current) return;
    setVenues(d.venues);
    if (!keepEdits) {
      setVenue(d.venue || null);
      setDraft(d.draft || null);
      setMissing(null);
    }
    setRequests(d.requests || []);
    setBlocks(d.blocks || []);
    if (d.venue) setSelected(d.venue.id);
    setLoading(false);
  }, []);
  useEffect(() => {
    let active = true;
    load(selected).catch((e) => {
      if (active) {
        setError(e.message);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [load, retry, selected]);
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
      const savedProfile = ["save", "submit", "create"].includes(
        String(body.action),
      );
      if (savedProfile) {
        setDirty(false);
        setMissing(null);
      }
      await load(d.id || selected, !savedProfile);
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
    if (input.dataset.kind === "gallery") {
      const gallery = profileRef.current?.elements.namedItem(
        "gallery_images",
      ) as HTMLTextAreaElement | null;
      if ((gallery?.value.split("\n").filter(Boolean).length || 0) >= 20) {
        setError("Remove a gallery photo before uploading another.");
        return;
      }
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
      markDirty();
      setNotice(
        "Photo uploaded to PUBLIC storage. Save your draft to keep the link; discarding the form does not delete the uploaded file.",
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
              requestNavigation({ reload: true });
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
              disabled={busy}
              onChange={(e) => {
                requestNavigation({ venueId: e.target.value });
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
            onClick={() => requestNavigation({ add: !adding })}
            disabled={busy}
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
            Choose the right starting point. A new listing starts as an
            unpublished draft; uploaded media uses public storage.
          </p>
          <label className="mt-4 block text-sm">
            Getting started
            <select
              value={onboarding}
              onChange={(e) => {
                if (!dirty) setOnboarding(e.target.value);
              }}
              disabled={dirty}
              className={field}
            >
              <option value="new">New venue listing</option>
              <option value="existing">
                My venue is already listed: help with access
              </option>
            </select>
          </label>
          {onboarding === "existing" ? (
            <p className="mt-5 text-sm">
              Do not create a duplicate listing.{" "}
              <a
                href="mailto:support@styleduk.com?subject=Existing%20venue%20listing%20access"
                className="underline"
              >
                Contact support@styleduk.com
              </a>{" "}
              with your venue name and work email. Styled will verify team
              access.
            </p>
          ) : (
            <form
              onChangeCapture={(e) => {
                dirtyFormRef.current = e.currentTarget;
                setDirty(true);
              }}
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
                Create unpublished draft
              </button>
            </form>
          )}
        </section>
      )}
      {venue && value && venue.id === selected && !adding && (
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
            className="mb-8 grid grid-cols-2 gap-2 border-b border-sand pb-3 sm:grid-cols-4"
          >
            {[
              ["listing", "Listing details"],
              ["media", "Photos & tours"],
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
          <section hidden={tab !== "listing" && tab !== "media"}>
            <div className="mb-6 max-w-3xl text-sm leading-relaxed text-ink/60">
              <p>
                Listing edits remain unpublished until Styled approves them.
                Uploaded photos are PUBLIC as soon as they upload, including
                when the listing is still a draft. Never upload confidential
                media. Discarding edits does not delete uploads.
              </p>
              <p className="mt-2">
                {(missing ?? listingMissing(value)).length
                  ? `Before submitting, add: ${(missing ?? listingMissing(value)).join(", ")}.`
                  : "Your core details are ready. Check your facilities, inclusions and media before submitting."}
              </p>
            </div>
            <form
              id="venue-profile"
              ref={profileRef}
              onChangeCapture={markDirty}
              key={`${venue.id}-${draft?.updated_at || "live"}`}
              onSubmit={profile}
              onInvalidCapture={() => {
                if (tab === "media") setTab("listing");
              }}
              className="grid gap-5 rounded-2xl border border-sand bg-white p-5 sm:grid-cols-2 sm:p-8"
            >
              <div className={tab === "listing" ? "contents" : "hidden"}>
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
              </div>
              <fieldset
                className={`${tab === "media" ? "grid" : "hidden"} gap-5 border-t border-sand pt-6 sm:col-span-2 sm:grid-cols-2`}
              >
                <legend className="mb-4 font-serif text-2xl">
                  Photos, video & 3D walkthroughs
                </legend>
                <p className="text-sm text-ink/60 sm:col-span-2">
                  Choose JPEG, PNG or WebP photos up to 5 MB using the upload
                  buttons below. Photos become publicly accessible immediately;
                  saving a draft only saves their links. You can also paste
                  existing image links.
                </p>
                <label className="text-sm">
                  Main photograph: upload below or paste an image link
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
                  Gallery: upload below or paste links (one per line, up to 20)
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
            <div hidden={tab !== "media"}>
              <VenueTour
                management
                name={value.name}
                url={venueEmbed(value.matterport_url, "tour")}
              />
              <p className="mt-3 text-xs text-ink/60">
                This preview uses your last saved tour link.
              </p>
            </div>
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
                  {r.booking_start || r.preferred_date} to {r.booking_end || r.preferred_date} · Confirmed Styled booking · {r.name}
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
      {pending && (
        <dialog
          ref={unsavedDialogRef}
          aria-labelledby="unsaved-title"
          aria-describedby="unsaved-description"
          className="m-auto w-[calc(100%_-_3rem)] max-w-lg rounded-2xl border-0 bg-white p-0 text-ink backdrop:bg-ink/40"
          onCancel={(e) => {
            e.preventDefault();
            if (!busy) setPending(null);
          }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6">
            <h2 id="unsaved-title" className="font-serif text-2xl">
              Save your listing edits?
            </h2>
            <p id="unsaved-description" className="mt-3 text-sm">
              Save the draft before continuing, discard form edits, or stay
              here. Uploaded files remain public even if edits are discarded.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                disabled={busy}
                className="rounded-full bg-ink px-4 py-2 text-cream"
                onClick={async () => {
                  const form = dirtyFormRef.current;
                  if (!form) return;
                  if (!form.reportValidity()) {
                    setPending(null);
                    setTab("listing");
                    return;
                  }
                  const f = new FormData(form);
                  if (
                    await action({
                      ...Object.fromEntries(f),
                      features: f.getAll("features"),
                      action: form.id === "venue-profile" ? "save" : "create",
                    })
                  )
                    navigate(pending);
                }}
              >
                Save and continue
              </button>
              <button
                disabled={busy}
                className="rounded-full border border-sand px-4 py-2"
                onClick={() => {
                  dirtyFormRef.current?.reset();
                  navigate(pending);
                }}
              >
                Discard and continue
              </button>
              <button
                ref={stayButtonRef}
                disabled={busy}
                className="rounded-full border border-sand px-4 py-2"
                onClick={() => setPending(null)}
              >
                Stay
              </button>
            </div>
            {error && (
              <p role="alert" className="mt-4 text-sm">
                {error}
              </p>
            )}
          </div>
        </dialog>
      )}
      {dirty && (
        <p role="status" className="mt-4 text-sm">
          Unsaved listing edits
        </p>
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
