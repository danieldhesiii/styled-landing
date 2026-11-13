import Link from "next/link";
import SkipLink from "@/components/ui/SkipLink";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import Inbox from "@/components/messages/Inbox";
export const dynamic="force-dynamic";
export const metadata={title:"Messages · Styled",robots:{index:false,follow:false}};
export default async function Messages({searchParams}:{searchParams:Promise<{supplier?:string}>}) {
  const {supplier=""}=await searchParams;
  const {data}=await (await createClient()).auth.getUser();
  if(!data.user||data.user.is_anonymous) redirect("/login?mode=login&next="+encodeURIComponent("/messages"+(supplier?"?supplier="+encodeURIComponent(supplier):"")));
  return (
    <>
      <SkipLink />
      <header className="border-b border-sand bg-cream">
        <nav aria-label="Wedding workspace" className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <Link href="/design?tab=wedding" aria-label="Styled wedding plan" className="inline-flex min-h-11 items-center font-serif text-3xl text-ink">
            Styled<span className="text-clay">.</span>
          </Link>
          <Link href="/design?tab=wedding" className="inline-flex min-h-11 items-center gap-2 text-sm text-ink underline-offset-4 hover:underline">
            <span aria-hidden="true">←</span> Back to my wedding plan
          </Link>
        </nav>
      </header>
      <main id="main-content" tabIndex={-1} className="mx-auto w-full min-w-0 max-w-6xl px-5 py-8 sm:py-12">
        <Inbox key={supplier || "inbox"} initialSupplier={supplier} />
      </main>
    </>
  );
}
