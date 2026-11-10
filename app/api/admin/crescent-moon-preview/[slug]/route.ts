import {NextResponse} from 'next/server';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {requireStaff} from '@/lib/server/staff';
import products from '@/lib/crescent-moon-preview.json';
export const dynamic='force-dynamic';
export async function GET(req:Request,{params}:{params:Promise<{slug:string}>}){
 const auth=await requireStaff(req);if(!auth.ok)return auth.response;
 const {slug}=await params;
 const product=products.find(p=>p.slug===slug);
 if(!product)return NextResponse.json({error:'Preview not found.'},{status:404});
 try {const bytes=await readFile(path.join(process.cwd(),'private/supplier-previews/crescent-moon',product.image));return new Response(new Uint8Array(bytes),{headers:{'Content-Type':'image/webp','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}
 catch{return NextResponse.json({error:'Preview image unavailable.'},{status:503,headers:{'Cache-Control':'private, no-store'}});}
}
