import {supplierReview} from "@/lib/server/supplier-review";
export const dynamic="force-dynamic";
export async function GET(req:Request){return supplierReview(req,undefined,false);}
export const POST=GET;
