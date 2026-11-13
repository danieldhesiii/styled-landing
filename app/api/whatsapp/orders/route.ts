import { createAdminClient } from "@/lib/supabase/admin";
import { signedForm, whatsappConfig } from "@/lib/server/order-whatsapp";

const xml = (message?: string) => new Response(message ? `<Response><Message>${message}</Message></Response>` : "<Response/>",
  {headers:{"Content-Type":"text/xml","Cache-Control":"no-store"}});
export async function POST(req: Request) {
  const config = whatsappConfig();
  if (!config) return new Response(null,{status:503});
  if (!req.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded")) return new Response(null,{status:415});
  const raw = await req.text();
  if (raw.length > 32000) return new Response(null,{status:413});
  const form = new URLSearchParams(raw);
  if (!signedForm(config.webhook,form,req.headers.get("x-twilio-signature") || "",config.token) ||
      form.get("AccountSid") !== config.sid || form.get("To") !== config.sender) return new Response(null,{status:403});
  const phone = form.get("From")?.match(/^whatsapp:(\+[1-9]\d{7,14})$/)?.[1];
  const code = form.get("Body")?.trim().match(/^CONFIRM\s+([A-F0-9]{16})$/i)?.[1].toUpperCase();
  if (!phone || !code) return xml();
  const admin = createAdminClient();
  const {data:notice,error} = await admin.from("supplier_order_notices").select("id,supplier_id,sent_version")
    .eq("code",code).eq("recipient",phone).maybeSingle();
  if (error) return new Response(null,{status:503});
  if (!notice?.sent_version) return xml("Please check your order in the Styled supplier inbox.");
  const result = await admin.rpc("approve_supplier_order_notice",{
    p_notice:notice.id,p_supplier:notice.supplier_id,p_version:notice.sent_version,p_actor:null,p_channel:"whatsapp",
  });
  if (result.error) return xml("Please review this request in your supplier inbox.");
  return xml(result.data === "availability_confirmed" ? "Availability confirmed. Open this order in your Styled supplier inbox to enter prices, fees and hire terms: https://styledukprodprogress.vercel.app/portal/inbox" :
    "This request has changed or closed. Open your Styled supplier inbox to see its current status.");
}
