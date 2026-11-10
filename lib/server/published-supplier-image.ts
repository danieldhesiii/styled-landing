import "server-only";
import {createAdminClient} from "@/lib/supabase/admin";
// Publishing an image is a checked capability, never a public storage URL.
export async function publishedSupplierImage(id:string,forGeneration=false):Promise<Buffer|null>{
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return null;
 const db=createAdminClient();const asset=await db.from("supplier_review_assets").select("path,product_id,supplier_id,ai_reference_allowed").eq("id",id).eq("approved",true).maybeSingle();if(asset.error||!asset.data||(forGeneration&&!asset.data.ai_reference_allowed))return null;
 // Current rights also gate stale approved flags while a withdrawal is repaired.
 const review=await db.from("supplier_reviews").select("declarations").eq("supplier_id",asset.data.supplier_id).maybeSingle();
 const consent=review.data?.declarations;
 if(review.error||consent?.listingPermission!==true||consent?.publicImagePermission!==true||consent?.imageRights!==true||(forGeneration&&consent.aiReferencePermission!==true))return null;
 const p=await db.from("products").select("id,image,suppliers!inner(active)").eq("id",asset.data.product_id).eq("supplier_id",asset.data.supplier_id).eq("active",true).eq("suppliers.active",true).maybeSingle();if(p.error||!p.data||p.data.image!==`/api/supplier-images/${id}`)return null;
 const blob=await db.storage.from("supplier-review-assets").download(asset.data.path);if(blob.error||!blob.data||blob.data.size>5*1024*1024)return null;return Buffer.from(await blob.data.arrayBuffer());
}
