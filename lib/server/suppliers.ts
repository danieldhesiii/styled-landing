import {crescentTestEnabled,crescentTestSupplier} from "./crescent-call-demo";
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
  messageSupplierId?: string;
  bio: string | null;
  messageReplyHours?: number | null;
  services:Partial<SupplierServices>;
}

async function previewChandeliers() {
  const host = (await headers()).get("host");
  if (!host) return [];
  return developmentRequestCatalogue(new Request("https://" + host));
}

// Every supplier with at least one shoppable product, alphabetical.
export async function loadPublicSuppliers(includePreview = false): Promise<PublicSupplier[]> {
  const client = createAnonClient();
  const suppliers: PublicSupplier[] = [];
  const batchSize = 250;
  for (let start = 0; ; start += batchSize) {
    const { data, error } = await client.from("suppliers")
      .select("id,name,area,logo_url,products(category)")
      .order("name").order("id").range(start, start + batchSize - 1);
    if (error) throw new Error("Could not load the supplier directory.");
    for (const supplier of data ?? []) {
      const productCount = supplier.products.filter(p => p.category !== "stationery").length;
      if (productCount > 0) suppliers.push({
        id: supplier.id, name: supplier.name, area: supplier.area,
        logoUrl: supplier.logo_url ?? undefined, productCount,
      });
    }
    if (!data || data.length < batchSize) break;
  }
  if (includePreview) {
    const pieces = await previewChandeliers();
    const chandeliers = pieces.filter(p => p.supplier === "Crescent Moon");
    const tents = pieces.filter(p => p.supplier === "Earth Village Events");
    if (tents.length) suppliers.push({id:"earth-village-events", name:tents[0].supplier, area:tents[0].supplierArea, productCount:tents.length});
    const linkedIndex = crescentTestEnabled() ? suppliers.findIndex(s => s.id === crescentTestSupplier) : -1;
    const linkedCount = chandeliers.length && linkedIndex >= 0 ? suppliers.splice(linkedIndex,1)[0].productCount : 0;
    if (chandeliers.length) suppliers.push({ id: "crescent-moon", name: chandeliers[0].supplier, area: chandeliers[0].supplierArea, productCount: chandeliers.length + linkedCount });
  }
  return suppliers.sort((a, b) => a.name.localeCompare(b.name));
}

// One supplier's public profile, or null if they're off / have no live products.
export async function loadPublicSupplier(
  id: string,
): Promise<PublicSupplierProfile | null> {
  if (id === "earth-village-events") {
    const products = (await previewChandeliers()).filter(p => p.supplier === "Earth Village Events");
    if (!products.length) return null;
    return {id, name:products[0].supplier, area:products[0].supplierArea, productCount:products.length, products,
      bio:"Bristol-based stretch tent hire, run by Alex Noferi and Jennifer Lines-Noferi. Stretch tent installations since 2012, with professional rigging and take-down.",
      services:{}};
  }
  if (id === "crescent-moon") {
    const products = (await previewChandeliers()).filter(p => p.supplier === "Crescent Moon");
    if (!products.length) return null;
    const linked = crescentTestEnabled() ? await loadCatalogue(crescentTestSupplier) : [];
    products.unshift(...linked);
    return { id, messageSupplierId: linked.length ? crescentTestSupplier : undefined, messageReplyHours:linked.length ? 48 : undefined, name: "Crescent Moon", area: products[0].supplierArea, productCount: products.length, products, bio: "Crystal chandelier hire for weddings, with delivery, installation and collection arranged for your venue.", services: {} };
  }
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) return null;
  const mine = await loadCatalogue(id);
  if (mine.length === 0) return null;
  const { data: profile, error } = await createAnonClient()
    .from("suppliers")
    .select("bio,service_details,message_reply_hours")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Could not load supplier profile.");
  return {
    bio: profile?.bio ?? null,
    messageReplyHours: profile?.message_reply_hours ?? null,
    services:profile?.service_details??{},
    id,
    name: mine[0].supplier,
    area: mine[0].supplierArea,
    logoUrl: mine[0].supplierLogo,
    productCount: mine.length,
    products: mine,
  };
}
