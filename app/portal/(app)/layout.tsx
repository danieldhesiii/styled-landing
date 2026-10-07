import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import VendorNav from "@/components/vendor/VendorNav";

// Everything in the portal except the login page. Checked on the server before
// any of it is sent: you must be a real signed-in user linked to a supplier.
// (The vendor APIs each check this again and scope to the supplier, so the page
// is a convenience, never the only guard.) Anyone else goes to the sign-in.
export const dynamic = "force-dynamic";

export default async function PortalAppLayout({ children }: { children: React.ReactNode }) {
  const { data } = await (await createClient()).auth.getUser();
  const user = data.user;
  if (!user || user.is_anonymous) redirect("/portal/login");

  const admin = createAdminClient();
  const { data: link } = await admin.from("supplier_users").select("supplier_id").eq("user_id", user.id).maybeSingle();
  if (!link) redirect("/portal/login");

  const { data: supplier } = await admin.from("suppliers").select("name").eq("id", link.supplier_id).maybeSingle();

  return (
    <>
      <VendorNav email={user.email ?? ""} supplier={supplier?.name ?? "Your business"} />
      <main className="mx-auto max-w-5xl px-5 py-8">{children}</main>
    </>
  );
}
