import {NextResponse} from "next/server";
import {requireStaff} from "@/lib/server/staff";
import {deliverySummary,trackerRequests,applyTrackingEvents,parseTrackingUpdate,type TrackingEvent,type TrackerOrder} from "@/lib/request-tracker";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store"};
export async function GET(req:Request){
 const auth=await requireStaff(req);
 if(!auth.ok)return auth.response;
 const {data,error}=await auth.admin.from("orders").select("id,reference,couple_name,venue_label,created_at,wedding_date,order_lines(id,supplier_id,supplier_name,product_name,quantity,supplier_status,supplier_decided_at,supplier_note,needed_date,return_date,request_snapshot,line_total_pence)").eq("status","requested").order("created_at",{ascending:true}).limit(101);
 if(error)return NextResponse.json({ok:false,error:"Could not load the request tracker. Please try again."},{status:500,headers});
 const rows=(data||[]) as unknown as TrackerOrder[];
 const loaded=rows.slice(0,100);let events:TrackingEvent[]=[];let historyTruncated=false;
 if(loaded.length){const history=await auth.admin.from("order_events").select("order_id,created_at,actor_label,detail").eq("type","supplier_tracking").in("order_id",loaded.map(o=>o.id)).order("created_at",{ascending:false}).limit(1001);if(history.error)return NextResponse.json({ok:false,error:"Could not load saved follow-ups. Please retry."},{status:500,headers});events=(history.data||[]).slice(0,1000) as TrackingEvent[];historyTruncated=(history.data||[]).length>1000;}
 const notices=loaded.length?await auth.admin.from("supplier_order_notices").select("order_id,supplier_id,delivery,part_count,reply_due_at,created_at,order_phone_parts(state)").in("order_id",loaded.map(o=>o.id)):{data:[],error:null};
 if(notices.error)return NextResponse.json({ok:false,error:"Could not check supplier delivery."},{status:503,headers});
 const byKey=new Map((notices.data||[]).map(n=>[n.order_id+":"+n.supplier_id,n]));
 const requests=applyTrackingEvents(trackerRequests(loaded),events).map(r=>{const n=byKey.get(r.id);return n?{...r,...deliverySummary(n,Date.now()),replyDueAt:n.reply_due_at}:r;});
 return NextResponse.json({ok:true,requests,truncated:rows.length>100,historyTruncated,loadedAt:new Date().toISOString()},{headers});
}

export async function PATCH(req:Request){
 const auth=await requireStaff(req);if(!auth.ok)return auth.response;
 let update:ReturnType<typeof parseTrackingUpdate>;
 try{const text=await req.text();if(text.length>6000)throw Error("Follow-up details are too long.");update=parseTrackingUpdate(JSON.parse(text));}catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Check the follow-up details."},{status:400,headers});}
 const {data:order,error}=await auth.admin.from("orders").select("id,status,order_lines(supplier_id)").eq("id",update.orderId).maybeSingle();
 if(error)return NextResponse.json({ok:false,error:"Could not check this request."},{status:500,headers});
 if(!order)return NextResponse.json({ok:false,error:"Request not found."},{status:404,headers});
 if(order.status!=="requested")return NextResponse.json({ok:false,error:"This request is no longer open. Refresh the tracker."},{status:409,headers});
 if(!order.order_lines.some((l:{supplier_id:string|null})=>l.supplier_id===update.supplierId))return NextResponse.json({ok:false,error:"This supplier is not part of the request."},{status:400,headers});
 const {orderId,...detail}=update;
 const saved=await auth.admin.from("order_events").insert({order_id:orderId,actor_id:auth.actor.id,actor_label:auth.actor.label,type:"supplier_tracking",detail});
 if(saved.error)return NextResponse.json({ok:false,error:"Follow-up was not saved. Please retry."},{status:500,headers});
 return NextResponse.json({ok:true},{headers});
}
