"use client";
import { useState, type FormEvent } from "react";
import VenueCalendar from "./VenueCalendar";
import type { VenuePackage } from "@/lib/venues";
export default function VenueEnquiryForm({
  venueId,
  slug,
  packages,
}: {
  venueId: string;
  slug: string;
  packages: VenuePackage[];
}) {
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false),
    [sent, setSent] = useState(false),
    [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/venue-enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fields, venueId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Please try again.");
      setSent(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to send your enquiry. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (sent)
    return (
      <p role="status" className="rounded-xl bg-blush p-6">
        Thank you. Your enquiry is with us. We’ll confirm availability and the
        next steps by email.
      </p>
    );
  const input = "mt-2 block w-full rounded-lg border border-sand bg-cream p-3";
  return (
    <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
      <label>
        Your name
        <input
          name="name"
          autoComplete="name"
          required
          maxLength={200}
          className={input}
        />
      </label>
      <label>
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={320}
          className={input}
        />
      </label>
      <div className="sm:col-span-2">
        <VenueCalendar slug={slug} value={date} onChange={setDate} />
      </div>
      <label>
        Preferred date
        <input
          name="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className={input}
        />
      </label>
      <label>
        Number of guests
        <input
          name="guests"
          type="number"
          min="1"
          max="10000"
          required
          className={input}
        />
      </label>
      <label>
        Phone (optional)
        <input
          name="phone"
          type="tel"
          autoComplete="tel"
          maxLength={40}
          className={input}
        />
      </label>
      <label>
        Styling package
        <select name="packageId" className={input}>
          <option value="">I’m still deciding</option>
          {packages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label className="sm:col-span-2">
        Tell us about your plans (optional)
        <textarea name="message" maxLength={5000} rows={4} className={input} />
      </label>
      <label className="hidden" aria-hidden="true">
        Company
        <input name="company" tabIndex={-1} autoComplete="off" />
      </label>
      <p className="text-sm text-ink/60 sm:col-span-2">
        This is an enquiry. Your date and styling package are confirmed
        separately. No payment is taken here.
      </p>
      {error && (
        <p role="alert" className="text-sm text-ink sm:col-span-2">
          {error}
        </p>
      )}
      <button
        disabled={busy}
        className="rounded-full bg-ink px-6 py-3 text-cream disabled:opacity-50"
      >
        {busy ? "Sending…" : "Enquire about your date"}
      </button>
    </form>
  );
}
