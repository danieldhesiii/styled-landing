import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VenuePortal from "@/components/venues/VenuePortal";
export const dynamic = "force-dynamic";
export const metadata = { title: "Your venue workspace · Styled" };
export default async function Page() {
  const { data } = await (await createClient()).auth.getUser();
  if (!data.user || data.user.is_anonymous)
    redirect("/login?next=/venue-portal");
  return <VenuePortal />;
}
