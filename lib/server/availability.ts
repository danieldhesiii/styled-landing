import type { SupabaseClient } from "@supabase/supabase-js";
import { classifyAvailability, type ItemAvailability } from "@/lib/availability";

// Reads availability from the database function public.product_availability,
// the single definition of what's free on a given day.

export interface RawAvailability {
  productId: string;
  capacity: number | null;
  effectiveCapacity: number | null;
  reserved: number;
  available: number | null;
}

export async function loadAvailability(
  admin: SupabaseClient,
  productIds: string[],
  day: string,
  excludeOrderId?: string
): Promise<Map<string, RawAvailability>> {
  const { data, error } = await admin.rpc("product_availability", {
    p_product_ids: productIds,
    p_day: day,
    p_exclude_order: excludeOrderId ?? null,
  });
  if (error) throw new Error(`Couldn't check availability: ${error.message}`);

  return new Map(
    (data ?? []).map(
      (r: { product_id: string; capacity: number | null; effective_capacity: number | null; reserved: number; available: number | null }) => [
        r.product_id,
        {
          productId: r.product_id,
          capacity: r.capacity,
          effectiveCapacity: r.effective_capacity,
          reserved: r.reserved,
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
  excludeOrderId?: string
): Promise<Map<string, ItemAvailability>> {
  const raw = await loadAvailability(admin, wanted.map((w) => w.itemId), day, excludeOrderId);
  const out = new Map<string, ItemAvailability>();
  for (const w of wanted) {
    const a = raw.get(w.itemId);
    if (a) out.set(w.itemId, classifyAvailability(a, w.quantity));
  }
  return out;
}
