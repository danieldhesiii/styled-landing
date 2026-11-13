import type {SupabaseClient} from "@supabase/supabase-js";
import {NextResponse} from "next/server";
import {requireStaff} from "./staff";
import {requireVendor} from "./vendor";
import {requireUser} from "./session";
import {createAdminClient} from "@/lib/supabase/admin";
import {supplierJson} from "./supplier-body";
import {parseLogistics,parseServiceReply,validRevision} from "@/lib/booking-operations";
import {venueCatalogue} from "./venue-catalogue";
import {loadCatalogue} from "./catalogue";
import {dispatchBookingNotifications} from "./booking-notifications";
export type BookingRole="staff"|"supplier"|"customer";
const headers={"Cache-Control":"private, no-store"};
const fail=(status:number,error:string)=>NextResponse.json({ok:false,error},{status,headers});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function bookingAccess(req:Request,id:string,role:BookingRole){
 const auth=role==="staff"?await requireStaff(req):role==="supplier"?await requireVendor(req):await requireUser();
 if(!auth.ok)return auth;if(!UUID.test(id))return {ok:false as const,response:fail(404,"Request not found.")};
 if(auth.user.is_anonymous)return {ok:false as const,response:fail(401,"Sign in with your account.")};
 const admin="admin" in auth?auth.admin:createAdminClient();
 const {data:order,error}=await admin.from("orders").select("id,owner_id,reference,status,venue_label,wedding_date,notes").eq("id",id).maybeSingle();
 if(error)return {ok:false as const,response:fail(503,"Could not check request access.")};
 if(!order||(role==="customer"&&order.owner_id!==auth.user.id))return {ok:false as const,response:fail(404,"Request not found.")};
 let supplierId:string|undefined;
 if(role==="supplier"){supplierId=("supplierId" in auth?String(auth.supplierId):undefined);const check=await admin.from("order_lines").select("id").eq("order_id",id).eq("supplier_id",supplierId).limit(1);if(check.error||!check.data?.length)return {ok:false as const,response:fail(404,"Request not found.")};}
 return {ok:true as const,admin,user:auth.user,order,supplierId,role};
}
export async function bookingView(admin:SupabaseClient,id:string,role:BookingRole,supplierId?:string){
 const workflow=await admin.from("booking_workflows").select("*").eq("order_id",id).maybeSingle();if(workflow.error)throw Error("Could not load saved workflow.");
 const w=workflow.data||{order_id:id,revision:0,phase:"review",logistics:{},supplier_replies:{},current_quote_id:null,handover:{}};
 let query=admin.from("order_lines").select("id,supplier_id,supplier_name,product_name,quantity,unit_price_pence,line_total_pence,needed_date,return_date,supplier_status,request_snapshot").eq("order_id",id);if(role==="supplier")query=query.eq("supplier_id",supplierId!);
 const lines=await query;if(lines.error)throw Error("Could not load requested items.");
 const replies=Object.fromEntries(Object.entries(w.supplier_replies||{}).filter(([key])=>role!=="supplier"||key===supplierId).map(([key,value])=>{const {recordedBy,...r}=value as Record<string,unknown>;return [key,role==="staff"?value:r];}));
 let quote=null;if(w.current_quote_id){const q=await admin.from("booking_quotes").select("id,version,status,payload,expires_at,created_at,accepted_at").eq("id",w.current_quote_id).eq("order_id",id).maybeSingle();if(q.error)throw Error("Could not load quote.");quote=q.data;if(quote&&role==="supplier"){quote={...quote,payload:{...quote.payload,lines:quote.payload.lines.filter((l:{supplierId:string})=>l.supplierId===supplierId),suppliers:quote.payload.suppliers.filter((s:{supplierId:string})=>s.supplierId===supplierId),totalPence:null,securityPence:null}};}}
 let claimsQuery=admin.from("booking_claims").select("id,supplier_id,kind,status,amount_pence,evidence,resolution,customer_response,created_at").eq("order_id",id).order("created_at",{ascending:false}).limit(100);if(role==="supplier")claimsQuery=claimsQuery.eq("supplier_id",supplierId!);if(role==="customer")claimsQuery=claimsQuery.neq("status","reported");const claims=await claimsQuery;if(claims.error)throw Error("Could not load return reviews.");
 const jobs=role==="staff"?await admin.from("booking_notifications").select("id,supplier_id,audience,kind,status,attempts,last_error,attempted_at,created_at").eq("order_id",id).order("created_at",{ascending:false}).limit(100):{data:[],error:null};if(jobs.error)throw Error("Could not load notifications.");
 // Only agreed customer-facing terms accompany the final confirmation.
 const confirmation=role==="customer"&&w.phase==="confirmed"?{
   confirmationReference:w.handover?.confirmationReference,contractParty:w.handover?.contractParty,
   paymentArrangement:w.handover?.paymentArrangement,cancellationTerms:w.handover?.cancellationTerms,
   depositTerms:w.handover?.depositTerms,damageTerms:w.handover?.damageTerms,
 }:null;
 return {confirmation,workflow:{revision:w.revision,phase:w.phase,logistics:w.logistics,supplierReplies:replies,cancellationRequest:w.cancellation_request||null,...(role==="staff"?{handover:w.handover}:{})},lines:lines.data||[],quote,claims:claims.data||[],notifications:jobs.data||[],requestOnly:(lines.data||[]).some(l=>!!l.request_snapshot),paymentCollectionEnabled:false};
}
export async function bookingGet(req:Request,id:string,role:BookingRole){const a=await bookingAccess(req,id,role);if(!a.ok)return a.response;try{return NextResponse.json({ok:true,order:{id:a.order.id,reference:a.order.reference,status:a.order.status,venue:a.order.venue_label,weddingDate:a.order.wedding_date},...(await bookingView(a.admin,id,role,a.supplierId))},{headers});}catch(e){return fail(503,e instanceof Error?e.message:"Could not load workflow.");}}
export async function bookingPost(req:Request,id:string,role:BookingRole){const a=await bookingAccess(req,id,role);if(!a.ok)return a.response;
 try{const b=await supplierJson(req,25000);if(!validRevision(b.revision))return fail(422,"Refresh the request before saving.");const allowed={staff:["reply","logistics","issue","handover","confirm","claim","claim_update"],supplier:["reply","claim"],customer:["logistics","accept","cancel_request","claim_update"]};if(!allowed[role].includes(b.action))return fail(403,"This action is not available in your workspace.");
 const data:Record<string,unknown>={actorLabel:a.user.email||a.user.id};
 if(b.action==="reply"){const sid=role==="supplier"?a.supplierId:b.supplierId;if(typeof sid!=="string"||!UUID.test(sid))return fail(422,"Choose the supplier.");data.supplierId=sid;data.reply=parseServiceReply(b.reply);}
 if(b.action==="logistics"){data.logistics=parseLogistics(b.logistics);if(b.itemDates!==undefined){if(!Array.isArray(b.itemDates)||b.itemDates.length>60)return fail(422,"Check item dates.");for(const d of b.itemDates){if(!d||!UUID.test(d.id)||typeof d.start!=="string"||typeof d.end!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(d.start)||!/^\d{4}-\d{2}-\d{2}$/.test(d.end)||!Number.isFinite(Date.parse(d.start))||!Number.isFinite(Date.parse(d.end)))return fail(422,"Choose valid item dates.");}data.itemDates=b.itemDates;}}
 if(b.action==="issue"){if(typeof b.expiresAt!=="string"||!Number.isFinite(Date.parse(b.expiresAt)))return fail(422,"Choose a quote expiry.");data.expiresAt=b.expiresAt;}
 if(b.action==="accept"){if(typeof b.quoteId!=="string"||!UUID.test(b.quoteId)||b.reviewed!==true)return fail(422,"Review the current quote first.");data.quoteId=b.quoteId;data.reviewed=true;}
 if(b.action==="handover"){if(a.order.status!=="requested")return fail(409,"The booking has closed. Refresh to see its agreed arrangements.");const h=b.handover;if(!h||typeof h!=="object"||!["supplier","styled","undecided"].includes(h.contractParty))return fail(422,"Choose who contracts with the customer.");const safe:Record<string,unknown>={contractParty:h.contractParty};for(const key of ["confirmationReference","paymentArrangement","cancellationTerms","depositTerms","damageTerms","commissionAgreement"]){if(typeof h[key]!=="string"||h[key].length>2000)return fail(422,"Keep each arrangement under 2,000 characters.");safe[key]=h[key].trim();}data.handover=safe;}
 if(b.action==="cancel_request"){if(typeof b.reason!=="string"||b.reason.trim().length<3||b.reason.length>2000)return fail(422,"Explain the cancellation request.");data.reason=b.reason.trim();}
 if(b.action==="claim"){const sid=role==="supplier"?a.supplierId:b.supplierId;if(typeof sid!=="string"||!UUID.test(sid)||!["damage","late_return","missing"].includes(b.kind)||!Number.isSafeInteger(b.amountPence)||b.amountPence<0||b.amountPence>100000000||typeof b.evidence!=="string"||b.evidence.trim().length<10||b.evidence.length>4000)return fail(422,"Choose the supplier, amount and condition evidence.");Object.assign(data,{supplierId:sid,kind:b.kind,amountPence:b.amountPence,evidence:b.evidence.trim()});}
 if(b.action==="claim_update"){if(typeof b.claimId!=="string"||!UUID.test(b.claimId)||!["notified","disputed","resolved"].includes(b.status)||typeof b.note!=="string"||b.note.trim().length<3||b.note.length>3000)return fail(422,"Record the explanation or response.");Object.assign(data,{claimId:b.claimId,status:b.status,note:b.note.trim()});}
 if(["issue","confirm","accept"].includes(b.action)){const pending=await a.admin.from("order_lines").select("request_snapshot").eq("order_id",id);if(pending.error)return fail(503,"Could not verify request-only items.");if(pending.data?.some(l=>!!l.request_snapshot))return fail(409,"Development request only. Map to verified supplier products and agree a manual quote before booking.");}
 if(["issue","confirm"].includes(b.action)){const match=a.order.notes?.match(/Venue route: ([a-z0-9-]+)/);if(match){const scoped=await venueCatalogue(match[1],await loadCatalogue());const ids=new Set(scoped.items.map(i=>i.id));const requested=await a.admin.from("order_lines").select("product_id").eq("order_id",id);if(requested.error||requested.data?.some(l=>!ids.has(l.product_id)))return fail(409,"The venue supplier policy or coverage changed. Review this request with the venue.");}}
 const changed=await a.admin.rpc("change_booking_workflow",{p_order:id,p_revision:b.revision,p_actor:a.user.id,p_action:b.action,p_data:data});if(changed.error)return fail(409,changed.error.message||"Request changed. Refresh and try again.");
 await dispatchBookingNotifications(a.admin,id);
 const view=await bookingView(a.admin,id,role,a.supplierId);
 return NextResponse.json({ok:true,order:{id:a.order.id,reference:a.order.reference,status:view.workflow.phase==="confirmed"?"confirmed":a.order.status,venue:a.order.venue_label,weddingDate:a.order.wedding_date},...view},{headers});
 }catch(e){return fail(422,e instanceof Error?e.message:"Check your request details.");}}
