// Two development fixtures share their public preview IDs so existing links,
// baskets and visualiser references continue to resolve to the same chandelier.
export const crescentTestSupplier = "34ba777b-0800-466a-b8ac-e97fe20a9ae3";
export function crescentTestEnabled() {
  return /^https:\/\/qkyeitvwscrxbiwamxan\.supabase\.co\/?$/.test(process.env.NEXT_PUBLIC_SUPABASE_URL || "");
}
export function linkedCrescentProduct(id: string) {
  return crescentTestEnabled() && ["demo-crescent-moon-empire-90", "demo-crescent-moon-marie-therese-100"].includes(id);
}
