"use client";
import { useState, type FormEvent } from "react";
export default function VenuePartnerForm() {
  const [path, setPath] = useState("new");
  const [busy, setBusy] = useState(false),
    [done, setDone] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/vendor-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          category: "venue",
          message: `Capacity: ${data.capacity}\n${data.message || ""}`,
        }),
      });
      const result = await r.json();
      if (!r.ok) throw Error(result.error);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send application.");
    } finally {
      setBusy(false);
    }
  }
  if (done)
    return (
      <p role="status" className="mt-8 rounded-xl bg-blush p-6">
        Thank you. We’ve received your venue application and will be in touch.
      </p>
    );
  return (
    <div className="mt-8">
      <label className="text-sm">How can we help?<select value={path} onChange={(e) => setPath(e.target.value)} className="mt-2 block w-full rounded-lg border border-sand bg-white p-3">
        <option value="new">New venue partnership</option><option value="existing">Already listed — help with access</option>
      </select></label>
      {path === "existing" ? <p className="mt-5 text-sm">Avoid a duplicate application. <a className="underline" href="mailto:support@styleduk.com?subject=Existing%20venue%20listing%20access">Contact support@styleduk.com</a> with your venue name and work email so Styled can verify access.</p> : <form onSubmit={submit} className="mt-10 grid gap-5 sm:grid-cols-2">
      {[
        ["businessName", "Venue name", "text"],
        ["contactName", "Contact name", "text"],
        ["email", "Email", "email"],
        ["phone", "Phone (optional)", "tel"],
        ["area", "County", "text"],
        ["website", "Website", "url"],
        ["capacity", "Maximum guests", "number"],
      ].map(([key, label, type]) => (
        <label key={key} className="text-sm">
          {label}
          <input
            name={key}
            type={type}
            required={key !== "phone"}
            min={1}
            maxLength={key === "email" ? 160 : 120}
            className="mt-2 block w-full rounded-lg border border-sand bg-white p-3"
          />
        </label>
      ))}
      <label className="text-sm sm:col-span-2">
        Tell us about your venue
        <textarea
          name="message"
          rows={4}
          maxLength={1800}
          className="mt-2 block w-full rounded-lg border border-sand bg-white p-3"
        />
      </label>
      <input
        name="company"
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />
      {error && (
        <p role="alert" className="sm:col-span-2">
          {error}
        </p>
      )}
      <button
        disabled={busy}
        className="rounded-full bg-ink px-6 py-3 text-cream disabled:opacity-50"
      >
        {busy ? "Sending…" : "Apply to partner with Styled"}
      </button>
    </form>}
    </div>
  );
}
