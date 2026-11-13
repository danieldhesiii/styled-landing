import { createHmac, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export function whatsappConfig() {
  const sid = process.env.TWILIO_ACCOUNT_SID, token = process.env.TWILIO_AUTH_TOKEN;
  const sender = process.env.TWILIO_WHATSAPP_FROM;
  const site = "https://styledukprodprogress.vercel.app";
  if (process.env.ENABLE_ORDER_WHATSAPP !== "true" || process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") !== site ||
      process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://qkyeitvwscrxbiwamxan.supabase.co" ||
      !sid || !/^AC[0-9a-f]{32}$/i.test(sid) || !token || !sender || !/^whatsapp:\+[1-9]\d{7,14}$/.test(sender)) return null;
  return { sid, token, sender, webhook: site + "/api/whatsapp/orders" };
}

export function signedForm(url: string, form: URLSearchParams, signature: string, token: string) {
  const keys = [...form.keys()].sort();
  if (keys.length !== new Set(keys).size) return false;
  const input = url + keys.map(k => k + form.get(k)).join("");
  const expected = createHmac("sha1", token).update(input).digest("base64");
  const supplied = Buffer.from(signature);
  return supplied.length === expected.length && timingSafeEqual(supplied, Buffer.from(expected));
}

export function orderMessageParts(summary: string, code: string) {
  const chars = Array.from(summary);
  const parts: string[] = [];
  for (let i = 0; i < chars.length; i += 700) parts.push(chars.slice(i, i + 700).join(""));
  if (!parts.length) parts.push("");
  parts[parts.length - 1] += "\n\nTo confirm availability for these items, reply CONFIRM " + code;
  return parts;
}

export async function dispatchOrderWhatsApp(admin: SupabaseClient, orderId?: string) {
  const config = whatsappConfig();
  if (!config) return;
  let query = admin.from("supplier_order_notices").select("id,code,recipient,supplier_id")
    .eq("delivery", "queued").order("created_at").limit(20);
  if (orderId) query = query.eq("order_id", orderId);
  const { data: jobs, error } = await query;
  if (error) throw error;
  for (const job of jobs || []) {
    const { data: recipient, error: recipientError } = await admin.from("supplier_whatsapp_recipients").select("phone")
      .eq("supplier_id", job.supplier_id).eq("phone", job.recipient).maybeSingle();
    const { data: card, error: cardError } = await admin.from("supplier_order_inbox").select("summary,status,version")
      .eq("id", job.id).single();
    if (recipientError || cardError) continue;
    if (!recipient || card.status !== "awaiting_approval") {
      await admin.from("supplier_order_notices").update({delivery:"skipped"}).eq("id",job.id).eq("delivery","queued");
      continue;
    }
    const parts = orderMessageParts(card.summary, job.code);
    const claim = await admin.from("supplier_order_notices").update({delivery:"sending",sent_version:card.version,part_count:parts.length})
      .eq("id",job.id).eq("delivery","queued").select("id");
    if (!claim.data?.length) continue;
    let delivery = "sent";
    try {
      for (const [index, part] of parts.entries()) {
        const body = parts.length === 1 ? part : `(${index+1}/${parts.length}) ${part}`;
        const fields = new URLSearchParams({ From: config.sender, To: "whatsapp:" + recipient.phone });
        fields.set("StatusCallback",config.webhook+"/status?notice="+job.id+"&part="+index);
        const template = process.env.TWILIO_ORDER_CONTENT_SID;
        if (template) {
          fields.set("ContentSid", template);
          fields.set("ContentVariables", JSON.stringify({ "1": body.replace(/\s+/g, " ").trim() }));
        } else {
          fields.set("Body", body);
        }
        const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${config.sid}/Messages.json`, {
          method:"POST", headers:{Authorization:"Basic "+Buffer.from(config.sid+":"+config.token).toString("base64")},
          body:fields,
          signal:AbortSignal.timeout(6000),
        });
        if (!response.ok) {
          const reason = await response.json().catch(() => null);
          const code = reason?.code;
          console.warn("[orders] WhatsApp provider rejected dispatch", {
            http: response.status,
            code: typeof code === "number" && Number.isSafeInteger(code) ? code : null,
          });
          delivery = response.status < 500 && index === 0 ? "failed" : "unknown";
          break;
        }
        const ack = await response.json();
        if(!/^SM[a-f0-9]{32}$/i.test(ack.sid||"")){delivery="unknown";break;}
        const receipt=await admin.rpc("record_order_phone_part",{p_notice:job.id,p_part:index,p_sid:ack.sid,p_state:"accepted"});
        if(receipt.error){delivery="unknown";break;}
      }
    } catch { delivery = "unknown"; }
    await admin.from("supplier_order_notices").update({delivery}).eq("id",job.id).eq("delivery","sending");
  }
}
