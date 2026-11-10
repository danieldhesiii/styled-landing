import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Who counts as staff: a real (not guest) signed-in user with a row in the
// `staff` table. Added with `npm run staff:add`; there is no way to become staff
// from the website. Every /api/admin route starts with requireStaff().

export type StaffAuth =
  | { ok: true; user: User; admin: SupabaseClient; actor: { id: string; label: string } }
  | { ok: false; response: NextResponse };

const deny = (status: number, error: string): StaffAuth => ({
  ok: false,
  response: NextResponse.json({ ok: false, error }, { status }),
});

export async function requireStaff(req: Request): Promise<StaffAuth> {
  // Cookie-authenticated writes must come from our own pages. Browsers send an
  // Origin header on cross-site POST/PUT/PATCH/DELETE, so a mismatch is refused.
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    try { if (origin && new URL(origin).host !== (host || new URL(req.url).host)) return deny(403, "Cross-site request refused."); } catch { return deny(403, "Invalid origin."); }
    if (!(req.headers.get("content-type") ?? "").includes("application/json")) {
      return deny(415, "Send JSON.");
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  const user = data.user;
  if (error || !user || user.is_anonymous || !user.email || !user.email_confirmed_at) return deny(401, "Sign in with a verified email address.");

  const admin = createAdminClient();
  const { data: row } = await admin.from("staff").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!row) return deny(403, "This account doesn't have staff access.");

  return { ok: true, user, admin, actor: { id: user.id, label: user.email ?? user.id } };
}

export async function logOrderEvent(
  admin: SupabaseClient,
  orderId: string,
  actor: { id: string; label: string },
  type: string,
  detail: Record<string, unknown> = {}
) {
  const { error } = await admin
    .from("order_events")
    .insert({ order_id: orderId, actor_id: actor.id, actor_label: actor.label, type, detail });
  if (error) console.error(`[staff] couldn't log ${type} for order ${orderId}:`, error);
}
