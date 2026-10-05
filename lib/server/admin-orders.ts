import type { SupabaseClient } from "@supabase/supabase-js";
import { checkQuantities } from "@/lib/server/availability";
import type { ItemAvailability } from "@/lib/availability";

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function cleanText(v: unknown, max: number): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== "string") return undefined;
  const s = v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]+/g, " ").trim();
  return s ? s.slice(0, max) : null;
}

// Everything a stylist needs on one screen: the order (including the internal
// fields couples never see), each supplier line with whether it still fits on the
// wedding date, the couple's styled room, and the history.
export async function loadAdminOrder(admin: SupabaseClient, id: string) {
  const { data: order } = await admin.from("orders").select("*").eq("id", id).maybeSingle();
  if (!order) return null;

  const { data: lines } = await admin
    .from("order_lines")
    .select("*")
    .eq("order_id", id)
    .order("supplier_name")
    .order("product_name");

  const { data: events } = await admin
    .from("order_events")
    .select("id, type, actor_label, detail, created_at")
    .eq("order_id", id)
    .order("created_at", { ascending: true });

  // Does each line still fit on the wedding date? (This order's own units are excluded.)
  let availability: Record<string, ItemAvailability> = {};
  if (order.wedding_date && lines?.length) {
    const wanted = lines.filter((l) => l.product_id).map((l) => ({ itemId: l.product_id as string, quantity: l.quantity as number }));
    availability = Object.fromEntries(await checkQuantities(admin, wanted, order.wedding_date as string, id));
  }

  // The couple's most recent styled room, so the stylist can see what they're picturing.
  let renderUrl: string | null = null;
  if (order.brief_id) {
    const { data: render } = await admin
      .from("renders")
      .select("image_path")
      .eq("brief_id", order.brief_id)
      .eq("status", "succeeded")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (render?.image_path) {
      const { data: signed } = await admin.storage.from("renders").createSignedUrl(render.image_path as string, 3600);
      renderUrl = signed?.signedUrl ?? null;
    }
  }

  return { order, lines: lines ?? [], events: events ?? [], availability, renderUrl };
}
