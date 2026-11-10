import { demoPreviewAllowed } from "@/lib/server/development-request-catalogue";
import { cache } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import ProductDetails from "@/components/design/ProductDetails";
import { loadCatalogue } from "@/lib/server/catalogue";
import { crescentMoonDemoCatalogue } from "@/lib/crescent-moon-demo-catalogue";
import { catalogueReturnHref, studioProductHref } from "./navigation";

export const dynamic = "force-dynamic";

// Use the existing anonymous catalogue boundary; unpublished products and private
// supplier information never enter this route. Cache within one request only.
const productById = cache(async (id: string) => {
  const host = (await headers()).get("host")?.split(":")[0].toLowerCase();
  const previewsAllowed = demoPreviewAllowed(host ? new Request("https://" + host) : undefined);
  const preview = previewsAllowed ? crescentMoonDemoCatalogue().find((item) => item.id === id) : undefined;
  if (preview) return preview;
  return (await loadCatalogue()).find((item) => item.id === id);
});

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const item = await productById(id);
  return {
    title: item ? `${item.name} · Styled` : "Product unavailable · Styled",
    description: item ? `${item.name} from ${item.supplier}. Explore product details and request supplier confirmation in your studio.` : undefined,
    alternates: { canonical: `/products/${encodeURIComponent(id)}` },
  };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const { id } = await params;
  const item = await productById(id);
  if (!item) notFound();
  const { returnTo } = await searchParams;
  const browseHref = catalogueReturnHref(returnTo, item.category);
  return (
    <div className="min-w-0 py-8 sm:py-12">
      <ProductDetails presentation="page" item={item} browseHref={browseHref} studioHref={studioProductHref(browseHref, item.id, !item.demoOnly)} />
    </div>
  );
}
