import type { SupabaseClient } from "@supabase/supabase-js";
import { classifyAvailability, type ItemAvailability } from "@/lib/availability";

// Reads availability from the database function public.product_availability,
// the single definition of what's free on a given day.

export interface RawAvailability {
  productId: string;
  capacity: number | null;
  effectiveCapacity: number | null;
  reserved: number; // on placed orders
  held: number; // in other couples' baskets right now
  available: number | null;
}

// What to leave out of the count: an order being edited (so it doesn't compete
// with itself), and/or a couple's own basket holds (so their basket doesn't).
export interface AvailabilityExclusions {
  orderId?: string;
  ownerId?: string;
}

export async function loadAvailability(
  admin: SupabaseClient,
  productIds: string[],
  day: string,
  exclude: AvailabilityExclusions = {}
): Promise<Map<string, RawAvailability>> {
  const { data, error } = await admin.rpc("product_availability", {
    p_product_ids: productIds,
    p_day: day,
    p_exclude_order: exclude.orderId ?? null,
    p_exclude_owner: exclude.ownerId ?? null,
  });
  if (error) throw new Error(`Couldn't check availability: ${error.message}`);

  return new Map(
    (data ?? []).map(
      (r: {
        product_id: string;
        capacity: number | null;
        effective_capacity: number | null;
        reserved: number;
        held: number;
        available: number | null;
      }) => [
        r.product_id,
        {
          productId: r.product_id,
          capacity: r.capacity,
          effectiveCapacity: r.effective_capacity,
          reserved: r.reserved,
          held: r.held ?? 0,
          available: r.available,
        },
      ]
    )
  );
}

// Classify each requested quantity against the day's availability.
export async function checkQuantities(
  admin: SupabaseClient,
  wanted: { itemId: string; quantity: number }[],
  day: string,
  exclude: AvailabilityExclusions = {}
): Promise<Map<string, ItemAvailability>> {
  const raw = await loadAvailability(admin, wanted.map((w) => w.itemId), day, exclude);
  const out = new Map<string, ItemAvailability>();
  for (const w of wanted) {
    const a = raw.get(w.itemId);
    if (a) out.set(w.itemId, classifyAvailability(a, w.quantity));
  }
  return out;
}

// How long a basket holds its stock without hearing from the couple. The studio
// re-syncs every minute while it's open, so this only matters once they leave.
export const HOLD_TTL_SECONDS = 15 * 60;

// Replace a couple's basket holds with this basket on this day (null day or
// empty basket releases everything). A line that doesn't fit holds what's free.
export async function setBasketHolds(
  admin: SupabaseClient,
  ownerId: string,
  day: string | null,
  lines: { itemId: string; quantity: number }[]
): Promise<void> {
  const { error } = await admin.rpc("set_basket_holds", {
    p_owner: ownerId,
    p_day: day,
    p_lines: lines.map((l) => ({ product_id: l.itemId, quantity: l.quantity })),
    p_ttl_seconds: HOLD_TTL_SECONDS,
  });
  if (error) throw new Error(`Couldn't hold your basket: ${error.message}`);
}
