import { parseWorkspace } from "@/lib/workspace-input";
import { emptyPreviewSelection } from "@/lib/event-plans";
import { workspaceFingerprint, type WorkspaceData, type WeddingBrief } from "@/lib/wedding";

// Opening a saved preview and refreshing public venue details are read-only actions.
export function planningFingerprint(value: WorkspaceData): string {
  const brief = (entry: WorkspaceData["brief"]) => ({
    ...entry,
    deliverySameDay: entry.deliverySameDay !== false,
    deliveryDate: entry.deliveryDate || "",
    returnDate: entry.returnDate || "",
    venueChoice: entry.venueChoice || "exploring",
    venueName: entry.venueName || "",
    venuePostcode: entry.venuePostcode || "",
    ...(entry.venueId.startsWith("listing:") ? { venueName: "", venueChoice: "have" } : {}),
  });
  return workspaceFingerprint({
    ...value,
    brief: brief(value.brief),
    events: value.events?.map(({ renderId: _renderId, ...event }) => ({
      ...event,
      previewSelection: event.previewSelection ?? emptyPreviewSelection(),
      brief: brief(event.brief),
    })),
  });
}

export function newEventBrief(): WeddingBrief {
  return {
    styleId: "garden_romance",
    guestCount: 80,
    guestCountEstimated: true,
    weddingDate: "",
    deliverySameDay: true,
    deliveryDate: "",
    returnDate: "",
    venueId: "manor_orangery",
    venueChoice: "exploring",
    venueName: "",
    venuePostcode: "",
    uploadedImages: [],
    budget: 0,
    budgetUnknown: true,
    planSetupComplete: false,
  };
}

export function persistPlanningDraft(storage: Pick<Storage, "setItem" | "getItem"> | (() => Pick<Storage, "setItem" | "getItem">), key: string, value: unknown): boolean {
  try {
    const encoded = JSON.stringify(value);
    const target = typeof storage === "function" ? storage() : storage;
    target.setItem(key, encoded);
    return target.getItem(key) === encoded;
  } catch {
    return false;
  }
}

export function createPlanningDraft(workspace: WorkspaceData, brief: WeddingBrief, revision: number) {
  const active = workspace.events?.find((event) => event.id === workspace.activeEventId);
  return {
    workspace,
    workspaceRevision: revision,
    activeEventId: workspace.activeEventId,
    brief,
    basket: active?.basket ?? [],
    renderId: active?.renderId ?? null,
    previewSelection: active?.previewSelection ?? emptyPreviewSelection(),
  };
}

export function recoverPlanningWorkspace(draft: { workspaceRevision?: number; workspace?: unknown } | null, revision: number): WorkspaceData | null {
  if (!draft?.workspace || draft.workspaceRevision !== revision) return null;
  try { return parseWorkspace(draft.workspace); } catch { return null; }
}
