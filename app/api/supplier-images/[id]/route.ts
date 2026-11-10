import {NextResponse} from "next/server";
import {publishedSupplierImage} from "@/lib/server/published-supplier-image";
export const dynamic="force-dynamic";
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){const bytes=await publishedSupplierImage((await params).id);if(!bytes)return new Response("Image unavailable",{status:404,headers:{"Cache-Control":"no-store"}});return new NextResponse(new Uint8Array(bytes),{headers:{"Content-Type":"image/webp","Cache-Control":"public, max-age=60","X-Content-Type-Options":"nosniff"}});}
