export type OpenRequest = {id:string;reference:string;status:string;created_at:string;wedding_date:string|null};
export type RequestWorkflow = {order_id:string;current_quote_id:string|null};
export type RequestQuote = {id:string;status:string;expires_at:string};
export function requestAttention(orders:OpenRequest[], workflows:RequestWorkflow[], quotes:RequestQuote[], now=Date.now()) {
 const current=new Map(workflows.map(w=>[w.order_id,w.current_quote_id]));
 const byId=new Map(quotes.map(q=>[q.id,q]));
 return orders.flatMap(o=>{
  if(o.status!=='requested')return [];
  const q=byId.get(current.get(o.id)||'');
  const expired=q&&['issued','accepted'].includes(q.status)&&Date.parse(q.expires_at)<=now;
  const age=Math.max(0,Math.floor((now-Date.parse(o.created_at))/86400000));
  if(!expired&&(!Number.isFinite(age)||age<7))return [];
  return [{id:o.id,reference:o.reference,eventDate:o.wedding_date,ageDays:age,
   reason:expired?'quote_expired' as const:'awaiting_review' as const,
   expiresAt:expired?q.expires_at:null}];
 });
}
