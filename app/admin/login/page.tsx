import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// There is no public staff sign-in. Staff (e.g. admin@styled.test) sign in through
// the normal account login on the site; once a staff account is signed in, the
// Admin dashboard shortcut appears for them. This route only exists to catch stray
// links/bookmarks: send staff on to /admin, and send everyone else to the home
// page — so there's never any indication that a staff area exists.
export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const { data } = await (await createClient()).auth.getUser();
  const user = data.user;
  if (!user || user.is_anonymous) redirect("/");

  const { data: staff } = await createAdminClient().from("staff").select("user_id").eq("user_id", user.id).maybeSingle();
  redirect(staff ? "/admin" : "/");
}
