import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MyVenueRequests from "@/components/venues/MyVenueRequests";
export const dynamic = "force-dynamic";
export const metadata = { title: "Your venue requests · Styled" };
export default async function Page() {
  const { data } = await (await createClient()).auth.getUser();
  if (!data.user || data.user.is_anonymous)
    redirect("/login?next=/venues/requests");
  return <MyVenueRequests />;
}
