"use client";
import {useState} from "react";
import Link from "next/link";
import type {VenueListing} from "@/lib/venues";
import {venuePolicy, VENUE_MODES} from "@/lib/venue-suppliers";
import {dateRangeLabel} from "@/lib/booking-dates";
import {demoAlternativeDay, demoVenueRequestError, type DemoVenueRequest} from "@/lib/demo-venue-booking";

const field = "mt-2 min-h-11 w-full rounded-xl border border-sand bg-white p-3 text-ink";
const button = "inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-5 py-3 text-sm text-cream";
const secondary = "inline-flex min-h-11 items-center justify-center rounded-full border border-sand px-5 py-3 text-sm";
type Stage = "draft" | "requested" | "alternative" | "agreed" | "cancelled";
export default function DemoVenueBooking({venue}: {venue: VenueListing}) {
  const policy = venuePolicy(venue.details);
  const [request, setRequest] = useState<DemoVenueRequest>({start:"",end:"",guests:"80",message:""});
  const [stage,setStage] = useState<Stage>("draft");
  const [view,setView] = useState<"customer"|"team">("customer");
  const [error,setError] = useState("");
  const today = new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/London",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const update = (key: keyof DemoVenueRequest, value:string) => setRequest(r=>({...r,[key]:value}));
  const reset = () => {setStage("draft");setView("customer");setError("");};
  return <div className="max-w-3xl">
    <p className="text-sm uppercase tracking-widest text-clay">Practice booking</p>
    <h2 className="mt-3 font-serif text-3xl sm:text-4xl">Try booking {venue.name}</h2>
    <p className="mt-4 text-sm leading-relaxed text-ink/65">Practice only: no emails, payment or reservation. Resets when you leave.</p>
    <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Demo perspective">
      <button type="button" aria-pressed={view==="customer"} onClick={()=>setView("customer")} className={view==="customer"?button:secondary}>Customer view</button>
      <button type="button" aria-pressed={view==="team"} onClick={()=>setView("team")} className={view==="team"?button:secondary}>Venue team view</button>
    </div>
    <div className="mt-6 rounded-2xl border border-sand bg-white p-5 sm:p-7">
      {view==="customer" && stage==="draft" ? <form onSubmit={e=>{e.preventDefault();const problem=demoVenueRequestError(request,venue.capacity_min||1,venue.capacity_max||10000,today);setError(problem||"");if(!problem)setStage("requested");}}>
        <h3 className="font-serif text-2xl">Request your dates</h3>
        <p className="mt-2 text-sm text-ink/60">Choose the full venue hire period, including setup and clearing away if needed.</p>
        <button type="button" className="mt-3 inline-flex min-h-11 items-center text-sm text-clay underline" onClick={()=>{const d=new Date(`${today}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+90);const start=d.toISOString().slice(0,10);d.setUTCDate(d.getUTCDate()+1);setRequest(r=>({...r,start,end:d.toISOString().slice(0,10)}));setError("");}}>Use example dates</button>
        <div className="mt-3 grid gap-5 sm:grid-cols-2">
          <label className="text-sm">Venue hire starts<input type="date" required min={today} value={request.start} onChange={e=>setRequest(r=>({...r,start:e.target.value,end:!r.end||r.end<e.target.value?e.target.value:r.end}))} className={field}/></label>
          <label className="text-sm">Venue hire ends<input type="date" required min={request.start||today} value={request.end} onChange={e=>update("end",e.target.value)} className={field}/></label>
          <label className="text-sm">Number of guests<input type="text" inputMode="numeric" required value={request.guests} onChange={e=>update("guests",e.target.value.replace(/\D/g,""))} className={field}/><span className="mt-2 block text-sm text-ink/60">{venue.capacity_min} to {venue.capacity_max} guests</span></label>
        </div>
        <label className="mt-5 block text-sm">A note for the venue (optional)<textarea maxLength={1000} value={request.message} onChange={e=>update("message",e.target.value)} placeholder="For example, a ceremony followed by a reception" rows={3} className={field}/></label>
        {error&&<p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
        <button type="submit" className={`mt-6 ${button}`}>Send practice request</button>
        <p className="mt-3 text-sm text-ink/60">No real availability is checked. Nothing is added to My bookings.</p>
      </form> : view==="team" && stage==="draft" ? <div><h3 className="font-serif text-2xl">Your example request inbox</h3><p className="mt-3 text-sm text-ink/65">No practice request yet. Start in Customer view and choose a date to see it arrive here.</p><button className={`mt-5 ${button}`} onClick={()=>setView("customer")}>Try the customer form</button></div> : <>
        <p className="text-sm uppercase tracking-widest text-clay">{view==="team"?"Example venue inbox":"Example booking request"} · Demo only</p>
        <h3 role="status" className="mt-3 font-serif text-2xl">{stage==="requested"?"Awaiting venue response":stage==="alternative"?"Another date suggested":stage==="agreed"?"Example arrangements agreed":"Practice request cancelled"}</h3>
        <dl className="mt-5 grid gap-4 border-y border-sand py-5 text-sm sm:grid-cols-2"><div><dt className="text-ink/60">Customer</dt><dd className="mt-1">Alex &amp; Sam (fictional)</dd></div><div><dt className="text-ink/60">Venue hire period</dt><dd className="mt-1">{dateRangeLabel(request.start,request.end)}</dd></div><div><dt className="text-ink/60">Guests</dt><dd className="mt-1">{request.guests}</dd></div><div><dt className="text-ink/60">Supplier arrangement</dt><dd className="mt-1">{VENUE_MODES[policy.mode]}</dd></div></dl>
        {request.message&&<p className="mt-4 whitespace-pre-line break-words text-sm">{request.message}</p>}
        {stage==="requested" && (view==="customer"?<><p className="mt-5 text-sm text-ink/65">Switch to Venue team view to try a reply.</p><button className={`mt-5 ${button}`} onClick={()=>setView("team")}>See the venue team’s side</button><button className={`ml-2 mt-3 ${secondary}`} onClick={()=>setStage("cancelled")}>Cancel practice request</button></>:<><p className="mt-5 text-sm text-ink/65">Simulate the venue’s reply.</p><div className="mt-5 flex flex-wrap gap-3"><button className={button} onClick={()=>{setStage("agreed");setView("customer");}}>Simulate agreement</button><button className={secondary} onClick={()=>{setStage("alternative");setView("customer");}}>Suggest a week later</button></div></>)}
        {stage==="alternative"&&<><p className="mt-5 text-sm">Example suggestion: {dateRangeLabel(demoAlternativeDay(request.start),demoAlternativeDay(request.end))}. The customer must agree before the venue confirms.</p><button className={`mt-5 ${button}`} onClick={()=>{setRequest(r=>({...r,start:demoAlternativeDay(r.start),end:demoAlternativeDay(r.end)}));setStage("requested");}}>Request the suggested dates</button></>}
        {stage==="agreed"&&<div className="mt-6"><h4 className="font-serif text-2xl">What happens next?</h4><p className="mt-3 text-sm leading-relaxed text-ink/65">{policy.mode==="venue_only"?"You stay with the venue team and its own local supplier network. You are not sent to the Styled catalogue.":policy.mode==="venue_partners"?"You explore only the venue’s approved suppliers on Styled. Other Styled suppliers are not recommended for this venue.":"You can explore the wider Styled catalogue, subject to the venue’s local preferences. Product requests are separate from venue hire."}</p>
          <ul className="mt-5 divide-y divide-sand border-y border-sand">{(policy.mode==="styled"?[{name:"Styled catalogue (example onward journey)",category:"Browse products from participating suppliers",location:"Local preferences apply"}]:policy.suppliers).map(s=><li key={s.name} className="py-4 text-sm"><p className="font-medium">{s.name}</p><p className="mt-1 text-ink/60">{s.category} · {s.location}</p></li>)}</ul>
          <p className="mt-4 text-sm leading-relaxed text-ink/60">Demo complete. Nothing is booked. Real venue hire and products need separate agreements.</p>
        </div>}
        <button type="button" className="mt-6 inline-flex min-h-11 items-center text-sm underline" onClick={reset}>Start a new practice request</button>
      </>}
    </div>
    <Link href="/venues#demo-venues" className="mt-5 inline-flex min-h-11 items-center text-sm underline">Try a different demo venue →</Link>
  </div>;
}
