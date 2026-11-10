import "server-only";
import {loadPublicVenue} from "./venues";
import {createAdminClient} from "@/lib/supabase/admin";
import {venuePolicy,policyAllowsSupplier} from "@/lib/venue-suppliers";
import {milesBetween,validPoint} from "@/lib/location";
import type {ServerCatalogueItem} from "./catalogue";
export async function venueCatalogue(slug:string,items:ServerCatalogueItem[]){
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length>160)throw Error("Choose a valid venue.");
 const result=await loadPublicVenue(slug);
 if(!result||result.venue.is_demo)throw Error("This venue is not currently available. Return to your wedding plan to choose another venue.");
 const policy=venuePolicy(result.venue.details);
 const scope={slug,name:result.venue.name,policy};
 let allowed=items.filter(i=>policyAllowsSupplier(policy,i.supplierId));
 if(policy.mode==="venue_only")return {items:[],scope};
 // Only verified business coordinates are used. No guessed distances or device
 // location is needed for venue-led shopping.
 const {data:locations,error}=await createAdminClient().from("discovery_locations").select("entity_type,entity_id,latitude,longitude,radius_miles,nationwide");
 if(error)throw Error("Could not check local suppliers. Please try again.");
 const origin=locations?.find(l=>l.entity_type==="venue"&&l.entity_id===result.venue.id&&validPoint(l));
 if(policy.localRadiusMiles&&!origin)throw Error("This venue's location needs verification before local catalogue matching is available. Contact the venue team.");
 const distances=new Map<string,number>();
 if(origin){for(const l of locations||[]){if(l.entity_type==="supplier"&&validPoint(l))distances.set(l.entity_id,milesBetween(origin,l));}}
 if(policy.localRadiusMiles)allowed=allowed.filter(i=>{const id=i.supplierId||"",distance=distances.get(id),l=locations?.find(r=>r.entity_type==="supplier"&&r.entity_id===id);return distance!==undefined&&distance<=Number(policy.localRadiusMiles)&&(l?.nationwide||l?.radius_miles==null||distance<=l.radius_miles);});
 allowed.sort((a,b)=>(distances.get(a.supplierId)??Infinity)-(distances.get(b.supplierId)??Infinity));
 return {items:allowed,scope};
}
