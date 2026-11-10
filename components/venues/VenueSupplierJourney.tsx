import Link from "next/link";
import {VENUE_MODES,type VenueSupplierPolicy} from "@/lib/venue-suppliers";
export default function VenueSupplierJourney({name,slug,policy,inStudio=false,onContact}:{name:string;slug:string;policy:VenueSupplierPolicy;inStudio?:boolean;onContact?:()=>void}){
 const Heading=inStudio?"h1":"h2";
 return <section id="suppliers" className={`${inStudio?"rounded-2xl border border-sand bg-white p-5":"mt-12 scroll-mt-24 border-t border-sand pt-8"}`}>
 <p className="text-sm uppercase tracking-widest text-clay">Suppliers for {name}</p><Heading className="mt-3 font-serif text-3xl">{VENUE_MODES[policy.mode]}</Heading>
 <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink/65">{policy.mode==="venue_only"?"Ask the venue about its recommended suppliers, prices and availability. Products are arranged outside Styled’s catalogue.":policy.mode==="venue_partners"?"Browse venue-approved Styled suppliers. The venue’s own recommendations are listed separately.":"Browse Styled products or the venue’s recommendations below."}</p>
 {policy.localNotes&&<p className="mt-3 whitespace-pre-line text-sm text-ink/70">{policy.localNotes}</p>}
 {policy.localRadiusMiles&&policy.mode!=="venue_only"&&<p className="mt-3 text-sm text-ink/60">Catalogue limited to suppliers with a verified location within {policy.localRadiusMiles} miles. Approximate straight-line distance; delivery still needs confirmation.</p>}
 {policy.suppliers.length>0&&<ul className="mt-5 divide-y divide-sand">{policy.suppliers.map((s,i)=><li key={i} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><h3 className="text-sm font-medium">{s.name}</h3><p className="mt-1 text-sm text-ink/60">{[s.category,s.location,s.postcode].filter(Boolean).join(" · ")||"Location details available from the venue"}</p></div>{s.website&&<a className="inline-flex min-h-11 items-center text-sm underline" href={s.website} target="_blank" rel="noopener noreferrer">Visit supplier ↗</a>}</li>)}</ul>}
 {policy.mode==="venue_only"&&!policy.suppliers.length&&<p className="mt-4 text-sm text-ink/65">Ask the venue for its current local supplier list.</p>}
 <div className="mt-5 flex flex-wrap gap-5 text-sm">{onContact?<button type="button" onClick={onContact} className="inline-flex min-h-11 items-center underline">Open your venue conversation →</button>:<Link href={`/venues/${slug}#enquire`} className="inline-flex min-h-11 items-center underline">Contact the venue team →</Link>}{policy.mode!=="venue_only"&&!inStudio&&<Link href={`/design?venue=${encodeURIComponent(slug)}&tab=catalogue`} className="inline-flex min-h-11 items-center rounded-full bg-ink px-5 py-3 text-cream">{policy.mode==="venue_partners"?"Browse venue-approved products":"Browse Styled catalogue"} →</Link>}{policy.bookingUrl&&<a href={policy.bookingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center underline">Open venue booking system ↗</a>}</div>
 {onContact&&<p className="mt-3 text-sm text-ink/60">Venue hire and product requests need separate confirmation.</p>}
 {policy.bookingNotes&&<p className="mt-3 whitespace-pre-line text-sm text-ink/65">{policy.bookingNotes}</p>}
 {policy.bookingUrl&&<p className="mt-2 text-sm text-ink/60">External booking system: no date reservation or sync with Styled.</p>}
 </section>;
}
