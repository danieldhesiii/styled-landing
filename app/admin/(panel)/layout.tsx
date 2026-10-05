import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminNav from "@/components/admin/AdminNav";

// Everything under /admin except the login page. Checked on the server before any
// of it is sent: you must be a real signed-in user listed in `staff`. (The APIs
// each check this again, so the page is a convenience, never the only guard.)
export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { data } = await (await createClient()).auth.getUser();
  const user = data.user;
  if (!user || user.is_anonymous) redirect("/admin/login");

  const { data: staff } = await createAdminClient().from("staff").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!staff) redirect("/admin/login?denied=1");

  return (
    <>
      <AdminNav email={user.email ?? ""} />
      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </>
  );
}
