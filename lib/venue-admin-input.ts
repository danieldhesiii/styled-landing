import { safeImageUrl, venueEmbed } from "./venue-input";
import { STYLES } from "./styles";
export function parseVenue(body: Record<string, unknown>) {
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const name = str(body.name),
    slug = str(body.slug),
    location = str(body.location),
    county = str(body.county);
  if (
    !name ||
    name.length > 200 ||
    !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) ||
    slug.length > 160 ||
    ["partner"].includes(slug)
  )
    throw new Error(
      "Enter a venue name and a unique URL slug, such as oak-barn.",
    );
  if (!location || location.length > 200 || !county || county.length > 100)
    throw new Error("Enter a location and county.");
  const integer = (v: unknown, min: number) => {
    if (v === "" || v === null || v === undefined) return null;
    if (typeof v !== "string" && typeof v !== "number")
      throw new Error("Use whole numeric values.");
    const n = Number(v);
    if (!Number.isInteger(n) || n < min || n > 2147483647)
      throw new Error(
        "Check capacities and prices. Use whole, non-negative values.",
      );
    return n;
  };
  const capacity_min = integer(body.capacity_min, 1),
    capacity_max = integer(body.capacity_max, 1);
  if (capacity_min && capacity_max && capacity_min > capacity_max)
    throw new Error("Minimum capacity cannot exceed maximum capacity.");
  const indoor_outdoor = str(body.indoor_outdoor) || null;
  if (indoor_outdoor && !["indoor", "outdoor", "both"].includes(indoor_outdoor))
    throw new Error("Choose an indoor or outdoor setting.");
  const hero_image = str(body.hero_image) || null;
  if (hero_image && !safeImageUrl(hero_image))
    throw new Error("Use a secure HTTPS image URL or a local image path.");
  const rawGallery = Array.isArray(body.gallery_images)
    ? body.gallery_images
    : str(body.gallery_images).split("\n");
  const gallery_images = rawGallery.map(str).filter(Boolean);
  if (
    gallery_images.length > 20 ||
    gallery_images.some((v) => !safeImageUrl(v))
  )
    throw new Error("Add up to 20 valid image URLs, one per line.");
  const embeds: Record<string, string | null> = {};
  for (const [key, kind] of [
    ["video_url", "video"],
    ["matterport_url", "tour"],
    ["map_embed_url", "map"],
  ] as const) {
    const value = str(body[key]) || null;
    if (value && !venueEmbed(value, kind))
      throw new Error(
        `Check the ${kind} URL. Use YouTube/Vimeo, Matterport or Google Maps embed links as appropriate.`,
      );
    embeds[key] = value;
  }
  const description = str(body.description);
  if (description.length > 10000)
    throw new Error("Keep the description under 10,000 characters.");
  return {
    name,
    slug,
    location,
    county,
    capacity_min,
    capacity_max,
    indoor_outdoor,
    description: description || null,
    hero_image,
    gallery_images,
    ...embeds,
    package_from_pence: integer(body.package_from_pence, 0),
    active: body.active === true,
  };
}
export function parseVenuePackage(body: Record<string, unknown>) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const style_id = typeof body.style_id === "string" ? body.style_id : "";
  if (
    body.price_from_pence === "" ||
    body.price_from_pence === null ||
    body.price_from_pence === undefined ||
    typeof body.price_from_pence === "boolean"
  )
    throw new Error("Enter a package price in pence.");
  const price_from_pence = Number(body.price_from_pence),
    sort_order = Number(body.sort_order ?? 0);
  if (!name || name.length > 200 || !STYLES.some((s) => s.id === style_id))
    throw new Error("Enter a package name and choose a style.");
  if (
    !Number.isSafeInteger(price_from_pence) ||
    price_from_pence < 0 ||
    price_from_pence > 2147483647 ||
    !Number.isInteger(sort_order) ||
    Math.abs(sort_order) > 2147483647
  )
    throw new Error("Enter a valid package price in pence and sort order.");
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  if (description.length > 5000)
    throw new Error("Keep package descriptions under 5,000 characters.");
  return {
    name,
    style_id,
    price_from_pence,
    sort_order,
    description: description || null,
  };
}
