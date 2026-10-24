import type { WeddingBoard } from "./wedding";
export interface BoardInspiration {
  boardId: string;
  name: string;
  photoIds: string[];
  itemIds: string[];
  notes: string;
}
export function prepareBoard(board: WeddingBoard): BoardInspiration {
  return {
    boardId: board.id,
    name: board.name,
    photoIds: [
      ...new Set(
        board.pins
          .filter((p) => p.kind === "photo" && p.ref)
          .map((p) => p.ref!),
      ),
    ].slice(0, 3),
    itemIds: [
      ...new Set(
        board.pins
          .filter((p) => p.kind === "product" && p.ref)
          .map((p) => p.ref!),
      ),
    ].slice(0, 12),
    notes: board.pins
      .filter((p) => p.kind === "note" && !p.text.startsWith("Pinterest: "))
      .map((p) => p.text)
      .join(". ")
      .slice(0, 400),
  };
}
export function pinterestLink(value: string): string | null {
  try {
    if (value.length > 900) return null;
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port)
      return null;
    if (
      ![
        "pinterest.com",
        "www.pinterest.com",
        "uk.pinterest.com",
        "pinterest.co.uk",
        "www.pinterest.co.uk",
        "pin.it",
      ].includes(url.hostname) && !/^[a-z]{2}\.pinterest\.com$/.test(url.hostname)
    )
      return null;
    if (url.pathname === "/") return null;
    url.hash = "";
    url.search = "";
    return url.toString();
  } catch {
    return null;
  }
}
export function parsePhotoSelection(value: unknown, limit = 3): string[] {
  if (value === undefined) return [];
  if (
    !Array.isArray(value) ||
    value.length > limit ||
    value.some(
      (id) =>
        typeof id !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          id,
        ),
    )
  )
    throw Error("Choose valid private photos within the image limit.");
  return [...new Set(value as string[])];
}
export function inspirationInstruction(count: number): string {
  return count
    ? `The FINAL ${count} images are wedding inspiration references, NOT photographs of the venue or additional products. Use only their colour palette, materials and styling mood. Preserve the architecture and camera angle of the FIRST image. Do not copy their rooms, people, text or products outside the listed catalogue inventory.`
    : "";
}
