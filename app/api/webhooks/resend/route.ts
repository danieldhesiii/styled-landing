import {NextResponse} from 'next/server';
import {createAdminClient} from '@/lib/supabase/admin';
import {parseResendDeliveryEvent, resendWebhookConfigured, verifyResendWebhook} from '@/lib/server/resend-webhook';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!resendWebhookConfigured(secret)) return new Response(null, {status: 401});
  let raw: Buffer;
  try {
    const reader = req.body?.getReader();
    if (!reader) return new Response(null, {status: 400});
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 65536) { await reader.cancel(); return new Response(null, {status: 413}); }
      chunks.push(value);
    }
    raw = Buffer.concat(chunks);
  } catch { return new Response(null, {status: 400}); }
  if (!verifyResendWebhook(raw, req.headers, secret)) return new Response(null, {status: 401});
  let event;
  try {
    event = parseResendDeliveryEvent(JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(raw)), req.headers.get('svix-id')!);
  } catch { return NextResponse.json({error: 'Invalid delivery event.'}, {status: 400}); }
  if (event) {
    try {
      const result = await createAdminClient().rpc('apply_booking_email_event', event);
      if (result.error) return NextResponse.json({error: 'Please retry this delivery event.'}, {status: 503});
    } catch { return NextResponse.json({error: 'Please retry this delivery event.'}, {status: 503}); }
  }
  // Authenticated events for untracked mail are deliberately acknowledged.
  return NextResponse.json({ok: true});
}
