"use client";
import Link from "next/link";
import VenueDetailsFields from "./VenueDetailsFields";
import VenueRequestCard, { type VenueRequest } from "./VenueRequestCard";
import VenueTour from "./VenueTour";
import { venueEmbed } from "@/lib/venue-input";
import VenuePhotoUpload from "./VenuePhotoUpload";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { VenueListing, VenuePackage } from "@/lib/venues";
import { STYLES } from "@/lib/styles";
type AdminVenue = VenueListing & {
  active: boolean;
  updated_at?: string;
  review_status?: string;
};
const input =
  "mt-1 block w-full rounded-lg border border-sand bg-white p-3 text-sm";
export default function AdminVenues({ initialId }: { initialId?: string }) {
  const [venues, setVenues] = useState<AdminVenue[]>([]),
    [selected, setSelected] = useState(initialId || ""),
    [venue, setVenue] = useState<AdminVenue | null>(null),
    [packages, setPackages] = useState<VenuePackage[]>([]),
    [enquiries, setEnquiries] = useState<VenueRequest[]>([]),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState<{
      payload: AdminVenue;
      status: string;
      updated_at: string;
    } | null>(null),
    [members, setMembers] = useState<{ user_id: string }[]>([]),
    [blocks, setBlocks] = useState<{ day: string; note: string | null }[]>([]);
  const load = useCallback(async () => {
    try {
      const list = await fetch("/api/admin/venues").then((r) => r.json());
      if (list.error) throw Error(list.error);
      setVenues(list.venues);
      if (selected) {
        const d = await fetch(`/api/admin/venues?id=${selected}`).then((r) =>
          r.json(),
        );
        if (d.error) throw Error(d.error);
        setVenue(d.venue);
        setPackages(d.packages);
        setEnquiries(d.enquiries);
        setDraft(d.draft);
        setMembers(d.members || []);
        setBlocks(d.blocks || []);
      } else {
        setVenue(null);
        setPackages([]);
        setEnquiries([]);
        setDraft(null);
        setMembers([]);
        setBlocks([]);
      }
      setLoaded(true);
    } catch (e) {
      setError(String(e));
    }
  }, [selected]);
  useEffect(() => {
    void load();
  }, [load]);
  async function action(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await fetch("/api/admin/venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || "Could not save.");
      setNotice("Saved.");
      if (body.action === "saveVenue" && d.id !== selected) setSelected(d.id);
      else await load();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function saveVenue(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await action({
      ...Object.fromEntries(f),
      id: selected || undefined,
      action: "saveVenue",
      active: f.get("active") === "on",
      features: f.getAll("features"),
    });
  }
  async function savePackage(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (
      await action({
        ...Object.fromEntries(new FormData(form)),
        action: "savePackage",
        venueId: selected,
      })
    )
      form.reset();
  }
  return (
    <div>
      <h1 className="font-serif text-4xl">Venues</h1>
      <p className="mt-2 text-sm text-ink/60">
        Publish spaces, manage styling packages and respond to date enquiries.
      </p>
      {error && (
        <p role="alert" className="my-4 rounded-lg border border-clay p-4">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="my-4 text-sm">
          {notice}
        </p>
      )}
      <label className="my-6 block max-w-md text-sm">
        Choose a venue
        <select
          value={selected}
          onChange={(e) => {
            setLoaded(false);
            setSelected(e.target.value);
          }}
          className={input}
        >
          <option value="">Create a new venue</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
              {v.review_status === "submitted"
                ? " (review requested)"
                : v.active
                  ? ""
                  : " (draft)"}
            </option>
          ))}
        </select>
      </label>
      {!loaded ? (
        <p>Loading venues…</p>
      ) : (
        <>
          <form
            key={`${selected}-${venue?.updated_at || "new"}`}
            onSubmit={saveVenue}
            className="grid gap-4 rounded-xl border border-sand p-6 sm:grid-cols-2"
          >
            {(
              [
                "name",
                "slug",
                "location",
                "county",
                "capacity_min",
                "capacity_max",
                "package_from_pence",
                "hero_image",
                "video_url",
                "matterport_url",
                "map_embed_url",
              ] as const
            ).map((key) => (
              <label key={key} className="text-sm">
                {
                  {
                    name: "Venue name",
                    slug: "URL slug",
                    location: "Town / location",
                    county: "County",
                    capacity_min: "Minimum guests",
                    capacity_max: "Maximum guests",
                    package_from_pence:
                      "Styling from (pence, separate from venue hire)",
                    hero_image: "Hero image URL",
                    video_url: "YouTube / Vimeo URL",
                    matterport_url: "360° / 3D tour URL (Matterport or Kuula)",
                    map_embed_url: "Google Maps embed URL",
                  }[key]
                }
                <input
                  name={key}
                  defaultValue={String(venue?.[key] ?? "")}
                  required={["name", "slug", "location", "county"].includes(
                    key,
                  )}
                  type={
                    key.startsWith("capacity") || key === "package_from_pence"
                      ? "number"
                      : "text"
                  }
                  min="0"
                  className={input}
                />
              </label>
            ))}
            <label className="text-sm">
              Setting
              <select
                name="indoor_outdoor"
                defaultValue={venue?.indoor_outdoor || ""}
                className={input}
              >
                <option value="">Not specified</option>
                <option value="indoor">Indoor</option>
                <option value="outdoor">Outdoor</option>
                <option value="both">Both</option>
              </select>
            </label>
            <label className="text-sm sm:col-span-2">
              Description
              <textarea
                name="description"
                rows={4}
                defaultValue={venue?.description || ""}
                className={input}
              />
            </label>
            <label className="text-sm sm:col-span-2">
              Gallery URLs (one per line)
              <textarea
                name="gallery_images"
                rows={4}
                defaultValue={venue?.gallery_images.join("\n") || ""}
                className={input}
              />
            </label>
            <VenueDetailsFields details={venue?.details} />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="active"
                defaultChecked={venue?.active}
              />
              Published on the website
            </label>
            <button
              disabled={busy}
              className="rounded-full bg-ink px-5 py-3 text-cream disabled:opacity-50"
            >
              Save venue
            </button>
            {venue && (
              <Link
                href={`/venues/${venue.slug}`}
                className="text-sm underline"
              >
                View public page (published venues only)
              </Link>
            )}
          </form>
          {selected && (
            <>
              {draft && (
                <section className="mt-8 rounded-xl bg-blush p-6">
                  <h2 className="font-serif text-3xl">
                    Venue team’s{" "}
                    {draft.status === "submitted"
                      ? "submitted listing"
                      : "draft"}
                  </h2>
                  <p className="mt-3 text-sm">
                    Review these proposed public details before publishing. The
                    live page has not changed.
                  </p>
                  <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                    {Object.entries(draft.payload)
                      .filter(([k]) => k !== "active")
                      .map(([k, v]) => (
                        <div key={k} className="min-w-0">
                          <dt className="text-xs font-medium uppercase tracking-wide text-clay">
                            {k.replace(/_/g, " ")}
                          </dt>
                          <dd className="mt-2 whitespace-pre-wrap break-words text-sm">
                            {v !== null && typeof v === "object"
                              ? JSON.stringify(v, null, 2)
                              : String(v ?? "Not supplied")}
                          </dd>
                        </div>
                      ))}
                  </dl>
                  {draft.payload.hero_image && (
                    <img
                      src={draft.payload.hero_image}
                      alt="Proposed main venue photograph"
                      className="mt-5 aspect-video w-full max-w-md rounded-xl object-cover"
                    />
                  )}
                  <VenueTour
                    management
                    name={draft.payload.name}
                    url={venueEmbed(draft.payload.matterport_url, "tour")}
                  />
                  {draft.status === "submitted" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void action({
                          action: "approveDraft",
                          venueId: selected,
                        })
                      }
                      className="mt-6 rounded-full bg-ink px-5 py-3 text-sm text-cream"
                    >
                      Approve & publish submitted listing
                    </button>
                  )}
                </section>
              )}
              <section className="mt-8 rounded-xl border border-sand p-6">
                <h2 className="font-serif text-2xl">Venue team access</h2>
                <p className="mt-2 text-sm text-ink/60">
                  Link an existing verified Styled account. The team can manage
                  only this venue through /venue-portal.
                </p>
                <ul className="mt-4 space-y-3">
                  {members.map((m) => (
                    <li
                      key={m.user_id}
                      className="flex flex-wrap items-center justify-between gap-3 text-xs"
                    >
                      <span className="break-all">{m.user_id}</span>
                      <button
                        type="button"
                        disabled={busy}
                        className="underline"
                        onClick={() =>
                          void action({
                            action: "removeMember",
                            venueId: selected,
                            userId: m.user_id,
                          })
                        }
                      >
                        Remove access
                      </button>
                    </li>
                  ))}
                </ul>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    if (
                      await action({
                        action: "addMember",
                        venueId: selected,
                        ...Object.fromEntries(new FormData(form)),
                      })
                    )
                      form.reset();
                  }}
                  className="mt-5 flex flex-wrap gap-3"
                >
                  <input
                    name="userId"
                    required
                    placeholder="Existing account user ID"
                    aria-label="Existing account user ID"
                    className="min-w-0 flex-1 rounded-lg border border-sand p-3 text-sm"
                  />
                  <button
                    disabled={busy}
                    className="rounded-full border border-sand px-4 py-2 text-sm"
                  >
                    Add team member
                  </button>
                </form>
              </section>
              <section className="mt-8 rounded-xl border border-sand p-6">
                <h2 className="font-serif text-2xl">Unavailable dates</h2>
                <p className="mt-2 text-sm text-ink/60">
                  Block dates booked outside Styled. Confirmed Styled bookings
                  are blocked automatically.
                </p>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    if (
                      await action({
                        ...Object.fromEntries(new FormData(form)),
                        action: "block",
                        venueId: selected,
                        block: true,
                      })
                    )
                      form.reset();
                  }}
                  className="mt-4 flex flex-wrap gap-3"
                >
                  <input
                    type="date"
                    name="day"
                    required
                    aria-label="Date to block"
                    className="rounded-lg border border-sand p-3"
                  />
                  <input
                    name="note"
                    maxLength={300}
                    placeholder="Private note"
                    aria-label="Private blocked date note"
                    className="min-w-0 flex-1 rounded-lg border border-sand p-3"
                  />
                  <button
                    disabled={busy}
                    className="rounded-full border border-sand px-4 py-2 text-sm"
                  >
                    Block date
                  </button>
                </form>
                {blocks.map((b) => (
                  <div
                    key={b.day}
                    className="mt-4 flex flex-wrap justify-between gap-3 text-sm"
                  >
                    <span>
                      {b.day} · {b.note || "Unavailable"}
                    </span>
                    <button
                      disabled={busy}
                      type="button"
                      className="underline"
                      onClick={() =>
                        void action({
                          action: "block",
                          venueId: selected,
                          day: b.day,
                          block: false,
                        })
                      }
                    >
                      Unblock
                    </button>
                  </div>
                ))}
              </section>
              <VenuePhotoUpload
                venueId={selected}
                onUploaded={() => void load()}
              />
              <section className="mt-12">
                <h2 className="font-serif text-3xl">Styling packages</h2>
                <p className="mt-2 text-sm text-ink/60">
                  Prices are stored in pence: £1,000 = 100000.
                </p>
                {packages.map((p) => (
                  <form
                    key={p.id}
                    onSubmit={savePackage}
                    className="mt-4 grid gap-3 rounded-xl border border-sand p-4 sm:grid-cols-2"
                  >
                    <input type="hidden" name="id" value={p.id} />
                    <label className="text-sm">
                      Name
                      <input
                        name="name"
                        required
                        defaultValue={p.name}
                        className={input}
                      />
                    </label>
                    <label className="text-sm">
                      Style
                      <select
                        name="style_id"
                        defaultValue={p.style_id}
                        className={input}
                      >
                        {STYLES.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm">
                      Price (pence)
                      <input
                        name="price_from_pence"
                        required
                        type="number"
                        min="0"
                        defaultValue={p.price_from_pence}
                        className={input}
                      />
                    </label>
                    <label className="text-sm">
                      Sort order
                      <input
                        name="sort_order"
                        type="number"
                        defaultValue={p.sort_order}
                        className={input}
                      />
                    </label>
                    <label className="text-sm sm:col-span-2">
                      Description
                      <textarea
                        name="description"
                        defaultValue={p.description || ""}
                        className={input}
                      />
                    </label>
                    <button
                      disabled={busy}
                      className="rounded-full border border-sand p-3"
                    >
                      Save package
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm("Delete this styling package?"))
                          void action({
                            action: "deletePackage",
                            id: p.id,
                            venueId: selected,
                          });
                      }}
                      className="text-sm underline"
                    >
                      Delete package
                    </button>
                  </form>
                ))}
                <form
                  onSubmit={savePackage}
                  className="mt-6 grid gap-3 rounded-xl bg-blush p-5 sm:grid-cols-2"
                >
                  <h3 className="font-serif text-2xl sm:col-span-2">
                    Add a package
                  </h3>
                  <label className="text-sm">
                    Name
                    <input name="name" required className={input} />
                  </label>
                  <label className="text-sm">
                    Style
                    <select name="style_id" className={input}>
                      {STYLES.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm">
                    Price (pence)
                    <input
                      name="price_from_pence"
                      required
                      type="number"
                      min="0"
                      className={input}
                    />
                  </label>
                  <label className="text-sm">
                    Sort order
                    <input
                      name="sort_order"
                      type="number"
                      defaultValue="0"
                      className={input}
                    />
                  </label>
                  <label className="text-sm sm:col-span-2">
                    Description
                    <textarea name="description" className={input} />
                  </label>
                  <button
                    disabled={busy}
                    className="rounded-full bg-ink p-3 text-cream"
                  >
                    Add package
                  </button>
                </form>
              </section>
              <section className="mt-12">
                <h2 className="font-serif text-3xl">Enquiries</h2>
                {!enquiries.length && (
                  <p className="mt-4 text-sm text-ink/60">
                    No enquiries for this venue yet.
                  </p>
                )}
                {enquiries.map((e) => (
                  <VenueRequestCard
                    showThread={false}
                    key={e.id}
                    request={e}
                    busy={busy}
                    onRespond={(value) =>
                      void action({
                        ...value,
                        action: "setEnquiryStatus",
                        venueId: selected,
                      })
                    }
                  />
                ))}
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
