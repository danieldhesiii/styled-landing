"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ENQUIRY_STATUSES } from "@/lib/venue-details";
type Request = {
  id: string;
  preferred_date: string;
  request_kind: string;
  guest_count: number;
  status: string;
  message: string | null;
  response: string | null;
  alternative_dates: string[];
  venue_listings: { name: string; slug: string } | null;
};
export default function MyVenueRequests({
  embedded = false,
  onBrowse,
}: {
  embedded?: boolean;
  onBrowse?: () => void;
}) {
  const [requests, setRequests] = useState<Request[] | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(""),
    [retry, setRetry] = useState(0);
  const load = useCallback(async () => {
    const r = await fetch("/api/venue-enquiries", { cache: "no-store" });
    const d = await r.json();
    if (!r.ok) throw Error(d.error || "Could not load requests.");
    setRequests(d.requests);
  }, []);
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load, retry]);
  async function cancel(id: string) {
    setBusy(id);
    setError("");
    try {
      const r = await fetch(`/api/venue-enquiries?id=${id}`, {
        method: "DELETE",
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not cancel.");
    } finally {
      setBusy("");
    }
  }
  return (
    <section
      className={
        embedded
          ? "rounded-2xl border border-sand bg-white p-5 sm:p-8"
          : "py-12 sm:py-16"
      }
    >
      {!embedded && (
        <Link href="/venues" className="text-sm text-clay">
          ← Explore venues
        </Link>
      )}
      {embedded ? (
        <h2 className="font-serif text-3xl">Venue requests</h2>
      ) : (
        <h1 className="mt-6 font-serif text-4xl sm:text-5xl">
          Your venue requests
        </h1>
      )}
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink/60">
        Follow venue bookings and viewings here. Supplier orders are in the
        other tab. A request does not reserve a date, and no payment is
        collected on this page.
      </p>
      {error && (
        <p
          role="alert"
          className="mt-6 rounded-lg border border-clay p-4 text-sm"
        >
          {error}
          <button
            onClick={() => {
              setError("");
              setRetry((n) => n + 1);
            }}
            className="ml-3 underline"
          >
            Try again
          </button>
        </p>
      )}
      {requests === null && !error && (
        <p role="status" className="py-10">
          Loading your requests…
        </p>
      )}
      {requests?.length === 0 && (
        <div className="mt-8 rounded-2xl bg-white p-8">
          <h2 className="font-serif text-3xl">
            Find somewhere that feels like you
          </h2>
          <p className="mt-3 text-sm text-ink/60">
            When you send a venue booking or viewing request, it will appear
            here.
          </p>
          {onBrowse ? (
            <button
              type="button"
              onClick={onBrowse}
              className="mt-5 inline-block rounded-full bg-ink px-5 py-3 text-sm text-cream"
            >
              Find venues
            </button>
          ) : (
            <Link
              href="/venues"
              className="mt-5 inline-block rounded-full bg-ink px-5 py-3 text-sm text-cream"
            >
              Find venues
            </Link>
          )}
        </div>
      )}
      {requests?.map((r) => (
        <article key={r.id} className="mt-8 border-b border-sand pb-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-clay">
                {r.request_kind === "viewing" ? "Viewing" : "Venue booking"} ·{" "}
                {r.id.slice(0, 8).toUpperCase()}
              </p>
              <h2 className="mt-2 font-serif text-3xl">
                {r.venue_listings?.name || "Your venue"}
              </h2>
              <p className="mt-3 text-sm text-ink/60">
                {r.preferred_date} · {r.guest_count} wedding guests
              </p>
            </div>
            <span className="rounded-lg bg-sand px-3 py-2 text-sm">
              {ENQUIRY_STATUSES[r.status] || r.status}
            </span>
          </div>
          {r.message && (
            <p className="mt-5 whitespace-pre-line text-sm text-ink/70">
              Your message: {r.message}
            </p>
          )}
          <div className="mt-5 rounded-xl bg-white p-5">
            <h3 className="font-medium text-sm">
              {r.response ? "Reply from the venue" : "What happens next"}
            </h3>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink/70">
              {r.response ||
                (r.status === "cancelled"
                  ? "You cancelled this request."
                  : "The venue team will check your plans and respond here. You can also contact support@styleduk.com.")}
            </p>
            {r.alternative_dates?.length > 0 && (
              <p className="mt-3 text-sm">
                Suggested dates: {r.alternative_dates.join(", ")}. Send a new
                request to discuss one of these dates; suggestions are not
                reservations.
              </p>
            )}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-5">
            {r.venue_listings && (
              <Link
                href={`/venues/${r.venue_listings.slug}#enquire`}
                className="text-sm underline"
              >
                View venue / make another request
              </Link>
            )}
            {["new", "contacted"].includes(r.status) && (
              <details>
                <summary className="cursor-pointer text-sm underline">
                  Cancel request
                </summary>
                <div className="mt-3 text-sm">
                  <p>This closes your unconfirmed request.</p>
                  <button
                    disabled={!!busy}
                    type="button"
                    onClick={() => void cancel(r.id)}
                    className="mt-3 rounded-full border border-sand px-4 py-2"
                  >
                    {busy === r.id ? "Cancelling…" : "Confirm cancellation"}
                  </button>
                </div>
              </details>
            )}
          </div>
          {r.status === "booked" && (
            <p className="mt-4 text-xs text-ink/60">
              Your venue has confirmed the booking. Agree contracts, payment and
              any changes with the venue and Styled. No online payment has been
              taken.
            </p>
          )}
        </article>
      ))}
    </section>
  );
}
