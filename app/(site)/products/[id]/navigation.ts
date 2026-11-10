/** Only catalogue state may be carried into the public page's return link. */
export function catalogueReturnHref(value: unknown, category: string): string {
  const fallback = `/design?tab=catalogue&category=${encodeURIComponent(category)}`;
  if (typeof value !== "string" || !value.startsWith("/design?")) return fallback;
  const source = new URL(value, "https://catalogue.invalid");
  if (source.pathname !== "/design") return fallback;
  const params = new URLSearchParams({ tab: source.searchParams.get("tab") === "saved" ? "saved" : "catalogue" });
  for (const key of ["category", "supplier", "q", "styleFilter", "min", "max", "sort", "venue"]) {
    const current = source.searchParams.get(key);
    if (current) params.set(key, current);
  }
  return `/design?${params}`;
}

export function studioProductHref(browseHref: string, id: string, addToBasket = true): string {
  const params = new URLSearchParams(browseHref.split("?")[1]);
  params.set("tab", "catalogue");
  params.set("product", id);
  if (addToBasket) params.set("add", id);
  return `/design?${params}`;
}
