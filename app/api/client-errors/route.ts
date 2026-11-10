import {NextResponse} from 'next/server';
import {supplierJson} from '@/lib/server/supplier-body';
import {createAdminClient} from '@/lib/supabase/admin';
import {clientIpHash} from '@/lib/server/limits';
export async function POST(req:Request){try{
 const b=await supplierJson(req,1000);
 if(!['design','portal','admin','venues','login','auth','public'].includes(b.section)||typeof b.digest!=='string'||!/^[a-zA-Z0-9_-]{0,80}$/.test(b.digest))return new Response(null,{status:422});
 const admin=createAdminClient(),limit=await admin.rpc('hit_rate_limit',{p_key:`client-errors:${clientIpHash(req)}`,p_limit:5,p_window_seconds:600});if(limit.error||limit.data!==true)return new Response(null,{status:429});
 const existing=await admin.from('operational_incidents').select('id').eq('section',b.section).eq('digest',b.digest).eq('state','open').gte('created_at',new Date(Date.now()-600000).toISOString()).limit(1);
 if(existing.error)return new Response(null,{status:503});
 if(!existing.data?.length){const globalLimit=await admin.rpc('hit_rate_limit',{p_key:'client-errors:global',p_limit:100,p_window_seconds:3600});if(globalLimit.error||globalLimit.data!==true)return new Response(null,{status:429});const saved=await admin.from('operational_incidents').insert({section:b.section,digest:b.digest});if(saved.error)return new Response(null,{status:503});}
 return NextResponse.json({ok:true});
 }catch{return new Response(null,{status:400});}}
