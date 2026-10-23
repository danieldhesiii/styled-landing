"use client";
import VenueMessageThread from "./VenueMessageThread";
import { ENQUIRY_STATUSES } from "@/lib/venue-details";
export interface VenueRequest {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  guest_count: number | null;
  preferred_date: string | null;
  viewing_time?: string | null;
  next_actor?: string;
  message: string | null;
  status: string;
  request_kind?: string;
  response?: string | null;
  alternative_dates?: string[];
  created_at?: string;
}
export default function VenueRequestCard({
  request: r,
  busy,
  onRespond,
  showThread = true,
}: {
  request: VenueRequest;
  busy: boolean;
  showThread?: boolean;
  onRespond: (value: Record<string, unknown>) => void;
}) {
  const terminal = ["booked", "viewing_confirmed", "cancelled"].includes(r.status);
  return (
    <article className="border-b border-sand py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-clay">
            {r.request_kind === "viewing" ? "Viewing" : "Venue booking"} ·{" "}
            {r.id.slice(0, 8).toUpperCase()}
          </p>
          <h3 className="mt-2 font-serif text-2xl">{r.name}</h3>
          <a href={`mailto:${r.email}`} className="text-sm underline break-all">
            {r.email}
          </a>
        </div>
        <span className="rounded-lg bg-cream px-3 py-2 text-xs">
          {ENQUIRY_STATUSES[r.status] || r.status}
        </span>
      </div>
      <p className="mt-3 text-sm">
        {r.preferred_date}{r.viewing_time ? ` at ${r.viewing_time.slice(0, 5)} UK time` : ""} · {r.guest_count} wedding guests
        {r.phone ? ` · ${r.phone}` : ""}
      </p>
      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink/70">
        {r.message}
      </p>
      {terminal ? (
        <div className="mt-4 rounded-xl bg-cream p-4 text-sm">
          <p className="whitespace-pre-line">
            {r.response || "This request is closed."}
          </p>
          {r.status === "booked" && (
            <p className="mt-3 text-ink/60">
              To change or cancel this booking, contact support@styleduk.com so
              the couple and venue can agree the next steps.
            </p>
          )}
        </div>
      ) : (
        <details className="mt-5">
          <summary className="cursor-pointer text-sm underline">
            Respond to this request
          </summary>
          <form
            key={`${r.id}-${r.status}-${r.response}`}
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              onRespond({
                id: r.id,
                status: f.get("status"),
                response: f.get("response"),
                viewing_time: f.get("viewing_time"),
                alternative_dates: String(f.get("alternative_dates") || "")
                  .split(/[\s,]+/)
                  .map((x) => x.trim())
                  .filter(Boolean),
              });
            }}
            className="mt-4 grid gap-4 sm:grid-cols-2"
          >
            <label className="text-sm">
              Status
              <select
                name="status"
                defaultValue={r.status}
                className="mt-2 block w-full rounded-lg border border-sand bg-white p-3"
              >
                {[
                  "new",
                  "contacted",
                  ...(r.request_kind !== "viewing" ? ["booked"] : ["viewing_confirmed"]),
                  "declined",
                ].map((s) => (
                  <option key={s} value={s}>
                    {ENQUIRY_STATUSES[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Alternative dates (optional)
              <input
                name="alternative_dates"
                defaultValue={r.alternative_dates?.join(", ") || ""}
                placeholder="2027-06-12, 2027-06-19"
                className="mt-2 block w-full rounded-lg border border-sand bg-white p-3"
              />
              <span className="mt-1 block text-xs text-ink/60">
                Up to five dates, YYYY-MM-DD, separated by commas.
              </span>
            </label>
            {r.request_kind === "viewing" && <label className="text-sm">Agreed viewing time (optional, UK local time)
              <input name="viewing_time" type="time" defaultValue={r.viewing_time?.slice(0, 5) || ""} className="mt-2 block w-full rounded-lg border border-sand p-3" />
            </label>}
            <label className="text-sm sm:col-span-2">
              Message to the couple
              <textarea
                name="response"
                defaultValue={r.response || ""}
                rows={3}
                maxLength={3000}
                className="mt-2 block w-full rounded-lg border border-sand bg-white p-3"
              />
            </label>
            <p className="text-xs leading-relaxed text-ink/60 sm:col-span-2">
              Confirm a booking only after agreeing availability and
              arrangements with the couple. This records your decision and
              blocks the wedding date. Payment and your hire agreement are
              arranged separately. Confirming a viewing records an appointment only; it never blocks a wedding date.
            </p>
            <button
              disabled={busy}
              className="justify-self-start rounded-full bg-ink px-5 py-3 text-sm text-cream disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save response"}
            </button>
          </form>
        </details>
      )}
      {r.status === "viewing_confirmed" && <p className="mt-3 text-sm">Viewing appointment confirmed. No wedding date is reserved.</p>}
      {showThread && <VenueMessageThread requestId={r.id} status={r.status} nextActor={r.next_actor} />}
    </article>
  );
}
