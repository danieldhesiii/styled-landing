import {createHash,randomUUID,timingSafeEqual} from 'node:crypto';
import type {SupabaseClient} from '@supabase/supabase-js';
import {sendTrackedEmail} from './notify';
import {env} from './env';
import {emailProvider} from '@/lib/email-provider';
import {UUID} from '@/lib/pilot-readiness';
export const recipientHash=(email:string)=>createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
export function authorisedWebhook(header:string|null,secret:string|undefined){if(!secret||secret.length<32||!header)return false;const a=Buffer.from(header),b=Buffer.from(`Bearer ${secret}`);return a.length===b.length&&timingSafeEqual(a,b);}
export async function trackedDelivery(admin:SupabaseClient,email:{to:string[];subject:string;text:string;html:string},link:{jobId:string;venueJobId?:never;supportJobId?:never;checkUserId?:never}|{venueJobId:string;jobId?:never;supportJobId?:never;checkUserId?:never}|{supportJobId:string;jobId?:never;venueJobId?:never;checkUserId?:never}|{checkUserId:string;jobId?:never;venueJobId?:never;supportJobId?:never}){
 const provider=emailProvider(env);
 const to=[...new Set(email.to.map(v=>v.trim().toLowerCase()).filter(Boolean))];
 if(!provider||!to.length)return {accepted:false,outcome:'disabled' as const};
 // Resend messages are private to one recipient, with their own run and send ID.
 // Save all rows before sending anything so a ledger failure cannot leave a
 // partially sent audience eligible for a whole-job retry.
 const groups=(provider==='resend'?to.map(e=>[e]):[to]).map(recipients=>({run:randomUUID(),recipients}));
 const rows=groups.flatMap(({run,recipients})=>recipients.map(e=>({run_id:run,job_id:link.jobId??null,...(link.venueJobId?{venue_job_id:link.venueJobId}:{}),...(link.supportJobId?{support_job_id:link.supportJobId}:{}),check_user_id:'checkUserId' in link?link.checkUserId:null,provider,recipient_hash:recipientHash(e)})));
 try{
  const saved=await admin.from('booking_email_deliveries').insert(rows);
  if(saved.error)return {accepted:false,outcome:'disabled' as const};
 }catch{return {accepted:false,outcome:'disabled' as const};}
 const receipts=[];
 for(const {run,recipients} of groups){
  let receipt;
  try{receipt=await sendTrackedEmail({...email,to:recipients,trackingRun:run});}
  catch{receipt={accepted:false,provider,messageId:null,outcome:'unknown' as const};}
  const status=receipt.accepted?'accepted':receipt.outcome==='unknown'?'unknown':'failed';
  // A callback can arrive before the HTTP response: never overwrite its status.
  // A ledger error after a send must not throw into a retryable whole-job failure.
  try{
   const recorded=await admin.from('booking_email_deliveries').update({status,message_id:receipt.messageId?.replace(/^<|>$/g,'')||null}).eq('run_id',run).eq('status','pending');
   if(recorded.error&&!receipt.accepted)receipt={...receipt,outcome:'unknown' as const};
  }catch{if(!receipt.accepted)receipt={...receipt,outcome:'unknown' as const};}
  receipts.push(receipt);
 }
 if(receipts.length===1)return receipts[0];
 const accepted=receipts.every(r=>r.accepted);
 // Partial acceptance is held as unknown for staff review, never retried as a
 // whole audience. The queue and manual retry endpoint already exclude unknown.
 const outcome=accepted?'accepted' as const:receipts.some(r=>r.accepted||r.outcome==='unknown')?'unknown' as const:'rejected' as const;
 return {accepted,provider,messageId:null,outcome};
}
const STATUS:Record<string,string>={request:'accepted',delivered:'delivered',deferred:'deferred',soft_bounce:'bounced',hard_bounce:'bounced',blocked:'blocked',spam:'complaint',invalid_email:'failed',error:'failed'};
export function parseDeliveryEvent(body:any){
 if(!body||typeof body!=='object'||Array.isArray(body)||!Object.hasOwn(STATUS,body.event))return null;
 const email=body.email,message=body['message-id'];
 if(typeof email!=='string'||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||typeof message!=='string'||!message||message.length>500)throw Error('Invalid delivery event.');
 let run:string|null=null;
 const custom=body['X-Mailin-custom'];
 if(custom){let parsed=custom;try{if(typeof custom==='string')parsed=JSON.parse(custom);}catch{parsed=null;}if(parsed?.styledDelivery&&UUID.test(parsed.styledDelivery))run=parsed.styledDelivery;}
 const raw=body.ts_event??body.ts;
 if(typeof raw!=='number'||!Number.isFinite(raw))throw Error('Missing event timestamp.');
 const at=new Date(raw*1000);if(!Number.isFinite(at.getTime())||at.getTime()>Date.now()+300000||at.getTime()<Date.now()-90*86400000)throw Error('Invalid event timestamp.');
 const recipient=recipientHash(email),status=STATUS[body.event];
 const key=createHash('sha256').update(JSON.stringify([message,recipient,body.event,raw])).digest('hex');
 return {p_provider:'brevo',p_run:run,p_message:message.replace(/^<|>$/g,''),p_recipient:recipient,p_status:status,p_at:at.toISOString(),p_key:key};
}
