export const VENUE_TYPES = {
  barn: "Barn",
  country_house: "Country house",
  hotel: "Hotel",
  garden: "Garden",
  marquee: "Marquee / tipi",
  estate: "Estate",
  city: "City venue",
  other: "Other space",
} as const;
export const VENUE_FEATURES = {
  exclusive_use: "Exclusive use",
  civil_ceremony: "Civil ceremony licence",
  accommodation: "On-site accommodation",
  accessible: "Step-free access",
  parking: "On-site parking",
  outdoor_ceremony: "Outdoor ceremonies",
  in_house_catering: "In-house catering",
  external_catering: "External caterers welcome",
  dry_hire: "Dry hire",
  pet_friendly: "Pets welcome",
} as const;
export interface VenueDetails {
  venue_type: string | null;
  hire_from_pence: number | null;
  ceremony_capacity: number | null;
  evening_capacity: number | null;
  bedrooms: number | null;
  features: string[];
  pricing_notes: string | null;
  catering_notes: string | null;
  access_notes: string | null;
  address: string | null;
  postcode: string | null;
}
export const EMPTY_VENUE_DETAILS: VenueDetails = {
  venue_type: null,
  hire_from_pence: null,
  ceremony_capacity: null,
  evening_capacity: null,
  bedrooms: null,
  features: [],
  pricing_notes: null,
  catering_notes: null,
  access_notes: null,
  address: null,
  postcode: null,
};
export function parseVenueDetails(raw: Record<string, unknown>): VenueDetails {
  const d = { ...EMPTY_VENUE_DETAILS, features: [] as string[] };
  const numeric = [
    "hire_from_pence",
    "ceremony_capacity",
    "evening_capacity",
    "bedrooms",
  ] as const;
  for (const key of numeric) {
    const value =
      key === "hire_from_pence" && raw.hire_from_pounds !== undefined
        ? poundsToPence(raw.hire_from_pounds)
        : raw[key];
    if (value === undefined || value === null || value === "") continue;
    if (
      (typeof value !== "number" && typeof value !== "string") ||
      !Number.isInteger(Number(value)) ||
      Number(value) < 0 ||
      Number(value) > (key === "hire_from_pence" ? 100000000 : 10000)
    )
      throw Error(
        "Check venue prices and capacities. Use whole, non-negative numbers.",
      );
    d[key] = Number(value);
  }
  for (const key of [
    "pricing_notes",
    "catering_notes",
    "access_notes",
    "address",
    "postcode",
  ] as const) {
    if (raw[key] === undefined || raw[key] === null) continue;
    if (typeof raw[key] !== "string")
      throw Error("Use text for venue details.");
    const text = raw[key].trim();
    if (
      text.length > (key === "postcode" ? 12 : key === "address" ? 400 : 3000)
    )
      throw Error("Please shorten your venue details.");
    d[key] = text || null;
  }
  const type = raw.venue_type;
  if (type !== undefined && type !== null && type !== "") {
    if (
      typeof type !== "string" ||
      !Object.prototype.hasOwnProperty.call(VENUE_TYPES, type)
    )
      throw Error("Choose a valid venue type.");
    d.venue_type = type;
  }
  const features = raw.features ?? [];
  if (
    !Array.isArray(features) ||
    features.length > 20 ||
    features.some(
      (f) =>
        typeof f !== "string" ||
        !Object.prototype.hasOwnProperty.call(VENUE_FEATURES, f),
    )
  )
    throw Error("Choose venue facilities from the list.");
  d.features = [...new Set(features)];
  return d;
}
export function listingMissing(v: {
  name?: string;
  location?: string;
  county?: string;
  description?: string | null;
  hero_image?: string | null;
  capacity_max?: number | null;
}) {
  return [
    !v.name && "venue name",
    !v.location && "location",
    !v.county && "county",
    !v.description && "description",
    !v.hero_image && "main photograph",
    !v.capacity_max && "maximum guest count",
  ].filter(Boolean) as string[];
}
export const ENQUIRY_STATUSES: Record<string, string> = {
  new: "Request received",
  contacted: "In discussion",
  booked: "Booking confirmed",
  declined: "Unavailable",
  cancelled: "Cancelled",
};
export function validVenueDay(
  value: unknown,
  today = "0000-01-01",
): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value &&
    value >= today
  );
}
export function parseVenueResponse(
  body: Record<string, unknown>,
  today: string,
) {
  if (!["new", "contacted", "booked", "declined"].includes(String(body.status)))
    throw Error("Choose a valid request status.");
  const response =
    typeof body.response === "string" ? body.response.trim() : "";
  if (response.length > 3000)
    throw Error("Keep your response under 3,000 characters.");
  if (["booked", "declined"].includes(String(body.status)) && !response)
    throw Error(
      "Add a message for the couple, including any agreed arrangements.",
    );
  const dates = body.alternative_dates ?? [];
  if (
    !Array.isArray(dates) ||
    dates.length > 5 ||
    dates.some((d) => !validVenueDay(d, today))
  )
    throw Error("Suggest up to five valid future dates.");
  return {
    status: String(body.status),
    response: response || null,
    alternative_dates: [...new Set(dates)] as string[],
  };
}

export function poundsToPence(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !/^\d+(\.\d{1,2})?$/.test(value.trim()))
    throw Error("Enter a price in pounds, with up to two decimal places.");
  const [whole, decimal = ""] = value.trim().split(".");
  const pence = Number(whole) * 100 + Number(decimal.padEnd(2, "0"));
  if (!Number.isSafeInteger(pence) || pence > 100000000)
    throw Error("Enter a price of up to £1,000,000.");
  return pence;
}
