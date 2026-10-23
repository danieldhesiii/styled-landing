export interface Point {
  latitude: number;
  longitude: number;
}
export interface DiscoveryMatch {
  miles: number;
  delivery: "within_area" | "outside_area" | "nationwide" | "unknown";
}
export interface DiscoveryResults {
  label: string;
  suppliers: Record<string, DiscoveryMatch>;
  venues: Record<string, DiscoveryMatch>;
}
export function validPoint(v: unknown): v is Point {
  if (!v || typeof v !== "object") return false;
  const p = v as Point;
  return (
    typeof p.latitude === "number" &&
    Number.isFinite(p.latitude) &&
    p.latitude >= 49 &&
    p.latitude <= 61 &&
    typeof p.longitude === "number" &&
    Number.isFinite(p.longitude) &&
    p.longitude >= -9 &&
    p.longitude <= 3
  );
}
export function milesBetween(a: Point, b: Point) {
  const r = Math.PI / 180,
    dlat = (b.latitude - a.latitude) * r,
    dlon = (b.longitude - a.longitude) * r;
  const x =
    Math.sin(dlat / 2) ** 2 +
    Math.cos(a.latitude * r) *
      Math.cos(b.latitude * r) *
      Math.sin(dlon / 2) ** 2;
  return (
    3958.7613 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(Math.max(0, 1 - x)))
  );
}
export const normalisePostcode = (p: string) =>
  p.replace(/\s/g, "").toUpperCase();
export const validPostcode = (p: string) =>
  /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(normalisePostcode(p));
