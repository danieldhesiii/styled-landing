"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {SupportButton} from "@/components/support/SupportProvider";
import {createClient} from "@/lib/supabase/client";

const links=[
  {href:"/portal/products",label:"Products",matches:(p:string)=>p.startsWith("/portal/products")||p.startsWith("/portal/import")},
  {href:"/portal/inbox",label:"Inbox",matches:(p:string)=>p.startsWith("/portal/inbox")},
  {href:"/portal/requests",label:"Bookings",matches:(p:string)=>p.startsWith("/portal/requests")},
  {href:"/portal/business",label:"Settings",matches:(p:string)=>p.startsWith("/portal/business")||p.startsWith("/portal/availability")},
];
export default function VendorNav({supplier}:{email:string;supplier:string}) {
  const pathname=usePathname();
  const [unread,setUnread]=useState(0);
  useEffect(()=>{
    let live=true;
    async function load(){
      try {
        const r=await fetch("/api/messages?workspace=supplier",{cache:"no-store"});
        if(r.ok){const d=await r.json();if(live)setUnread(d.unreadCount||0);}
      } catch {}
    }
    void load();
    const timer=setInterval(()=>{if(!document.hidden)void load();},15000);
    return ()=>{live=false;clearInterval(timer);};
  },[pathname]);
  return <header className="sticky top-0 z-30 border-b border-sand bg-cream/95 backdrop-blur">
    <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-5 px-5 py-4">
      <Link href="/portal" className="font-serif text-3xl tracking-tight">Styled<span className="text-clay">.</span><span className="ml-3 align-middle font-sans text-xs tracking-normal text-ink/50">Suppliers</span></Link>
      <nav aria-label="Supplier" className="ml-5 hidden items-center gap-7 md:flex">{links.map(link=><Link key={link.href} href={link.href} aria-current={link.matches(pathname)?"page":undefined} className={`min-h-11 border-b py-3 text-sm transition-colors ${link.matches(pathname)?"border-ink text-ink":"border-transparent text-ink/55 hover:text-ink"}`}>{link.label}{link.label==="Inbox"&&unread>0&&<span className="ml-1 text-xs" aria-label={unread+" unread conversations"}>({unread})</span>}</Link>)}</nav>
      <div className="ml-auto flex items-center gap-4 text-sm"><span className="hidden max-w-40 truncate text-ink/50 xl:block">{supplier}</span><SupportButton label="Help" className="min-h-11 text-ink/65 underline underline-offset-4"/><button onClick={async()=>{await createClient().auth.signOut();window.location.assign("/portal/login");}} className="min-h-11 text-ink/65">Sign out</button></div>
      <nav aria-label="Supplier mobile" className="flex w-full justify-between gap-2 border-t border-sand pt-3 md:hidden">{links.map(link=><Link key={link.href} href={link.href} aria-current={link.matches(pathname)?"page":undefined} className={`min-h-11 flex-1 rounded-lg px-2 py-3 text-center text-sm ${link.matches(pathname)?"bg-ink text-cream":"text-ink/60"}`}>{link.label}{link.label==="Inbox"&&unread>0&&<span className="ml-1 text-xs" aria-label={unread+" unread conversations"}>({unread})</span>}</Link>)}</nav>
    </div>
  </header>;
}
