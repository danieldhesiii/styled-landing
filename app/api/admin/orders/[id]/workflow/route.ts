import {bookingGet,bookingPost} from "@/lib/server/booking-operations";
export const dynamic="force-dynamic";
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){return bookingGet(req,(await params).id,"staff");}
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){return bookingPost(req,(await params).id,"staff");}
