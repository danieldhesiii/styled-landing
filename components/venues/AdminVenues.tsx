"use client";
import Link from "next/link";
import VenueReviewCard from "./VenueReviewCard";
import VenueSupplierFields from "./VenueSupplierFields";
import VenueDetailsFields from "./VenueDetailsFields";
import VenueRequestCard, { type VenueRequest } from "./VenueRequestCard";
import VenueTour from "./VenueTour";
import { venueEmbed } from "@/lib/venue-input";
import VenuePhotoUpload from "./VenuePhotoUpload";
import { useCallback, useEffect, useState, useRef, type FormEvent } from "react";
import type { VenueListing, VenuePackage } from "@/lib/venues";
import { STYLES } from "@/lib/styles";
type AdminVenue = VenueListing & {
  active: boolean;
  updated_at?: string;
  review_status?: string;
  review_updated_at?:string;
};
const input =
  "mt-1 block w-full rounded-lg border border-sand bg-white p-3 text-sm";
export default function AdminVenues({ initialId }: { initialId?: string }) {
  const [filter,setFilter]=useState("review"),[search,setSearch]=useState(""),[creating,setCreating]=useState(false);
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
      payload: AdminVenue & {review_feedback?:unknown};
      status: string;
      updated_at: string;
    } | null>(null),
    [members, setMembers] = useState<{ user_id: string;email?:string }[]>([]),
    [blocks, setBlocks] = useState<{ day: string; note: string | null }[]>([]);
  const loadSequence=useRef(0);
  const load = useCallback(async () => {
    const sequence=++loadSequence.current;
    try {
      const list = await fetch("/api/admin/venues").then((r) => r.json());
      if(sequence!==loadSequence.current)return;
      if (list.error) throw Error(list.error);
      setVenues(list.venues);
      if (selected) {
        const d = await fetch(`/api/admin/venues?id=${selected}`).then((r) =>
          r.json(),
        );
        if(sequence!==loadSequence.current)return;
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
      if(sequence!==loadSequence.current)return;
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
      setNotice(body.action==="requestChanges"?"Feedback saved. The venue team can see the changes requested.":body.action==="approveDraft"?"Venue listing approved and published.":"Saved.");
      if(body.action==="saveVenue")setCreating(false);
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
      <h1 className="font-serif text-4xl">Venue review inbox</h1>
      <p className="mt-2 text-sm text-ink/60">
        Review new listings and changes here. Booking and viewing enquiries stay with each venue.
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
      <div className="mt-7 flex flex-wrap items-center gap-3">{[["review",`Awaiting review (${venues.filter(v=>v.review_status==="submitted").length})`],["changes","Changes requested"],["all","All venues"]].map(([id,label])=><button key={id} type="button" aria-pressed={filter===id} onClick={()=>setFilter(id)} className={`min-h-11 rounded-full px-4 py-3 text-sm ${filter===id?"bg-ink text-cream":"border border-sand"}`}>{label}</button>)}<button type="button" onClick={()=>{setCreating(true);setSelected("");}} className="ml-auto min-h-11 text-sm underline">+ Create a venue</button></div>
      <label className="mt-5 block text-sm"><span className="sr-only">Find a venue</span><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search venue names or locations" className="min-h-11 w-full rounded-xl border border-sand bg-white px-4"/></label>
      {loaded&&<div className="my-6 divide-y divide-sand">{venues.filter(v=>(filter==="all"||filter==="review"&&v.review_status==="submitted"||filter==="changes"&&v.review_status==="changes_requested")&&`${v.name} ${v.location}`.toLowerCase().includes(search.toLowerCase())).map(v=><button key={v.id} type="button" onClick={()=>{setCreating(false);if(selected!==v.id)setLoaded(false);setSelected(v.id);}} className={`flex min-h-16 w-full flex-wrap items-center justify-between gap-3 py-4 text-left ${selected===v.id?"text-clay":""}`}><span><span className="block text-sm font-medium">{v.name}</span><span className="mt-1 block text-sm text-ink/60">{v.location} · {v.review_status==="submitted"?"Awaiting review":v.review_status==="changes_requested"?"Changes requested":v.active?"Published":"Draft"}</span></span><span className="text-sm underline">{v.review_status==="submitted"?"Review listing":"Manage venue"} →</span></button>)}{!venues.some(v=>(filter==="all"||filter==="review"&&v.review_status==="submitted"||filter==="changes"&&v.review_status==="changes_requested")&&`${v.name} ${v.location}`.toLowerCase().includes(search.toLowerCase()))&&<p className="rounded-xl bg-sand/25 p-5 text-sm text-ink/65">{search?"No venues match your search.":filter==="review"?"No listings awaiting review. New submissions will appear here.":"No venues in this view."}</p>}</div>}
      {!loaded ? (
        <p>Loading venues…</p>
      ) : selected||creating ? (
        <>
          {selected&&draft&&<VenueReviewCard key={draft.updated_at} draft={draft} busy={busy} onApprove={()=>void action({action:"approveDraft",venueId:selected,updatedAt:draft.updated_at})} onChanges={message=>void action({action:"requestChanges",venueId:selected,updatedAt:draft.updated_at,message})}/>}
          <details open={creating} className="mb-7 rounded-xl border border-sand p-5"><summary className="min-h-11 cursor-pointer py-3 font-medium">{creating?"New venue details":"Edit published listing"}</summary>
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
            <VenueSupplierFields initial={venue?.details?.supplier_policy} staff isNew={!venue} />
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
          </details>
          {selected && (
            <>
              <details className="mt-5 rounded-xl border border-sand p-5">
                <summary className="min-h-11 cursor-pointer py-3 font-serif text-2xl">Venue team access</summary>
                <p className="mt-2 text-sm text-ink/60">
                  Link an existing verified Styled account. The team can manage
                  only this venue through /venue-portal.
                </p>
                <ul className="mt-4 space-y-3">
                  {members.map((m) => (
                    <li
                      key={m.user_id}
                      className="flex flex-wrap items-center justify-between gap-3 text-sm"
                    >
                      <span className="break-all">{m.email||`Account ${m.user_id.slice(0,8)}`}</span>
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
                    name="email"
                    type="email"
                    required
                    placeholder="Existing team member’s email"
                    aria-label="Existing team member’s email"
                    className="min-w-0 flex-1 rounded-lg border border-sand p-3 text-sm"
                  />
                  <button
                    disabled={busy}
                    className="rounded-full border border-sand px-4 py-2 text-sm"
                  >
                    Add team member
                  </button>
                </form>
              </details>
              <details className="mt-5 rounded-xl border border-sand p-5">
                <summary className="min-h-11 cursor-pointer py-3 font-serif text-2xl">Calendar and blocked dates</summary>
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
              </details>
              <details className="mt-5 rounded-xl border border-sand p-5"><summary className="min-h-11 cursor-pointer py-3 font-serif text-2xl">Venue photographs</summary>
              <VenuePhotoUpload
                venueId={selected}
                onUploaded={() => void load()}
              />
              </details>
              <details className="mt-5 rounded-xl border border-sand p-5">
                <summary className="min-h-11 cursor-pointer py-3 font-serif text-2xl">Styling packages</summary>
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
              </details>
              <details className="mt-5 rounded-xl border border-sand p-5">
                <summary className="min-h-11 cursor-pointer py-3 font-serif text-2xl">Booking and viewing enquiries ({enquiries.length})</summary>
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
              </details>
            </>
          )}
        </>
      ) : null}
    </div>
  );
}
