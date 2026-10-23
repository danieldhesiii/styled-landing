export const STUDIO_TABS = [
  "wedding",
  "catalogue",
  "venues",
  "boards",
  "saved",
  "looks",
  "visualiser",
  "orders",
] as const;
export type StudioTab = (typeof STUDIO_TABS)[number];
export function studioRoute(params: Pick<URLSearchParams, "get">) {
  const requested = params.get("tab");
  const tab: StudioTab = STUDIO_TABS.includes(requested as StudioTab)
    ? (requested as StudioTab)
    : params.get("render") === "true"
      ? "visualiser"
      : params.get("supplier") || params.get("add")
        ? "catalogue"
        : "wedding";
  return {
    tab,
    bookings:
      params.get("bookings") === "venues"
        ? ("venues" as const)
        : ("suppliers" as const),
  };
}
export function studioDestination(
  current: string,
  tab: StudioTab,
  bookings: "suppliers" | "venues" = "suppliers",
) {
  const url = new URL(current);
  url.searchParams.set("tab", tab);
  url.searchParams.delete("render");
  if (tab === "orders") url.searchParams.set("bookings", bookings);
  else url.searchParams.delete("bookings");
  url.hash = "";
  return url;
}
