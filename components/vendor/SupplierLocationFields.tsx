"use client";
import { useEffect, useState } from "react";

const empty = { postcode: "", radius_miles: "", nationwide: false };
export default function SupplierLocationFields() {
  const [value, setValue] = useState(empty);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function load() {
    setError("");
    try {
      const response = await fetch("/api/vendor/location", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || "Could not load location.");
      setValue(data.location ? { postcode: data.location.postcode, radius_miles: data.location.radius_miles == null ? "" : String(data.location.radius_miles), nationwide: data.location.nationwide } : empty);
      setLoaded(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load location."); }
  }
  useEffect(() => { void load(); }, []);
  async function save(action: "save" | "clear") {
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/vendor/location", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...value, confirmed }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || "Could not save location.");
      if (action === "clear") setValue(empty);
      setConfirmed(false);
      setNotice(action === "clear" ? "Private location removed. Your public service area stays on your profile." : "Location saved for distance matching. Your full postcode stays private.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save location."); }
    finally { setBusy(false); }
  }
  const field = "mt-2 min-h-11 w-full rounded-xl border border-sand bg-white px-3 py-2.5 text-base";
  return <section className="mt-8 max-w-3xl border-t border-sand pt-6" aria-labelledby="supplier-location-title">
    <h2 id="supplier-location-title" className="font-serif text-2xl">Location for nearby searches</h2>
    <p className="mt-3 text-sm text-ink/65">Add your business postcode for nearby searches. Your full postcode stays private. Lookup uses postcodes.io.</p>
    {!loaded ? <><p role={error ? "alert" : "status"} className="mt-3 text-sm">{error || "Loading location…"}</p>{error && <button type="button" onClick={() => void load()} className="min-h-11 underline">Retry location</button>}</> :
      <form className="mt-5" onSubmit={e => { e.preventDefault(); void save("save"); }}>
        <fieldset disabled={busy} className="space-y-4">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="text-sm">Business postcode (private)<input required maxLength={10} autoComplete="postal-code" className={field} value={value.postcode} onChange={e => { setValue({ ...value, postcode: e.target.value.toUpperCase() }); setConfirmed(false); setNotice(""); }} placeholder="For example, SW1A 1AA" /></label>
            <label className="text-sm">Delivery radius in miles (optional)<input inputMode="numeric" maxLength={3} className={field} value={value.radius_miles} onChange={e => { setValue({ ...value, radius_miles: e.target.value }); setConfirmed(false); setNotice(""); }} placeholder="0–500; blank means unconfirmed" /></label>
          </div>
          <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={value.nationwide} onChange={e => { setValue({ ...value, nationwide: e.target.checked }); setConfirmed(false); setNotice(""); }} />We deliver nationwide</label>
          <label className="flex min-h-11 items-center gap-2 text-sm"><input required type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />I confirm this business base and delivery area are correct.</label>
          <p className="text-sm text-ink/60">Approximate distance only. Confirm delivery for each request.</p>
          <div className="flex flex-wrap gap-4"><button disabled={!confirmed || busy} className="min-h-11 rounded-full bg-ink px-6 py-3 text-sm text-cream disabled:opacity-50">{busy ? "Saving…" : "Save private location"}</button><button type="button" disabled={busy} onClick={() => void save("clear")} className="min-h-11 text-sm underline">Remove private location</button></div>
        </fieldset>
        {error && <p role="alert" className="mt-3 text-sm">{error}</p>}
        {notice && <p role="status" className="mt-3 text-sm">{notice}</p>}
      </form>}
  </section>;
}
