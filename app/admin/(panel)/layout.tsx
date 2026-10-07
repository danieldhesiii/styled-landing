import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminNav from "@/components/admin/AdminNav";

// Everything under /admin. Checked on the server before any of it is sent: you
// must be a real signed-in user listed in `staff`. (The APIs each check this
// again, so the page is a convenience, never the only guard.) Anyone who isn't
// staff is sent to the home page — never to a staff login — so the admin area
// leaves no trace for ordinary visitors.
export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { data } = await (await createClient()).auth.getUser();
  const user = data.user;
  if (!user || user.is_anonymous) redirect("/");

  const { data: staff } = await createAdminClient().from("staff").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!staff) redirect("/");

  return (
    <>
      <AdminNav email={user.email ?? ""} />
      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </>
  );
}
