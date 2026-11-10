import {createHash, createHmac, timingSafeEqual} from 'node:crypto';
import {recipientHash} from './email-delivery';
import {UUID} from '@/lib/pilot-readiness';

function signingKey(secret: string | undefined): Buffer | null {
  if (!secret?.startsWith('whsec_')) return null;
  const encoded = secret.slice(6);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) return null;
  const key = Buffer.from(encoded, 'base64');
  return key.length >= 16 && key.toString('base64').replace(/=+$/, '') === encoded.replace(/=+$/, '') ? key : null;
}

export const resendWebhookConfigured = (secret: string | undefined) => signingKey(secret) !== null;

// Resend/Svix: HMAC-SHA256 over id.timestamp.rawBody, accepting any v1
// signature during rotation. Verify attempt time (not event time) in both directions.
export function verifyResendWebhook(body: Uint8Array, headers: Headers, secret: string | undefined, now = Date.now()): boolean {
  const key = signingKey(secret), id = headers.get('svix-id'), timestamp = headers.get('svix-timestamp'), signatures = headers.get('svix-signature');
  if (!key || !id || id.length > 500 || !timestamp || !/^[0-9]{1,12}$/.test(timestamp) || !signatures || signatures.length > 8192) return false;
  if (Math.abs(Math.floor(now / 1000) - Number(timestamp)) > 300) return false;
  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.`).update(body).digest();
  return signatures.split(/\s+/).some(signature => {
    if (!/^v1,[A-Za-z0-9+/]{43}=$/.test(signature)) return false;
    const supplied = Buffer.from(signature.slice(3), 'base64');
    return supplied.length === expected.length && timingSafeEqual(supplied, expected);
  });
}

const STATUS: Record<string, string> = {
  'email.sent': 'accepted', 'email.delivered': 'delivered',
  'email.delivery_delayed': 'deferred', 'email.bounced': 'bounced',
  'email.complained': 'complaint', 'email.failed': 'failed', 'email.suppressed': 'blocked',
};

export function parseResendDeliveryEvent(body: any, webhookId: string) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.type !== 'string') throw Error('Invalid delivery event.');
  if (!Object.hasOwn(STATUS, body.type)) return null;
  const data = body.data;
  // Tracked Resend sends have exactly one recipient. Never fan a failure out
  // to every address in an ambiguous legacy multi-recipient message.
  if (!data || typeof data.email_id !== 'string' || !UUID.test(data.email_id) || !Array.isArray(data.to) || data.to.length !== 1) throw Error('Invalid delivery event.');
  const email = data.to[0];
  if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Error('Invalid recipient.');
  if (typeof body.created_at !== 'string' || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(body.created_at)) throw Error('Missing event timestamp.');
  const at = new Date(body.created_at), now = Date.now();
  if (!Number.isFinite(at.getTime()) || at.getTime() > now + 300000 || at.getTime() < now - 90 * 86400000) throw Error('Invalid event timestamp.');
  const tag = data.tags?.styled_delivery;
  if (tag !== undefined && (typeof tag !== 'string' || !UUID.test(tag))) throw Error('Invalid delivery reference.');
  const recipient = recipientHash(email);
  return {
    p_provider: 'resend', p_run: tag ?? null, p_message: data.email_id, p_recipient: recipient,
    p_status: STATUS[body.type], p_at: at.toISOString(),
    p_key: createHash('sha256').update(JSON.stringify(['resend', webhookId, recipient])).digest('hex'),
  };
}
