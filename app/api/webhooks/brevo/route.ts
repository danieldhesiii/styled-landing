import {NextResponse} from 'next/server';
import {createAdminClient} from '@/lib/supabase/admin';
import {authorisedWebhook,parseDeliveryEvent} from '@/lib/server/email-delivery';
export const dynamic='force-dynamic';
export async function POST(req:Request){
 if(!authorisedWebhook(req.headers.get('authorization'),process.env.BREVO_WEBHOOK_SECRET))return NextResponse.json({error:'Webhook authentication required.'},{status:401});
 try{
  const reader=req.body?.getReader();if(!reader)return new Response(null,{status:400});let size=0;const chunks:Uint8Array[]=[];
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>65536){await reader.cancel();return new Response(null,{status:413});}chunks.push(value);}
  const events=JSON.parse(Buffer.concat(chunks).toString('utf8'));const batch=Array.isArray(events)?events:[events];if(batch.length>50)return new Response(null,{status:413});
  const admin=createAdminClient();
  for(const body of batch){const event=parseDeliveryEvent(body);if(!event)continue;const result=await admin.rpc('apply_booking_email_event',event);if(result.error)return NextResponse.json({error:'Please retry this delivery event.'},{status:503});}
  return NextResponse.json({ok:true});
 }catch{return NextResponse.json({error:'Invalid delivery event.'},{status:400});}
}
