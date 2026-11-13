import Link from "next/link";
export default function SupplierHome() {
  return <section className="py-3 sm:py-8">
    <p className="text-sm text-ink/50">Your supplier workspace</p>
    <h1 className="mt-3 max-w-xl font-serif text-4xl leading-tight sm:text-5xl">Everything for your catalogue, in one place.</h1>
    <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink/60">Start with your products. When customers get in touch, their conversations and booking requests will be here.</p>
    <div className="mt-8 grid gap-4 md:grid-cols-3">
      {[
        {href:"/portal/products",title:"Your products",text:"Add photos, descriptions and prices.",action:"Manage products",primary:true},
        {href:"/portal/inbox",title:"Inbox",text:"Read and reply to customer messages.",action:"Open inbox",primary:false},
        {href:"/portal/requests",title:"Bookings",text:"Check dates and respond to requests.",action:"View bookings",primary:false},
      ].map(card=><Link key={card.href} href={card.href} className={`group flex min-h-52 flex-col rounded-2xl border p-6 transition-colors ${card.primary?"border-ink bg-ink text-cream":"border-sand bg-white hover:border-clay/50"}`}>
        <h2 className="font-serif text-3xl">{card.title}</h2><p className="mt-3 text-sm leading-relaxed opacity-65">{card.text}</p><span className="mt-auto pt-6 text-sm underline underline-offset-4">{card.action} →</span>
      </Link>)}
    </div>
    <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-sand pt-6 text-sm"><p className="text-ink/55">New here? Add your business details before submitting your range.</p><Link href="/portal/business" className="underline underline-offset-4">Business settings</Link></div>
  </section>;
}
