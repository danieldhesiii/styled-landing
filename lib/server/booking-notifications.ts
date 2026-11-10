import type {SupabaseClient} from "@supabase/supabase-js";
import {trackedDelivery} from "./email-delivery";
import {environmentMatches} from "@/lib/pilot-readiness";
import {env} from "./env";
export function bookingEmailEnabled(){return process.env.ENABLE_BOOKING_EMAILS==="true"&&!!(env.brevoApiKeyIfSet||env.resendApiKeyIfSet)&&environmentMatches(env.supabaseUrl,env.siteUrl);}
const escape=(s:string)=>s.replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]!));
export async function dispatchBookingNotifications(admin:SupabaseClient,orderId?:string,jobId?:string){try{return await dispatchJobs(admin,orderId,jobId);}catch{return {processed:0,error:"Could not process notifications. Review the saved queue."};}}
async function dispatchJobs(admin:SupabaseClient,orderId?:string,jobId?:string){
 let query=admin.from("booking_notifications").select("*").in("status",["queued","failed","blocked"]).lt("attempts",5).lte("due_at",new Date().toISOString()).order("created_at").limit(20);if(orderId)query=query.eq("order_id",orderId);if(jobId)query=query.eq("id",jobId);
 const jobs=await query;if(jobs.error)return {processed:0,error:"Could not load notification queue."};let processed=0;
 for(const job of jobs.data||[]){
  if(!bookingEmailEnabled()){await admin.from("booking_notifications").update({status:"blocked",last_error:"Email delivery is disabled or no provider is configured."}).eq("id",job.id).neq("status","sending");continue;}
  const lock=await admin.from("booking_notifications").update({status:"sending",attempts:job.attempts+1,attempted_at:new Date().toISOString(),last_error:null}).eq("id",job.id).eq("status",job.status).eq("attempts",job.attempts).select("id");if(lock.error||!lock.data?.length)continue;
  let accepted=false,uncertain=false,reason="Email provider did not accept the message.";
  try{const {data:order,error}=await admin.from("orders").select("reference,owner_id,status").eq("id",job.order_id).maybeSingle();if(error||!order)throw Error("Request could not be loaded.");
   if(job.kind==="booking_confirmed"){
    if(!["customer","supplier"].includes(job.audience)||!["confirmed","deposit_paid"].includes(order.status))throw Error("Booking confirmation is obsolete. Review the current booking.");
    const workflow=await admin.from("booking_workflows").select("phase").eq("order_id",job.order_id).maybeSingle();
    if(workflow.error||workflow.data?.phase!=="confirmed")throw Error("A recorded final booking is required before sending confirmation.");
   }
   if(job.audience==="supplier"&&job.kind!=="booking_confirmed"&&order.status!=="requested")throw Error("Request is closed. Review before sending a reminder.");
   if(["quote_ready","quote_accepted"].includes(job.kind)){const w=await admin.from("booking_workflows").select("phase,current_quote_id").eq("order_id",job.order_id).maybeSingle();if(w.error||!w.data?.current_quote_id)throw Error("This quote notification is obsolete. Review the current request.");const q=await admin.from("booking_quotes").select("version,status,expires_at").eq("id",w.data.current_quote_id).maybeSingle();const version=Number(job.dedupe_key.split(':').at(-1));if(q.error||!q.data||q.data.version!==version||new Date(q.data.expires_at).getTime()<=Date.now()||!["issued","accepted"].includes(q.data.status))throw Error("This quote changed or expired. Do not send its old notice.");}
   let to:string[]=[];
   if(job.audience==="customer"){const user=await admin.auth.admin.getUserById(order.owner_id);if(user.error||!user.data.user?.email_confirmed_at)throw Error("Customer account email is not verified.");to=[user.data.user.email!];}
   else if(job.audience==="staff"){const staff=await admin.from("staff").select("user_id");if(staff.error)throw Error("Staff recipients could not be loaded.");for(const row of staff.data||[]){const u=await admin.auth.admin.getUserById(row.user_id);if(u.data.user?.email_confirmed_at&&u.data.user.email)to.push(u.data.user.email);}}
   else{const supplier=await admin.from("suppliers").select("contact_email").eq("id",job.supplier_id).maybeSingle();if(supplier.error)throw Error("Supplier contact could not be loaded.");if(supplier.data?.contact_email)to.push(supplier.data.contact_email);const links=await admin.from("supplier_users").select("user_id").eq("supplier_id",job.supplier_id);if(links.error)throw Error("Supplier logins could not be loaded.");for(const row of links.data||[]){const u=await admin.auth.admin.getUserById(row.user_id);if(u.data.user?.email_confirmed_at&&u.data.user.email)to.push(u.data.user.email);}}
   to=[...new Set(to)].filter(e=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)&&!e.endsWith('.invalid'));if(!to.length)throw Error("No verified or agreed recipient is available.");
   const url=env.siteUrl+(job.audience==="staff"?`/admin/orders/${job.order_id}`:job.audience==="supplier"?"/portal/requests":"/design?tab=orders");
   const purpose=job.kind==="booking_confirmed"?"Styled has recorded the agreed offline booking. Review your confirmed hire dates and agreed arrangements in your workspace. This message does not take payment or change the agreed terms.":job.kind==="quote_ready"?"Your complete quote is ready to review.":job.kind==="quote_accepted"?"The customer accepted the current quote. Review the agreed arrangements before confirming the booking.":job.kind==="claim_review"?"There is a return or damage review for your response. A supplier report does not automatically charge you.":job.kind==="cancellation_request"?"A customer has requested a cancellation. Review the terms and respond; no automatic refund or cancellation has happened.":job.kind==="reminder"?"Please review the outstanding supplier request and its next action.":"A supplier request needs review. Check the full hire dates, stock, delivery, setup and fees before confirming availability.";
   let itemText="";if(job.audience==="supplier"){const lines=await admin.from("order_lines").select("product_name,quantity,needed_date,return_date").eq("order_id",job.order_id).eq("supplier_id",job.supplier_id);if(lines.error||!lines.data?.length)throw Error("Supplier is not linked to this request.");itemText=lines.data.map(l=>`${l.quantity} × ${l.product_name}: ${l.needed_date||'date to agree'} to ${l.return_date||'date to agree'}`).join('\n');}
   const text=[`Styled request ${order.reference}`,purpose,itemText,"No payment is collected by this message. Availability and a quote are separate from a confirmed booking.","Use your workspace or reply to support@styleduk.com:",url].filter(Boolean).join('\n\n');
   const receipt=await trackedDelivery(admin,{to,subject:`Styled ${order.reference}: ${job.kind.replaceAll('_',' ')}`,text,html:`<div style="font-family:Arial,sans-serif;line-height:1.6">${text.split('\n\n').map(t=>`<p>${escape(t).replaceAll('\n','<br>')}</p>`).join('')}</div>`},{jobId:job.id});accepted=receipt.accepted;uncertain=receipt.outcome==='unknown';
  }catch(e){reason=e instanceof Error?e.message:"Sending failed.";}
  await admin.from("booking_notifications").update({status:accepted?"provider_accepted":uncertain?"unknown":"failed",last_error:accepted?null:reason}).eq("id",job.id).eq("status","sending");processed++;
 }
 return {processed};
}
