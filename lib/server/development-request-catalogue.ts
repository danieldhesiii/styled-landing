import { earthVillageCatalogue } from "@/lib/earth-village-catalogue";
import { crescentMoonDemoCatalogue } from "@/lib/crescent-moon-demo-catalogue";
import type { ServerCatalogueItem } from "@/lib/server/catalogue";

import {linkedCrescentProduct} from "./crescent-call-demo";

// Server-owned sidecar only. Browser flags, names and prices are never trusted.
export function demoPreviewAllowed(req?: Request): boolean {
  const host = req ? new URL(req.url).hostname : "";
  if (process.env.NODE_ENV === "development" || ["styledukprodprogress.vercel.app", "localhost", "127.0.0.1"].includes(host)) return true;
  return process.env.STYLED_PUBLIC_DEMO_ENABLED === "true"
    && ["styleduk.com", "www.styleduk.com"].includes(host)
    && /^https:\/\/yfwqcidkfjzpwbylgnug\.supabase\.co\/?$/.test(process.env.NEXT_PUBLIC_SUPABASE_URL || "");
}

export function developmentRequestsAllowed(req?: Request): boolean {
  if (!demoPreviewAllowed(req)) return false;
  const host = req ? new URL(req.url).hostname : "";
  const database = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return ["styleduk.com", "www.styleduk.com"].includes(host)
    ? /^https:\/\/yfwqcidkfjzpwbylgnug\.supabase\.co\/?$/.test(database)
    : /^https:\/\/qkyeitvwscrxbiwamxan\.supabase\.co\/?$/.test(database);
}

export function supplierPreviewCatalogue(req?: Request) {
  const items = demoPreviewAllowed(req) ? crescentMoonDemoCatalogue() : [];
  const host = req ? new URL(req.url).hostname : "";
  if (process.env.NODE_ENV === "development" || ["styledukprodprogress.vercel.app", "localhost", "127.0.0.1"].includes(host)) {
    items.push(...earthVillageCatalogue());
  }
  return items.filter(item => !linkedCrescentProduct(item.id));
}

export function developmentRequestCatalogue(req?: Request): ServerCatalogueItem[] {
  if (!developmentRequestsAllowed(req)) return [];
  return supplierPreviewCatalogue(req).map(item => ({ ...item, requestOnly: true, capacity: null, supplierId: "", updatedAt: "development-sidecar" }));
}

export function requestSnapshot(item: ServerCatalogueItem) {
  return { catalogueId: item.id, name: item.name, supplier: item.supplier, unit: item.unit, image: item.image,
    requestOnly: true, priceOnRequest: !!item.priceOnRequest, developmentOnly: true,
    dimensions: item.dimensions, pricing: item.demoPricing || null };
}
