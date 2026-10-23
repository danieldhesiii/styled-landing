import {
  VENUE_TYPES,
  VENUE_FEATURES,
  type VenueDetails,
} from "@/lib/venue-details";
const field =
  "mt-2 block w-full rounded-lg border border-sand bg-white p-3 text-sm";
export default function VenueDetailsFields({
  details,
  pricesInPounds = false,
}: {
  details?: VenueDetails;
  pricesInPounds?: boolean;
}) {
  return (
    <fieldset className="grid gap-5 border-t border-sand pt-6 sm:col-span-2 sm:grid-cols-2">
      <legend className="mb-4 font-serif text-2xl">
        The details couples need
      </legend>
      <label className="text-sm">
        Venue type
        <select
          name="venue_type"
          defaultValue={details?.venue_type || ""}
          className={field}
        >
          <option value="">Not specified</option>
          {Object.entries(VENUE_TYPES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
      {(
        [
          ["hire_from_pence", "Venue hire from (pence)"],
          ["ceremony_capacity", "Ceremony guests"],
          ["evening_capacity", "Evening guests"],
          ["bedrooms", "On-site bedrooms"],
        ] as const
      ).map(([k, label]) => (
        <label key={k} className="text-sm">
          {k === "hire_from_pence" && pricesInPounds
            ? "Venue hire from (£)"
            : label}
          <input
            type="number"
            name={
              k === "hire_from_pence" && pricesInPounds ? "hire_from_pounds" : k
            }
            min="0"
            step={k === "hire_from_pence" && pricesInPounds ? "0.01" : "1"}
            max={
              k === "hire_from_pence"
                ? pricesInPounds
                  ? 1000000
                  : 100000000
                : 10000
            }
            defaultValue={
              k === "hire_from_pence" &&
              pricesInPounds &&
              details?.hire_from_pence != null
                ? details.hire_from_pence / 100
                : (details?.[k] ?? "")
            }
            className={field}
          />
          {k === "hire_from_pence" && (
            <span className="mt-1 block text-xs text-ink/60">
              {pricesInPounds
                ? "Venue hire is separate from styling. Leave blank if you quote individually."
                : "£1,000 = 100000 pence. Venue hire is separate from styling."}
            </span>
          )}
        </label>
      ))}
      {(
        [
          ["address", "Public address"],
          ["postcode", "Postcode"],
        ] as const
      ).map(([k, label]) => (
        <label key={k} className="text-sm">
          {label}
          <input
            name={k}
            defaultValue={details?.[k] || ""}
            maxLength={k === "postcode" ? 12 : 400}
            className={field}
          />
        </label>
      ))}
      <fieldset className="sm:col-span-2">
        <legend className="text-sm">Facilities you offer</legend>
        <p className="mt-1 text-xs text-ink/60">
          Only select facilities you can confirm. Add access details below.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {Object.entries(VENUE_FEATURES).map(([k, v]) => (
            <label key={k} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="features"
                value={k}
                defaultChecked={details?.features?.includes(k)}
              />
              {v}
            </label>
          ))}
        </div>
      </fieldset>
      {(
        [
          ["pricing_notes", "Hire inclusions, minimum spend and payment terms"],
          ["catering_notes", "Catering, bar and supplier arrangements"],
          ["access_notes", "Access, parking, setup times and restrictions"],
        ] as const
      ).map(([k, label]) => (
        <label key={k} className="text-sm sm:col-span-2">
          {label}
          <textarea
            name={k}
            defaultValue={details?.[k] || ""}
            maxLength={3000}
            rows={3}
            className={field}
          />
        </label>
      ))}
    </fieldset>
  );
}
