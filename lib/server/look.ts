import { createAdminClient } from "@/lib/supabase/admin";
import {
  loadCatalogue,
  SCENE_CATEGORIES,
  type ServerCatalogueItem,
} from "@/lib/server/catalogue";
import { loadAvailability } from "@/lib/server/availability";
import { composeLook, type DayAvailability, type LookReport } from "@/lib/look";
import { isValidDay, todayUtc } from "@/lib/availability";
import type { SceneId } from "@/lib/scenes";

// Decide which catalogue pieces a render may show, from the LIVE catalogue and
// the LIVE availability for the couple's wedding date. See lib/look.ts for the
// rule. Used by /api/generate so nothing appears in a picture that the couple
// couldn't go on to order.

export interface OrderableLook {
  items: ServerCatalogueItem[];
  report: LookReport;
}

// A wedding date we can check against: a real calendar day, today or later.
export function usableDate(value: unknown): string | null {
  return isValidDay(value) && value >= todayUtc() ? value : null;
}

export async function composeOrderableLook(opts: {
  styleId: string | null;
  chosenIds: string[];
  setting: SceneId;
  weddingDate: string | null;
  deliveryDate?: string | null;
  guestCount: number;
  autoFill?: boolean;
  substitute?: boolean;
}): Promise<OrderableLook> {
  const catalogue = await loadCatalogue();
  const date = usableDate(opts.weddingDate);

  let availability: Map<string, DayAvailability> | null = null;
  if (date && catalogue.length > 0) {
    const raw = await loadAvailability(
      createAdminClient(),
      catalogue.map((i) => i.id),
      date,
      undefined,
      opts.deliveryDate || date,
    );
    availability = new Map(
      [...raw].map(([id, a]) => [
        id,
        { effectiveCapacity: a.effectiveCapacity, available: a.available },
      ]),
    );
  }

  const { items, report } = composeLook({
    catalogue,
    availability,
    date,
    guestCount: opts.guestCount,
    chosenIds: opts.chosenIds,
    styleId: opts.styleId,
    categories: SCENE_CATEGORIES[opts.setting],
    autoFill: opts.autoFill,
    substitute: opts.substitute,
  });

  const byId = new Map(catalogue.map((i) => [i.id, i]));
  return { items: items.map((i) => byId.get(i.id)!), report };
}
