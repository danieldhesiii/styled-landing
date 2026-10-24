"use client";
import { hireDateError } from "@/lib/booking-dates";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import VenueCalendar from "./VenueCalendar";
import type { VenuePackage } from "@/lib/venues";
export default function VenueEnquiryForm({
  venueId,
  slug,
  packages,
  accountEmail,
  initialKind = "booking",
  initialDate = "",
  initialGuests,
}: {
  venueId: string;
  slug: string;
  packages: VenuePackage[];
  accountEmail?: string;
  initialKind?: string;
  initialDate?: string;
  initialGuests?: number;
}) {
  const [weddingDate, setWeddingDate] = useState(initialKind === "viewing" ? "" : initialDate);
  const [viewingDate, setViewingDate] = useState(initialKind === "viewing" ? initialDate : "");
  const [extendedHire, setExtendedHire] = useState(false);
  const [bookingStart, setBookingStart] = useState(initialDate);
  const [bookingEnd, setBookingEnd] = useState(initialDate);
  const [kind, setKind] = useState(initialKind);
  const date = kind === "viewing" ? viewingDate : weddingDate;
  const setDate = kind === "viewing" ? setViewingDate : setWeddingDate;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [busy, setBusy] = useState(false),
    [sent, setSent] = useState(false),
    [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    if (kind === "booking" && extendedHire) {
      const issue = hireDateError(bookingStart, bookingEnd, today);
      if (issue) return setError(issue);
      if (bookingStart > weddingDate || bookingEnd < weddingDate)
        return setError("Your venue hire period must include the wedding date.");
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/venue-enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fields, venueId, ...(kind === "booking" ? { bookingStart: extendedHire ? bookingStart : weddingDate, bookingEnd: extendedHire ? bookingEnd : weddingDate } : {}) }),
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
  if (!accountEmail)
    return (
      <div className="rounded-2xl bg-white p-6 sm:p-8">
        <h3 className="font-serif text-2xl">
          Keep your venue conversations together
        </h3>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink/60">
          Create an account or sign in to send a request, receive the venue’s
          reply and keep track of your plans.
        </p>
        <Link
          href={`/login?next=${encodeURIComponent(`/venues/${slug}?request=${kind}${initialDate ? `&date=${initialDate}` : ""}${initialGuests ? `&guests=${initialGuests}` : ""}#enquire`)}`}
          className="mt-5 inline-block rounded-full bg-ink px-5 py-3 text-sm text-cream"
        >
          Sign in or create account
        </Link>
      </div>
    );
  if (sent)
    return (
      <p role="status" className="rounded-xl bg-blush p-6">
        Thank you. Your request is with the venue. The date is not reserved yet.{" "}
        <Link
          href="/design?tab=orders&bookings=venues"
          className="ml-2 underline"
        >
          View my venue requests →
        </Link>
      </p>
    );
  const input = "mt-2 block w-full rounded-lg border border-sand bg-cream p-3";
  return (
    <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
      <label className="sm:col-span-2">
        What would you like to do?
        <select
          name="requestKind"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className={input}
        >
          <option value="booking">Request a venue booking</option>
          <option value="viewing">Arrange a venue viewing</option>
        </select>
      </label>
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
          value={accountEmail}
          readOnly
          type="email"
          autoComplete="email"
          required
          maxLength={320}
          className={input}
        />
      </label>
      {kind === "booking" && <div className="sm:col-span-2">
        <VenueCalendar slug={slug} value={date} onChange={setDate} rangeStart={extendedHire ? bookingStart : date} rangeEnd={extendedHire ? bookingEnd : date} />
      </div>}
      {kind === "viewing" && <label>Preferred viewing time (optional, UK local time)
        <input name="viewingTime" type="time" className={input} />
        <span className="mt-2 block text-sm text-ink/60">The venue will agree an appointment with you. A viewing never reserves a wedding date.</span>
      </label>}
      <label>
        {kind === "viewing"
          ? "Preferred viewing date"
          : "Preferred wedding date"}
        <input
          name="date"
          type="date"
          min={today}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className={input}
        />
      </label>
      {kind === "booking" && <fieldset className="min-w-0 rounded-xl border border-sand p-4 sm:col-span-2">
        <legend className="px-1 font-medium">Venue hire period</legend>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" checked={extendedHire} onChange={e => {
            setExtendedHire(e.target.checked);
            if (e.target.checked) { setBookingStart(weddingDate); setBookingEnd(weddingDate); }
          }} className="h-4 w-4 accent-clay" />
          I need the venue for extra days
        </label>
        {extendedHire && <div className="mt-3 grid min-w-0 gap-4 sm:grid-cols-2">
          <label>Access from (including setup)
            <input name="bookingStart" type="date" min={today} max={weddingDate || undefined}
              value={bookingStart} onChange={e => setBookingStart(e.target.value)} required className={input + " min-w-0"} />
          </label>
          <label>Access until (including pack-down)
            <input name="bookingEnd" type="date" min={weddingDate || today}
              value={bookingEnd} onChange={e => setBookingEnd(e.target.value)} required className={input + " min-w-0"} />
          </label>
        </div>}
        <p className="mt-3 text-sm leading-relaxed text-ink/60">{extendedHire
          ? "Request every day you need, including setup and pack-down. The venue will confirm access times, availability and the price for the whole period."
          : "Your request covers the wedding day only. Select extra days if you need earlier setup, a multi-day celebration or later pack-down."}</p>
      </fieldset>}
      <label>
        Expected wedding guests
        <input
          name="guests"
          defaultValue={initialGuests ?? ""}
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
        {busy
          ? "Sending…"
          : kind === "viewing"
            ? "Send viewing request"
            : "Send booking request"}
      </button>
    </form>
  );
}
