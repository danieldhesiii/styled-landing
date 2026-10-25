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
      <h1 className="font-serif text-3xl sm:text-4xl">My bookings</h1>
      <p className="mt-3 max-w-2xl text-sm text-ink/60">
        Track supplier and venue requests. A request becomes a booking only after confirmation.
      </p>
      <nav
        aria-label="Booking types"
        className="my-7 flex gap-6 border-b border-sand text-sm"
      >
        {(
          [
            ["suppliers", "Supplier requests"],
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
