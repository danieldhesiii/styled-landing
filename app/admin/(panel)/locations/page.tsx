"use client";
import { useEffect, useState } from "react";
interface Listing {
  id: string;
  name: string;
}
interface Entry {
  entity_type: string;
  entity_id: string;
  postcode: string;
  radius_miles: number | null;
  nationwide: boolean;
}
export default function LocationsPage() {
  const [suppliers, setSuppliers] = useState<Listing[]>([]),
    [venues, setVenues] = useState<Listing[]>([]),
    [entries, setEntries] = useState<Entry[]>([]),
    [kind, setKind] = useState("supplier"),
    [id, setId] = useState(""),
    [postcode, setPostcode] = useState(""),
    [radius, setRadius] = useState(""),
    [nationwide, setNationwide] = useState(false),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function load() {
    try {
      const r = await fetch("/api/admin/locations", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || "Could not load locations.");
      setSuppliers(d.suppliers);
      setVenues(d.venues);
      setEntries(d.locations);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not load.");
    }
  }
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    const e = entries.find((e) => e.entity_id === id && e.entity_type === kind);
    setPostcode(e?.postcode || "");
    setRadius(e?.radius_miles == null ? "" : String(e.radius_miles));
    setNationwide(e?.nationwide || false);
    setConfirmed(false);
  }, [id, kind, entries]);
  async function save(action: string) {
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch("/api/admin/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          entity_type: kind,
          entity_id: id,
          postcode,
          radius_miles: radius,
          nationwide,
          confirmed,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setMessage(
        action === "clear" ? "Location cleared." : "Confirmed location saved.",
      );
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }
  const field =
    "mt-2 block w-full rounded-xl border border-sand bg-white px-3 py-2.5 text-sm";
  return (
    <div className="max-w-3xl">
      <h1 className="font-serif text-4xl">Locations & delivery</h1>
      <p className="mt-4 text-sm leading-relaxed text-ink/60">
        Add only details confirmed with the business. Supplier base postcodes
        stay private; couples see rounded distances and stated delivery
        coverage. A delivery radius does not confirm fees, access or a delivery
        slot.
      </p>
      <form
        className="mt-8 space-y-5 rounded-2xl border border-sand bg-white p-6"
        onSubmit={(e) => {
          e.preventDefault();
          void save("save");
        }}
      >
        <label className="block text-sm">
          Listing type
          <select
            value={kind}
            onChange={(e) => {
              setKind(e.target.value);
              setId("");
            }}
            className={field}
          >
            <option value="supplier">Supplier</option>
            <option value="venue">Venue</option>
          </select>
        </label>
        <label className="block text-sm">
          Listing
          <select
            value={id}
            onChange={(e) => setId(e.target.value)}
            required
            className={field}
          >
            <option value="">Choose a listing</option>
            {(kind === "supplier" ? suppliers : venues).map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          {kind === "supplier"
            ? "Business base postcode (staff only)"
            : "Venue postcode"}
          <input
            maxLength={10}
            required
            value={postcode}
            onChange={(e) => setPostcode(e.target.value.toUpperCase())}
            className={field}
          />
        </label>
        {kind === "supplier" && (
          <>
            <label className="block text-sm">
              Confirmed delivery radius (miles)
              <input
                type="number"
                min={0}
                max={500}
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                className={field}
              />
              <span className="mt-2 block text-xs text-ink/50">
                Leave blank if delivery coverage is not yet known.
              </span>
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={nationwide}
                onChange={(e) => setNationwide(e.target.checked)}
              />
              Delivers nationwide
            </label>
          </>
        )}
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            required
          />
          These details have been confirmed with the business
        </label>
        <div className="flex flex-wrap gap-4">
          <button
            disabled={busy || !id}
            className="rounded-full bg-ink px-5 py-3 text-sm text-cream disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save location"}
          </button>
          <button
            type="button"
            disabled={busy || !id}
            onClick={() => void save("clear")}
            className="text-sm underline disabled:opacity-50"
          >
            Clear saved location
          </button>
        </div>
        <p role="status" className="text-sm">
          {message}
        </p>
      </form>
    </div>
  );
}
