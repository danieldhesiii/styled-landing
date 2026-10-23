import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/session";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  if (auth.user.is_anonymous)
    return NextResponse.json(
      { venue: false, supplier: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  const admin = createAdminClient();
  // Only disclose memberships for the verified session user. These flags are
  // navigation hints; each workspace still independently authorises its APIs.
  const [venues, suppliers] = await Promise.all([
    admin
      .from("venue_users")
      .select("venue_id")
      .eq("user_id", auth.user.id)
      .limit(1),
    admin
      .from("supplier_users")
      .select("supplier_id")
      .eq("user_id", auth.user.id)
      .limit(1),
  ]);
  if (venues.error || suppliers.error)
    return NextResponse.json(
      { error: "Could not load workspaces." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  return NextResponse.json(
    { venue: !!venues.data?.length, supplier: !!suppliers.data?.length },
    { headers: { "Cache-Control": "no-store" } },
  );
}
