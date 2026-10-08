import type { MetadataRoute } from "next";
import { env } from "@/lib/server/env";

// Marketing + public pages are crawlable; the staff admin and supplier portal are
// not (they're also noindex via their layouts). Private app areas are excluded too.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/portal", "/design", "/order", "/api"],
    },
    sitemap: `${env.siteUrl}/sitemap.xml`,
  };
}
