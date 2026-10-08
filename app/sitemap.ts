import type { MetadataRoute } from "next";
import { env } from "@/lib/server/env";
import { loadPublicSuppliers } from "@/lib/server/suppliers";

// Public pages plus a profile for every live supplier, so couples and search
// engines can find them. Regenerated on request (new suppliers appear).
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.siteUrl;
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/suppliers`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/vendors`, changeFrequency: "monthly", priority: 0.5 },
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

  return [...staticPages, ...supplierPages];
}
