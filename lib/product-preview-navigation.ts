/** A public preview handoff must never trigger the studio's basket add handler. */
export function previewStudioHref(id: string, studioHref?: string): string {
  const params = new URLSearchParams(studioHref?.split("?")[1]);
  params.delete("add");
  params.set("tab", "catalogue");
  params.set("product", id);
  params.set("preview", id);
  return `/design?${params}`;
}
