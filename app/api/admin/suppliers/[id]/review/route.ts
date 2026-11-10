import {supplierReview} from "@/lib/server/supplier-review";
export const dynamic="force-dynamic";
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){return supplierReview(req,(await params).id,true);}
export const POST=GET;
