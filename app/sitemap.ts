import type { MetadataRoute } from "next";
import { env } from "@/lib/server/env";
import { loadPublicVenues } from "@/lib/server/venues";
import { loadPublicSuppliers } from "@/lib/server/suppliers";

// Public pages plus a profile for every live supplier, so couples and search
// engines can find them. Regenerated on request (new suppliers appear).
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.siteUrl;
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/business`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/suppliers`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/venues`, changeFrequency: "weekly", priority: 0.8 },
    {
      url: `${base}/venues/partner`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${base}/suppliers/join`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  let supplierPages: MetadataRoute.Sitemap = [];
  try {
    const suppliers = await loadPublicSuppliers();
    supplierPages = suppliers.map((s) => ({
      url: `${base}/suppliers/${s.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch {
    // If the catalogue can't be read, still return the static pages.
  }

  let venuePages: MetadataRoute.Sitemap = [];
  try {
    const venues = await loadPublicVenues();
    venuePages = venues.map((v) => ({
      url: `${base}/venues/${v.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch {
    /* Static links remain available during an outage. */
  }
  return [...staticPages, ...supplierPages, ...venuePages];
}
