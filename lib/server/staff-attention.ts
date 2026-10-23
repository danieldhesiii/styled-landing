import type { SupabaseClient } from "@supabase/supabase-js";
import { buildStaffAttention, SUPPLIER_REPLY_OVERDUE_MS, type AttentionSource } from "@/lib/staff-attention";
import { CALENDAR_STALE_MS } from "@/lib/calendar-health";

// Called only after requireStaff. Read-only and bounded per source; never turn
// query failures or an incomplete sample into a misleading all-clear.
const SOURCE_LIMIT = 100;
export async function loadStaffAttention(admin: SupabaseClient, now = Date.now()) {
  const [applications, drafts, replies, calendars] = await Promise.all([
    admin.from("vendor_applications").select("id,business_name,status,created_at")
      .in("status", ["new", "reviewing"]).order("created_at").order("id").limit(SOURCE_LIMIT + 1),
    admin.from("venue_listing_drafts").select("venue_id,status,updated_at,venue_listings(name)")
      .in("status", ["draft", "submitted"]).order("updated_at").order("venue_id").limit(SOURCE_LIMIT + 1),
    admin.from("order_lines").select("id,order_id,supplier_id,supplier_name,supplier_status,created_at,orders!inner(reference,status,updated_at)")
      .eq("supplier_status", "pending").eq("orders.status", "requested")
      .lte("created_at", new Date(now - SUPPLIER_REPLY_OVERDUE_MS).toISOString())
      .order("created_at").order("id").limit(SOURCE_LIMIT + 1),
    admin.from("suppliers").select("id,name,active,ical_url,ical_synced_at")
      .eq("active", true).not("ical_url", "is", null)
      .or(`ical_synced_at.is.null,ical_synced_at.lte.${new Date(now - CALENDAR_STALE_MS).toISOString()},ical_synced_at.gt.${new Date(now).toISOString()}`)
      .order("ical_synced_at", { nullsFirst: true }).order("id").limit(SOURCE_LIMIT + 1),
  ]);
  if ([applications, drafts, replies, calendars].some((r) => r.error)) {
    throw new Error("Could not load the full attention queue. Please retry.");
  }
  const results = { applications, drafts, replies, calendars };
  const truncatedSources = Object.entries(results).filter(([, r]) => (r.data?.length ?? 0) > SOURCE_LIMIT).map(([name]) => name);
  // Supabase's untyped relationship inference can report arrays; these FK joins
  // are many-to-one in the existing schema (one venue/order per source row).
  const source = Object.fromEntries(Object.entries(results).map(([name, r]) => [name, (r.data ?? []).slice(0, SOURCE_LIMIT)])) as unknown as AttentionSource;
  return { items: buildStaffAttention(source, now), checkedAt: new Date(now).toISOString(), truncatedSources, sourceLimit: SOURCE_LIMIT };
}
