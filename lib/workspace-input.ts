import type { WorkspaceData, WeddingBoard, BoardPin } from "./wedding";
import { isValidDay } from "./availability";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const text = (v: unknown, n: number) =>
  typeof v === "string"
    ? v
        .replace(/[\u0000-\u001f\u007f]/g, " ")
        .trim()
        .slice(0, n)
    : "";
export function parseWorkspace(raw: unknown): WorkspaceData {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw Error("Invalid wedding details.");
  const r = raw as Record<string, unknown>,
    b = r.brief as Record<string, unknown>;
  if (!b || typeof b !== "object" || Array.isArray(b))
    throw Error("Wedding details are missing.");
  const guestCount = Number(b.guestCount),
    budget = Number(b.budget);
  if (
    !Number.isInteger(guestCount) ||
    guestCount < 1 ||
    guestCount > 1000 ||
    !Number.isFinite(budget) ||
    budget < 0 ||
    budget > 1000000
  )
    throw Error("Check your guest count and budget.");
  const weddingDate = text(b.weddingDate, 10),
    deliveryDate = text(b.deliveryDate, 10);
  if (
    (weddingDate && !isValidDay(weddingDate)) ||
    (deliveryDate && !isValidDay(deliveryDate))
  )
    throw Error("Choose valid dates.");
  const photoIds = Array.isArray(b.photoIds) ? b.photoIds : [];
  if (
    photoIds.length > 20 ||
    photoIds.some((p) => typeof p !== "string" || !uuid.test(p))
  )
    throw Error("Invalid venue photographs.");
  if (!Array.isArray(r.boards) || r.boards.length > 20)
    throw Error("You can save up to 20 boards.");
  const seenBoards = new Set<string>(),
    seenPins = new Set<string>();
  const boards: WeddingBoard[] = r.boards.map((rawBoard) => {
    if (!rawBoard || typeof rawBoard !== "object")
      throw Error("Invalid board.");
    const board = rawBoard as Record<string, unknown>;
    if (
      typeof board.id !== "string" ||
      !uuid.test(board.id) ||
      seenBoards.has(board.id)
    )
      throw Error("Invalid board.");
    seenBoards.add(board.id);
    const name = text(board.name, 80);
    if (!name) throw Error("Give your board a name.");
    if (!Array.isArray(board.pins) || board.pins.length > 100)
      throw Error("You can add up to 100 pieces to each board.");
    const pins: BoardPin[] = board.pins.map((rawPin) => {
      if (!rawPin || typeof rawPin !== "object")
        throw Error("Invalid board piece.");
      const p = rawPin as Record<string, unknown>;
      if (typeof p.id !== "string" || !uuid.test(p.id) || seenPins.has(p.id))
        throw Error("Invalid board piece.");
      seenPins.add(p.id);
      const kind = p.kind;
      if (
        kind !== "photo" &&
        kind !== "product" &&
        kind !== "look" &&
        kind !== "note"
      )
        throw Error("Invalid board piece.");
      const ref = text(p.ref, 120),
        note = text(p.text, 1000);
      if (kind !== "note" && !ref)
        throw Error("Choose a piece for your board.");
      if ((kind === "look" || kind === "photo") && !uuid.test(ref))
        throw Error("Invalid board image.");
      if (kind === "note" && !note) throw Error("Write a note first.");
      return {
        id: p.id,
        kind,
        ...(kind !== "note" ? { ref } : {}),
        text: note,
      };
    });
    return { id: board.id, name, pins };
  });
  return {
    brief: {
      venueId: text(b.venueId, 120) || "manor_orangery",
      styleId: text(b.styleId, 60) || "garden_romance",
      guestCount,
      budget,
      weddingDate,
      deliveryDate,
      deliverySameDay: b.deliverySameDay !== false,
      venueChoice:
        b.venueChoice === "have"
          ? "have"
          : b.venueChoice === "looking"
            ? "looking"
            : "exploring",
      venueName: text(b.venueName, 160),
      venuePostcode: text(b.venuePostcode, 10).toUpperCase(),
      photoIds: [...new Set(photoIds)] as string[],
    },
    boards,
  };
}
