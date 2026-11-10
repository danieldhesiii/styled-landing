export type TrackerStage = "waiting" | "partial" | "attention" | "quote_pending" | "quote_ready" | "closed";
export const TRACKER_STAGES: Record<TrackerStage,string> = {waiting:"Waiting for supplier",partial:"Partial reply",attention:"Alternative needed",quote_pending:"Awaiting full quote",quote_ready:"Quote to review",closed:"Closed example"};
export type TrackerLine={id:string;name:string;quantity:number;status:string;start:string|null;end:string|null;note:string|null;priceOnRequest?:boolean;requestOnly?:boolean};
export type TrackerRequest={id:string;orderId:string;supplierId?:string|null;reference:string;customer:string;venue:string;createdAt:string;supplier:string;stage:TrackerStage;lastReplyAt:string|null;lines:TrackerLine[];owner:string;followUp:string;events:{at:string;text:string}[]};
export type TrackerOrder={id:string;reference:string;couple_name:string;venue_label:string|null;created_at:string;wedding_date:string|null;order_lines:{id:string;supplier_id:string|null;supplier_name:string;product_name:string;quantity:number;supplier_status:string;supplier_decided_at:string|null;supplier_note:string|null;needed_date:string|null;return_date:string|null;request_snapshot?:{priceOnRequest?:boolean};line_total_pence?:number|null}[]};
export function trackerStage(lines:TrackerLine[]):TrackerStage{
 if(lines.some(l=>l.status==="declined"))return "attention";
 if(lines.length&&lines.every(l=>!l.requestOnly&&l.status==="confirmed"))return "quote_pending";
 if(lines.some(l=>l.status==="confirmed"))return "partial";
 return "waiting";
}
export function trackerRequests(orders:TrackerOrder[]):TrackerRequest[]{
 return orders.flatMap(o=>{
  const groups=new Map<string,TrackerOrder["order_lines"]>();
  for(const l of o.order_lines||[]){const key=l.supplier_id||`unlinked:${l.supplier_name}`;groups.set(key,[...(groups.get(key)||[]),l]);}
  return [...groups].map(([key,ls])=>{
   const lines=ls.map(l=>({id:l.id,name:l.product_name,quantity:l.quantity,status:l.supplier_status,start:l.needed_date||o.wedding_date,end:l.return_date||o.wedding_date,note:l.supplier_note,requestOnly:!!l.request_snapshot,priceOnRequest:l.line_total_pence===null||!!l.request_snapshot?.priceOnRequest}));
   const replies=ls.filter(l=>l.supplier_decided_at&&l.supplier_status!=="pending").map(l=>l.supplier_decided_at!).sort();
   return {id:`${o.id}:${key}`,orderId:o.id,supplierId:ls[0].supplier_id,reference:o.reference,customer:o.couple_name,venue:o.venue_label||"Venue to confirm",createdAt:o.created_at,supplier:ls[0].supplier_name,stage:trackerStage(lines),lastReplyAt:replies.at(-1)||null,lines,owner:"",followUp:"",events:[]};
  });
 });
}
export function needsFollowUp(r:TrackerRequest,now:number,hours:number):boolean{
 if(["closed","quote_ready"].includes(r.stage))return false;
 if(r.followUp)return r.followUp<=new Date(now).toISOString().slice(0,10);
 const since=Date.parse(r.lastReplyAt||r.createdAt);
 return Number.isFinite(since)&&now-since>=hours*3600000;
}
export function trackerExamples(now=Date.now()):TrackerRequest[]{
 const at=(h:number)=>new Date(now-h*3600000).toISOString();
 const day=(n:number)=>new Date(now+n*86400000).toISOString().slice(0,10);
 const rows:[string,string,TrackerStage,string,number][]=[
  ["EX-1042","Meadow Floral Hire (fictional)","waiting","Alex & Sam",68],
  ["EX-1042","Lantern House Lighting (fictional)","partial","Alex & Sam",68],
  ["EX-1043","Gather Tableware (fictional)","quote_pending","Imani & Theo",12],
  ["EX-1044","Oak Furniture Hire (fictional)","attention","Priya & Lucas",40],
  ["EX-1045","Willow Styling (fictional)","quote_ready","Freya & Morgan",6],
 ];
 return rows.map(([reference,supplier,stage,customer],i)=>({id:`example-${i}`,orderId:`example-order-${reference}`,reference,customer,supplier,venue:i<2?"Example garden venue":"Example barn venue",stage,createdAt:at(rows[i][4]),lastReplyAt:stage==="waiting"?null:at(i===1?52:4),owner:i===1?"Dan":"",followUp:i===1?day(-1):"",events:[{at:at(rows[i][4]),text:"Fictional request created. No notification sent."}],lines:[{id:`example-line-${i}`,name:i===0?"White floral package":i===1?"Chandelier and stand":i===2?"Place setting package":i===3?"Oak crossback chairs":"Welcome display",quantity:i===3?80:1,status:stage==="waiting"?"pending":stage==="attention"?"declined":"confirmed",start:day(90),end:day(92),note:stage==="attention"?"Example: unavailable on Saturday; offer a different chair range.":null},...(stage==="partial"?[{id:"example-extra",name:"Installation crew",quantity:1,status:"pending",start:day(90),end:day(92),note:null}]:[])]}));
}

export type TrackingEvent={order_id:string;created_at:string;actor_label:string;detail:{supplierId?:string;owner?:string;followUp?:string;note?:string}};
export function applyTrackingEvents(rows:TrackerRequest[],events:TrackingEvent[]):TrackerRequest[]{
 return rows.map(r=>{const history=events.filter(e=>e.order_id===r.orderId&&e.detail?.supplierId===r.supplierId).sort((a,b)=>a.created_at.localeCompare(b.created_at));const latest=history.at(-1);return {...r,owner:latest?.detail.owner||"",followUp:latest?.detail.followUp||"",events:history.map(e=>({at:e.created_at,text:`${e.actor_label}: assigned to ${e.detail.owner||"Unassigned"}; follow-up ${e.detail.followUp||"not set"}.${e.detail.note?` Internal note: ${e.detail.note}`:""}`}))};});
}
export function parseTrackingUpdate(raw:unknown){
 if(!raw||typeof raw!=="object")throw Error("Send the follow-up details.");
 const b=raw as Record<string,unknown>,uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 if(typeof b.orderId!=="string"||!uuid.test(b.orderId)||typeof b.supplierId!=="string"||!uuid.test(b.supplierId))throw Error("Choose a linked supplier request.");
 if(typeof b.owner!=="string"||!["","Kamil","Dan"].includes(b.owner))throw Error("Choose an assignment.");
 if(typeof b.followUp!=="string"||(b.followUp!==""&&(!/^\d{4}-\d{2}-\d{2}$/.test(b.followUp)||!Number.isFinite(Date.parse(b.followUp+"T12:00:00Z"))||new Date(b.followUp+"T12:00:00Z").toISOString().slice(0,10)!==b.followUp)))throw Error("Choose a valid follow-up date.");
 if(typeof b.note!=="string"||b.note.length>1000)throw Error("Keep the internal note under 1,000 characters.");
 return {orderId:b.orderId,supplierId:b.supplierId,owner:b.owner,followUp:b.followUp,note:b.note.trim()};
}
