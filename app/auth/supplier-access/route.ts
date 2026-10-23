import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
export const dynamic = "force-dynamic";
const reply = (status: number) => NextResponse.json({ ok: status === 200 }, { status, headers: { "Cache-Control": "no-store" } });
/** Same supplier_users membership rule as requireVendor; no role changes or provisioning. */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) return reply(error.status && [400, 401, 403].includes(error.status) ? 401 : 503);
    if (!user || user.is_anonymous) return reply(401);
    const admin = createAdminClient();
    const link = await admin.from("supplier_users").select("supplier_id").eq("user_id", user.id).maybeSingle();
    if (link.error) return reply(503);
    if (!link.data) return reply(403);
    const supplier = await admin.from("suppliers").select("id").eq("id", link.data.supplier_id).maybeSingle();
    if (supplier.error) return reply(503);
    return reply(supplier.data ? 200 : 403);
  } catch { return reply(503); }
}
