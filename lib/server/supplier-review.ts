import {NextResponse} from "next/server";
import {requireStaff} from "./staff";
import {requireVendor} from "./vendor";
import {supplierJson} from "./supplier-body";
import {validRevision} from "@/lib/booking-operations";
import type {SupabaseClient} from "@supabase/supabase-js";
const headers={"Cache-Control":"private, no-store"};const fail=(status:number,error:string)=>NextResponse.json({error},{status,headers});
export async function reviewView(admin:SupabaseClient,id:string){
 const [review,products,supplier,assets,history]=await Promise.all([admin.from("supplier_reviews").select("*").eq("supplier_id",id).maybeSingle(),admin.from("products").select("id,name,unit_price_pence,unit,capacity,image,details,active,updated_at").eq("supplier_id",id).order("name"),admin.from("suppliers").select("name,area,bio,service_details,active").eq("id",id).maybeSingle(),admin.from("supplier_review_assets").select("id,product_id,path,approved").eq("supplier_id",id).order("created_at",{ascending:false}).limit(100),admin.from("supplier_review_history").select("revision,state,declarations,snapshot,feedback,recorded_at").eq("supplier_id",id).order("recorded_at",{ascending:false}).limit(20)]);
 if(review.error||products.error||supplier.error||assets.error||history.error||!supplier.data)throw Error("Could not load the private range review.");
 const previews=[];for(const asset of assets.data||[]){const signed=await admin.storage.from("supplier-review-assets").createSignedUrl(asset.path,600);if(signed.error)throw Error("Could not load private preview images.");previews.push({id:asset.id,productId:asset.product_id,url:signed.data.signedUrl,approved:asset.approved});}
 return {review:review.data||{revision:0,state:"draft",declarations:{},feedback:null},products:products.data||[],supplier:supplier.data,previews,history:history.data||[]};
}
export async function supplierReview(req:Request,supplierId:string|undefined,staff:boolean){
 const auth=staff?await requireStaff(req):await requireVendor(req);if(!auth.ok)return auth.response;const id=staff?supplierId:("supplierId" in auth?String(auth.supplierId):undefined);if(!id||!/^[0-9a-f-]{36}$/i.test(id))return fail(404,"Supplier not found.");
 try{if(req.method==="POST"){const b=await supplierJson(req,15000);if(!validRevision(b.revision))return fail(422,"Refresh before saving this review.");if(!["save","submit",...(staff?["approve","changes"]:[])].includes(b.action))return fail(403,"Staff approval is required to publish.");
 const data:Record<string,unknown>={};if(["save","submit"].includes(b.action)){const d=b.declarations;if(!d||!["manual","styled"].includes(d.availabilityMode))return fail(422,"Choose how you check availability.");for(const key of ["listingPermission","imageRights","publicImagePermission","aiReferencePermission","pricesConfirmed","termsConfirmed"]){if(typeof d[key]!=="boolean")return fail(422,"Check the range approvals.");data[key]=d[key];}if(typeof d.terms!=="string"||d.terms.length>5000||typeof d.notes!=="string"||d.notes.length>2000||!Number.isInteger(d.replyHours)||d.replyHours<1||d.replyHours>168)return fail(422,"Add terms, an agreed response target (1 to 168 hours), and brief notes.");Object.assign(data,{availabilityMode:d.availabilityMode,terms:d.terms.trim(),notes:d.notes.trim(),replyHours:d.replyHours});}
 if(["approve","changes"].includes(b.action)){if(typeof b.feedback!=="string"||b.feedback.length>3000)return fail(422,"Keep feedback under 3,000 characters.");data.feedback=b.feedback.trim();}
 const result=await auth.admin.rpc("review_supplier_range",{p_supplier:id,p_revision:b.revision,p_actor:auth.user.id,p_action:b.action,p_data:data});if(result.error)return fail(409,result.error.message||"Range changed. Refresh and try again.");}
 return NextResponse.json({ok:true,...await reviewView(auth.admin,id)},{headers});
 }catch(e){return fail(422,e instanceof Error?e.message:"Check the review details.");}
}
