import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Who counts as a vendor: a real (not guest) signed-in user with a row in
// `supplier_users`, which links them to exactly one supplier. Linked by staff in
// the admin; there is no self-registration. Every /api/vendor route starts with
// requireVendor() and then scopes every query to `supplierId`.

export type VendorAuth =
  | {
      ok: true;
      user: User;
      admin: SupabaseClient;
      supplierId: string;
      supplier: { id: string; name: string; active: boolean };
      actor: { id: string; label: string };
    }
  | { ok: false; response: NextResponse };

const deny = (status: number, error: string): VendorAuth => ({
  ok: false,
  response: NextResponse.json({ ok: false, error }, { status }),
});

export async function requireVendor(req: Request): Promise<VendorAuth> {
  // Cookie-authenticated writes must come from our own pages (same guard as staff).
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    if (origin && host && new URL(origin).host !== host) return deny(403, "Cross-site request refused.");
    if (!(req.headers.get("content-type") ?? "").includes("application/json")) {
      return deny(415, "Send JSON.");
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  const user = data.user;
  if (error || !user || user.is_anonymous) return deny(401, "Please sign in.");

  const admin = createAdminClient();
  const { data: link } = await admin.from("supplier_users").select("supplier_id").eq("user_id", user.id).maybeSingle();
  if (!link) return deny(403, "This account isn't linked to a supplier.");

  const { data: supplier } = await admin
    .from("suppliers")
    .select("id, name, active")
    .eq("id", link.supplier_id)
    .maybeSingle();
  if (!supplier) return deny(403, "Your supplier account is no longer available.");

  return {
    ok: true,
    user,
    admin,
    supplierId: supplier.id,
    supplier: { id: supplier.id, name: supplier.name, active: supplier.active },
    actor: { id: user.id, label: user.email ?? user.id },
  };
}
