import {NextResponse} from 'next/server';
import {requireStaff} from '@/lib/server/staff';
import {supplierJson} from '@/lib/server/supplier-body';
import {parsePartnerUpdate,LAUNCH_CHECKS,environmentMatches,UUID} from '@/lib/pilot-readiness';
import {bookingEmailEnabled} from '@/lib/server/booking-notifications';
import {trackedDelivery} from '@/lib/server/email-delivery';
import {env} from '@/lib/server/env';
import {resendWebhookConfigured} from '@/lib/server/resend-webhook';
import {emailProvider} from '@/lib/email-provider';
const headers={'Cache-Control':'private, no-store'};
const fail=(status:number,error:string)=>NextResponse.json({error},{status,headers});
export async function GET(req:Request){
 const a=await requireStaff(req);if(!a.ok)return a.response;
 try{
  const [partners,checks,suppliers,deliveries,incidents,reviews,products]=await Promise.all([
   a.admin.from('pilot_partners').select('*').order('name'),a.admin.from('launch_check_records').select('*'),
   a.admin.from('suppliers').select('id,name,active').order('name'),
   a.admin.from('booking_email_deliveries').select('status,created_at,delivered_at').eq('check_user_id',a.user.id).order('created_at',{ascending:false}).limit(10),
   a.admin.from('operational_incidents').select('id,section,digest,state,created_at').eq('state','open').order('created_at',{ascending:false}).limit(30),
   a.admin.from('supplier_reviews').select('supplier_id,state'),a.admin.from('products').select('supplier_id').eq('active',true)
  ]);
  if([partners,checks,suppliers,deliveries,incidents,reviews,products].some(r=>r.error))return fail(503,'Could not load launch checks. Try again shortly.');
  return NextResponse.json({ok:true,partners:partners.data,checks:checks.data,suppliers:suppliers.data,
   approvedRanges:reviews.data?.filter(r=>r.state==='approved'&&suppliers.data?.some(s=>s.id===r.supplier_id&&s.active)).map(r=>r.supplier_id),publishedCounts:Object.fromEntries((suppliers.data||[]).map(s=>[s.id,products.data?.filter(p=>p.supplier_id===s.id).length||0])),
   deliveries:deliveries.data,incidents:incidents.data,configuration:{developmentIsolated:environmentMatches(env.supabaseUrl,env.siteUrl),emailProvider:emailProvider(env)==='resend'?'Resend':emailProvider(env)==='brevo'?'Brevo':null,emailEnabled:bookingEmailEnabled(),deliveryWebhook:emailProvider(env)==='resend'?resendWebhookConfigured(process.env.RESEND_WEBHOOK_SECRET):emailProvider(env)==='brevo'&&(process.env.BREVO_WEBHOOK_SECRET?.length||0)>=32,scheduler:!!env.cronSecretIfSet,paymentsEnabled:false}}, {headers});
 }catch{return fail(503,'Could not check development services.');}
}
export async function POST(req:Request){
 const a=await requireStaff(req);if(!a.ok)return a.response;
 try{
  const b=await supplierJson(req,30000);
  if(b.action==='partner'){
   const data=parsePartnerUpdate(b);
   if(data.supplier_id){const s=await a.admin.from('suppliers').select('id').eq('id',data.supplier_id).maybeSingle();if(s.error||!s.data)return fail(422,'Choose an existing supplier profile.');}
   const {slug,revision,...patch}=data;
   const r=await a.admin.from('pilot_partners').update({...patch,revision:revision+1,updated_by:a.user.id,updated_at:new Date().toISOString()}).eq('slug',slug).eq('revision',revision).select('slug');
   if(r.error)return fail(503,'Could not save the intake.');if(!r.data?.length)return fail(409,'Another person updated this intake. Refresh before saving.');
  }else if(b.action==='check'){
   if(!Object.hasOwn(LAUNCH_CHECKS,b.key)||typeof b.evidence!=='string'||b.evidence.trim().length<10||b.evidence.length>3000)return fail(422,'Choose a check and record what was verified.');
   const r=await a.admin.from('launch_check_records').upsert({key:b.key,evidence:b.evidence.trim(),checked_by:a.user.id,checked_at:new Date().toISOString()},{onConflict:'key'});if(r.error)return fail(503,'Could not record this check.');
  }else if(b.action==='resolve'){
   if(typeof b.id!=='string'||!UUID.test(b.id))return fail(422,'Choose an incident.');const r=await a.admin.from('operational_incidents').update({state:'resolved',resolved_by:a.user.id,resolved_at:new Date().toISOString()}).eq('id',b.id).eq('state','open');if(r.error)return fail(503,'Could not resolve this incident.');
  }else if(b.action==='test_email'){
   if(!a.user.email||!a.user.email_confirmed_at)return fail(422,'Use a verified staff email.');
   if(!env.brevoApiKeyIfSet&&!env.resendApiKeyIfSet)return fail(409,'Connect the development email provider first. No test message was sent.');
   const limit=await a.admin.rpc('hit_rate_limit',{p_key:`email-check:${a.user.id}`,p_limit:3,p_window_seconds:3600});if(limit.error||limit.data!==true)return fail(429,'Wait before sending another test.');
   const result=await trackedDelivery(a.admin,{to:[a.user.email],subject:'Styled development email delivery check',text:'This is a development email check sent to your own verified staff account. No supplier was contacted and no booking or payment was created. Check your inbox and then record the result in Service checks.',html:'<p>This is a development email check for your own verified staff account.</p><p>No supplier was contacted and no booking or payment was created. Check your inbox and record the result in Service checks.</p>'},{checkUserId:a.user.id});
   if(!result.accepted)return fail(503,result.outcome==='unknown'?'The send outcome is uncertain. Check the provider before retrying.':'The provider did not accept the test. Check its configuration.');
   return NextResponse.json({ok:true,message:'Provider accepted the check. Verify arrival in your inbox; acceptance is not delivery.'},{headers});
  }else return fail(400,'Choose an available action.');
  return NextResponse.json({ok:true},{headers});
 }catch(e){return fail(422,e instanceof Error?e.message:'Check the form.');}
}
