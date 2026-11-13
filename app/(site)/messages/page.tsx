import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import Inbox from "@/components/messages/Inbox";
export const dynamic="force-dynamic";
export const metadata={title:"Messages · Styled",robots:{index:false,follow:false}};
export default async function Messages({searchParams}:{searchParams:Promise<{supplier?:string}>}) {
  const {supplier=""}=await searchParams;
  const {data}=await (await createClient()).auth.getUser();
  if(!data.user||data.user.is_anonymous) redirect("/login?mode=login&next="+encodeURIComponent("/messages"+(supplier?"?supplier="+encodeURIComponent(supplier):"")));
  return <div className="py-8 sm:py-12"><Inbox key={supplier||"inbox"} initialSupplier={supplier}/></div>;
}
