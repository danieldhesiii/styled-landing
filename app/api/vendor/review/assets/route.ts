import {storePrivateSupplierImage} from "@/lib/server/private-supplier-image";
import {NextResponse} from "next/server";
import {randomUUID} from "node:crypto";
import {requireVendor} from "@/lib/server/vendor";
import {supplierJson} from "@/lib/server/supplier-body";
import {normaliseAssetImage} from "@/lib/server/asset-image";
export async function POST(req:Request){const a=await requireVendor(req);if(!a.ok)return a.response;try{
 const b=await supplierJson(req,7500000);if(typeof b.productId!=="string"||typeof b.image!=="string")throw Error("Choose a product and image.");const p=await a.admin.from("products").select("id").eq("id",b.productId).eq("supplier_id",a.supplierId).maybeSingle();if(p.error||!p.data)return NextResponse.json({error:"Product not found."},{status:404});
 const rate=await a.admin.rpc("hit_rate_limit",{p_key:`private-review-image:${a.user.id}`,p_limit:30,p_window_seconds:3600});if(rate.error||rate.data!==true)return NextResponse.json({error:"Please wait before uploading another image."},{status:429});
 await storePrivateSupplierImage(a.admin,a.supplierId,b.productId,b.image);
 return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Upload failed."},{status:422});}}
