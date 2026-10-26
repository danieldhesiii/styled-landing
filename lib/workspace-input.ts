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
    deliveryDate = text(b.deliveryDate, 10),
    returnDate = text(b.returnDate, 10);
  if (
    (weddingDate && !isValidDay(weddingDate)) ||
    (deliveryDate && !isValidDay(deliveryDate)) ||
    (returnDate && !isValidDay(returnDate))
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
  let events: import("./wedding").EventPlan[] | undefined;
  let activeEventId: string | undefined;
  if (r.events !== undefined) {
    if (!Array.isArray(r.events) || r.events.length < 1 || r.events.length > 12)
      throw Error("Save between 1 and 12 event plans.");
    const seen = new Set<string>();
    events = r.events.map((raw) => {
      if (!raw || typeof raw !== "object") throw Error("Invalid event plan.");
      const e = raw as Record<string, unknown>;
      if (typeof e.id !== "string" || !uuid.test(e.id) || seen.has(e.id))
        throw Error("Invalid event plan id.");
      seen.add(e.id);
      const name = text(e.name, 80);
      if (
        !name ||
        !["ceremony", "reception", "party", "other"].includes(String(e.kind))
      )
        throw Error("Give each event a name and type.");
      const brief = parseWorkspace({ brief: e.brief, boards: [] }).brief;
      if (!Array.isArray(e.basket) || e.basket.length > 100)
        throw Error("Too many event basket items.");
      const seenItems = new Set<string>();
      const basket = e.basket.map((rawLine: unknown) => {
        if (!rawLine || typeof rawLine !== "object")
          throw Error("Invalid event item.");
        const line = rawLine as Record<string, unknown>;
        if (
          typeof line.itemId !== "string" ||
          !/^[a-zA-Z0-9_-]{1,120}$/.test(line.itemId) ||
          seenItems.has(line.itemId) ||
          !Number.isInteger(line.quantity) ||
          Number(line.quantity) < 1 ||
          Number(line.quantity) > 10000
        )
          throw Error("Invalid event item quantity.");
        seenItems.add(line.itemId);
        let hireDates;
        if (line.hireDates !== undefined) {
          const d = line.hireDates as Record<string, unknown> | null;
          if (
            !d ||
            !isValidDay(d.start) ||
            !isValidDay(d.end) ||
            String(d.end) < String(d.start)
          )
            throw Error("Invalid event hire dates.");
          hireDates = { start: d.start as string, end: d.end as string };
        }
        return {
          itemId: line.itemId,
          quantity: line.quantity as number,
          ...(hireDates ? { hireDates } : {}),
        };
      });
      if (
        e.renderId != null &&
        (typeof e.renderId !== "string" || !uuid.test(e.renderId))
      )
        throw Error("Invalid event look.");
      return {
        id: e.id,
        name,
        kind: e.kind as import("./wedding").EventPlan["kind"],
        brief,
        basket,
        renderId: e.renderId as string | null | undefined,
      };
    });
    if (typeof r.activeEventId !== "string" || !seen.has(r.activeEventId))
      throw Error("Choose an active event.");
    activeEventId = r.activeEventId;
  }
  return {
    brief: {
      venueId: text(b.venueId, 120) || "manor_orangery",
      styleId: text(b.styleId, 60) || "garden_romance",
      ...(typeof b.planSetupComplete === "boolean"
        ? { planSetupComplete: b.planSetupComplete }
        : {}),
      ...(typeof b.guestCountEstimated === "boolean"
        ? { guestCountEstimated: b.guestCountEstimated }
        : {}),
      ...(typeof b.budgetUnknown === "boolean"
        ? { budgetUnknown: b.budgetUnknown }
        : {}),
      guestCount,
      budget,
      weddingDate,
      deliveryDate,
      returnDate,
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
    ...(events ? { events, activeEventId } : {}),
  };
}
