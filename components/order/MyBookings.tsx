"use client";
import MyOrders from "./MyOrders";
import MyVenueRequests from "@/components/venues/MyVenueRequests";

export default function MyBookings({
  section,
  onSection,
  onBrowse,
  onFindVenue,
}: {
  section: "suppliers" | "venues";
  onSection: (section: "suppliers" | "venues") => void;
  onBrowse: () => void;
  onFindVenue: () => void;
}) {
  return (
    <section>
      <p className="text-xs uppercase tracking-widest text-clay">
        Your requests & confirmations
      </p>
      <h1 className="mt-3 font-serif text-4xl sm:text-5xl">My bookings</h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink/60">
        Follow everything you have submitted here. Each request shows its own
        status; sending a request is not a confirmed booking. Your basket holds
        products you have not submitted yet.
      </p>
      <nav
        aria-label="Booking types"
        className="my-7 flex gap-6 border-b border-sand text-sm"
      >
        {(
          [
            ["suppliers", "Supplier orders"],
            ["venues", "Venue requests"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => onSection(key)}
            aria-current={section === key ? "page" : undefined}
            className={`min-h-12 border-b-2 ${section === key ? "border-clay font-medium" : "border-transparent text-ink/60"}`}
          >
            {label}
          </button>
        ))}
      </nav>
      {section === "suppliers" ? (
        <MyOrders onBrowse={onBrowse} />
      ) : (
        <MyVenueRequests embedded onBrowse={onFindVenue} />
      )}
    </section>
  );
}
