import {createAdminClient} from "@/lib/supabase/admin";
import {signedForm,whatsappConfig} from "@/lib/server/order-whatsapp";

export async function POST(req:Request){
  const config=whatsappConfig();
  if(!config)return new Response(null,{status:503});
  if(!req.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded"))return new Response(null,{status:415});
  const url=new URL(req.url), id=url.searchParams.get("notice"), part=url.searchParams.get("part");
  if(!id||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id)||!part||!/^\d{1,3}$/.test(part))return new Response(null,{status:400});
  const raw=await req.text();if(raw.length>32000)return new Response(null,{status:413});
  const f=new URLSearchParams(raw);
  if(!signedForm(config.webhook+"/status"+url.search,f,req.headers.get("x-twilio-signature")||"",config.token)||f.get("AccountSid")!==config.sid)return new Response(null,{status:403});
  const sid=f.get("MessageSid"),status=f.get("MessageStatus");
  if(!sid||!/^SM[a-f0-9]{32}$/i.test(sid))return new Response(null,{status:400});
  const state=status==="delivered"||status==="read"?"delivered":status==="undelivered"||status==="failed"||status==="canceled"?"failed":status==="sent"||status==="queued"||status==="sending"||status==="accepted"?"accepted":null;
  if(state){const r=await createAdminClient().rpc("record_order_phone_part",{p_notice:id,p_part:Number(part),p_sid:sid,p_state:state});if(r.error)return new Response(null,{status:503});}
  return new Response(null,{status:204});
}
