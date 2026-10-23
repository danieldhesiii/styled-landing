import "server-only";
import {
  normalisePostcode,
  validPostcode,
  validPoint,
  type Point,
} from "@/lib/location";
export async function lookupPostcode(
  raw: string,
): Promise<Point & { postcode: string }> {
  if (!validPostcode(raw))
    throw Error("Enter a full UK postcode, such as SW1A 1AA.");
  const response = await fetch(
    `https://api.postcodes.io/postcodes/${encodeURIComponent(normalisePostcode(raw))}`,
    { signal: AbortSignal.timeout(6000), next: { revalidate: 86400 } },
  );
  if (response.status === 404)
    throw Error("That postcode could not be found. Please check it.");
  if (!response.ok)
    throw Error("Postcode lookup is unavailable. Please try again shortly.");
  const data = await response.json(),
    v = data.result;
  const postcode =
    typeof v?.postcode === "string" ? v.postcode : raw.toUpperCase();
  if (!validPoint(v)) throw Error("We could not locate that postcode.");
  return { latitude: v.latitude, longitude: v.longitude, postcode };
}
