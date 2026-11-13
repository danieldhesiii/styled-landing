"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
type Row={id:string;reference:string;reason:'quote_expired'|'awaiting_review';ageDays:number;eventDate:string|null;expiresAt:string|null};
export default function RequestAttention(){
 const [data,setData]=useState<{requests:Row[];truncated:boolean}|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(false);
 const requested=useRef(false);
 const load=useCallback(async()=>{setLoading(true);setError('');try{const r=await fetch('/api/admin/request-attention',{cache:'no-store'}),d=await r.json();if(!r.ok)throw Error(d.error||'Could not load requests.');setData(d);}catch(e){setError(e instanceof Error?e.message:'Could not load requests.');}finally{setLoading(false);}},[]);
 useEffect(()=>{if(!requested.current){requested.current=true;void load();}},[load]);
 return <details className="mt-8 border-t border-sand pt-3"><summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">Stock checks needing review <span aria-live="polite">{loading&&!data?'(checking…)':data?`(${data.truncated?'100+':data.requests.length})`:''}</span></summary>
 <p className="mt-3 text-sm leading-relaxed text-ink/65">Review expired quotes and requests older than seven days; they may still hold stock.</p>
 <button disabled={loading} onClick={()=>void load()} className="mt-4 min-h-11 rounded-full border border-sand px-4 text-sm disabled:opacity-50">{loading?'Checking requests…':'Refresh requests'}</button>
 {error&&<p className="mt-3 text-sm" role="alert">{error}</p>}
 {data&&<><ul className="mt-4 divide-y divide-sand">{data.requests.map(r=><li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm"><div><p className="font-medium">{r.reference}</p><p className="mt-1 text-ink/65">{r.reason==='quote_expired'?'Current quote has expired':'Open request needs a follow-up'} · {r.ageDays} days since request</p>{r.eventDate&&<p className="mt-1 text-xs text-ink/55">Event: {r.eventDate}</p>}</div><Link href={`/admin/orders/${r.id}`} className="inline-flex min-h-11 items-center underline">Review request →</Link></li>)}</ul>{!data.requests.length&&<p className="mt-4 text-sm text-ink/60">No expired quotes or older open requests in this view.</p>}{data.truncated&&<p className="mt-3 text-xs text-clay">Showing the oldest 100 open requests. Review the order queue for the remaining requests.</p>}</>}
 <p className="mt-4 text-xs leading-relaxed text-ink/60">Check with the customer and supplier before renewing or closing. A dated request counts against Styled stock through the return day. A supplier decline releases that item; cancellation releases the request. Quote expiry alone does neither. Check the supplier’s own diary before promising availability.</p>
 </details>;
}
