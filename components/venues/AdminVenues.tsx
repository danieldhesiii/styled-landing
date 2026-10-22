"use client";
import Link from "next/link";
import VenuePhotoUpload from "./VenuePhotoUpload";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { VenueListing, VenuePackage } from "@/lib/venues";
import { STYLES } from "@/lib/styles";
type AdminVenue = VenueListing & { active: boolean; updated_at?: string };
type Enquiry = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  guest_count: number | null;
  preferred_date: string | null;
  message: string | null;
  status: string;
};
const input =
  "mt-1 block w-full rounded-lg border border-sand bg-white p-3 text-sm";
export default function AdminVenues({ initialId }: { initialId?: string }) {
  const [venues, setVenues] = useState<AdminVenue[]>([]),
    [selected, setSelected] = useState(initialId || ""),
    [venue, setVenue] = useState<AdminVenue | null>(null),
    [packages, setPackages] = useState<VenuePackage[]>([]),
    [enquiries, setEnquiries] = useState<Enquiry[]>([]),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false);
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
      } else {
        setVenue(null);
        setPackages([]);
        setEnquiries([]);
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
              {v.active ? "" : " (draft)"}
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
                    package_from_pence: "Starting price (pence)",
                    hero_image: "Hero image URL",
                    video_url: "YouTube / Vimeo URL",
                    matterport_url: "Matterport URL",
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
                  <article
                    key={e.id}
                    className="mt-4 rounded-xl border border-sand p-5"
                  >
                    <h3 className="font-serif text-2xl">{e.name}</h3>
                    <a href={`mailto:${e.email}`} className="text-sm underline">
                      {e.email}
                    </a>
                    <p className="mt-2 text-sm">
                      {e.preferred_date || "Date not specified"} ·{" "}
                      {e.guest_count ?? "Unknown"} guests
                      {e.phone ? ` · ${e.phone}` : ""}
                    </p>
                    <p className="mt-3 whitespace-pre-line text-sm text-ink/70">
                      {e.message}
                    </p>
                    <label className="mt-4 block max-w-xs text-sm">
                      Status
                      <select
                        value={e.status}
                        disabled={busy}
                        onChange={(v) =>
                          void action({
                            action: "setEnquiryStatus",
                            venueId: selected,
                            id: e.id,
                            status: v.target.value,
                          })
                        }
                        className={input}
                      >
                        {["new", "contacted", "booked", "declined"].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                  </article>
                ))}
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
