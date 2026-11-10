import { headers } from "next/headers";
import { developmentRequestCatalogue } from "./development-request-catalogue";
import type {SupplierServices} from "@/lib/supplier-workspace";
import { createAnonClient } from "@/lib/supabase/anon";
import {
  loadCatalogue,
  type ServerCatalogueItem,
} from "@/lib/server/catalogue";

// Public supplier profiles, derived from the live catalogue. Because they come
// from loadCatalogue (the signed-out view), only active products from active
// suppliers are ever included — a switched-off supplier simply has no page.
// Nothing sensitive (commission, private contact) is ever read here.

export interface PublicSupplier {
  id: string;
  name: string;
  area: string;
  logoUrl?: string;
  productCount: number;
}

export interface PublicSupplierProfile extends PublicSupplier {
  products: ServerCatalogueItem[];
  bio: string | null;
  services:Partial<SupplierServices>;
}

async function previewChandeliers() {
  const host = (await headers()).get("host");
  if (host !== "styledukprodprogress.vercel.app") return [];
  return developmentRequestCatalogue(new Request("https://styledukprodprogress.vercel.app"));
}

// Every supplier with at least one shoppable product, alphabetical.
export async function loadPublicSuppliers(includePreview = false): Promise<PublicSupplier[]> {
  const client = createAnonClient();
  const suppliers: PublicSupplier[] = [];
  const batchSize = 250;
  for (let start = 0; ; start += batchSize) {
    const { data, error } = await client.from("suppliers")
      .select("id,name,area,logo_url,products(count)")
      .order("name").order("id").range(start, start + batchSize - 1);
    if (error) throw new Error("Could not load the supplier directory.");
    for (const supplier of data ?? []) {
      const productCount = supplier.products[0]?.count ?? 0;
      if (productCount > 0) suppliers.push({
        id: supplier.id, name: supplier.name, area: supplier.area,
        logoUrl: supplier.logo_url ?? undefined, productCount,
      });
    }
    if (!data || data.length < batchSize) break;
  }
  if (includePreview) {
    const pieces = await previewChandeliers();
    if (pieces.length) suppliers.push({ id: "crescent-moon", name: pieces[0].supplier, area: pieces[0].supplierArea, productCount: pieces.length });
  }
  return suppliers.sort((a, b) => a.name.localeCompare(b.name));
}

// One supplier's public profile, or null if they're off / have no live products.
export async function loadPublicSupplier(
  id: string,
): Promise<PublicSupplierProfile | null> {
  if (id === "crescent-moon") {
    const products = await previewChandeliers();
    if (!products.length) return null;
    return { id, name: products[0].supplier, area: products[0].supplierArea, productCount: products.length, products, bio: "Crystal chandelier hire for weddings, with delivery, installation and collection arranged for your venue.", services: {} };
  }
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) return null;
  const mine = await loadCatalogue(id);
  if (mine.length === 0) return null;
  const { data: profile, error } = await createAnonClient()
    .from("suppliers")
    .select("bio,service_details")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Could not load supplier profile.");
  return {
    bio: profile?.bio ?? null,
    services:profile?.service_details??{},
    id,
    name: mine[0].supplier,
    area: mine[0].supplierArea,
    logoUrl: mine[0].supplierLogo,
    productCount: mine.length,
    products: mine,
  };
}
