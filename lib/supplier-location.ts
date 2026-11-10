import { validPostcode } from "./location";

export function supplierLocationInput(body: Record<string, unknown>) {
  if (body.action === "clear") return { action: "clear" as const };
  if (body.action !== "save" || body.confirmed !== true)
    throw Error("Confirm your business location and delivery area before saving.");
  if (typeof body.postcode !== "string" || body.postcode.length > 10 || !validPostcode(body.postcode))
    throw Error("Enter a full UK business postcode, such as SW1A 1AA.");
  const raw = body.radius_miles;
  if (raw !== null && raw !== "" && !(typeof raw === "number" || typeof raw === "string" && /^\d{1,3}$/.test(raw)))
    throw Error("Use a delivery radius from 0 to 500 miles, or leave it blank.");
  const radius = raw === null || raw === "" ? null : Number(raw);
  if (radius !== null && (!Number.isInteger(radius) || radius < 0 || radius > 500))
    throw Error("Use a delivery radius from 0 to 500 miles, or leave it blank.");
  if (typeof body.nationwide !== "boolean") throw Error("Choose whether you deliver nationwide.");
  return { action: "save" as const, postcode: body.postcode.trim(), radius_miles: radius, nationwide: body.nationwide };
}
