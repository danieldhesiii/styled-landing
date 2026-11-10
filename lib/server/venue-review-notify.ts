import {createAdminClient} from "@/lib/supabase/admin";
import {sendEmail} from "./notify";
import {env} from "./env";
// Best-effort alerts. In-app status and feedback remain authoritative when no
// sending provider is configured or a provider refuses delivery.
export async function notifyVenueReview(venueId:string,kind:"submitted"|"changes"|"published"){
 try{const admin=createAdminClient();const {data:venue}=await admin.from("venue_listings").select("name").eq("id",venueId).single();if(!venue)return;
 const {data:rows}=kind==="submitted"?await admin.from("staff").select("user_id"):await admin.from("venue_users").select("user_id").eq("venue_id",venueId);
 for(const id of [...new Set((rows||[]).map(r=>r.user_id))]){const {data}=await admin.auth.admin.getUserById(id);if(!data.user?.email||!data.user.email_confirmed_at)continue;
 const subject=kind==="submitted"?"Venue listing awaiting review":kind==="changes"?"Changes requested for your venue listing":"Your venue listing is published";
 const text=`${venue.name}: ${subject.toLowerCase()}. Open ${env.siteUrl}${kind==="submitted"?"/admin/venues":"/venue-portal"} to view the current details. No booking or payment is created by this update.\n\nStyled`;
 const escape=(s:string)=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
 await sendEmail({to:[data.user.email],subject:`Styled: ${subject}`,text,html:`<p>${escape(text).replace(/\n/g,"<br>")}</p>`});}
 }catch(e){console.error("[venue review alert]",e);}
}
