import type {VenueDetails} from "@/lib/venue-details";
import {venuePolicy} from "@/lib/venue-suppliers";
export async function verifyVenuePartners(admin:any,details:VenueDetails){
 const ids=venuePolicy(details).catalogueSupplierIds;
 if(!ids.length)return;
 const {data,error}=await admin.from("suppliers").select("id").in("id",ids).eq("active",true);
 if(error||data?.length!==ids.length)throw Error("Linked catalogue suppliers must be active, verified Styled businesses. Check their IDs before publishing.");
}
