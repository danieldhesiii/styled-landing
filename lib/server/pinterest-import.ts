import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { requireUser } from './session';
import { createAdminClient } from '@/lib/supabase/admin';
import { pinterestId, pinterestImage, pinterestPhoto } from '@/lib/pinterest-import';

export const PINTEREST_SESSION = 'styled_pinterest';
export const PINTEREST_STATE = 'styled_pinterest_state';
export const privateHeaders = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' };
function enabled(flag: string, reference: string) {
  return process.env[flag] === 'true' && !!process.env[reference];
}
export function pinterestConfig() {
  const id = process.env.PINTEREST_APP_ID || '', secret = process.env.PINTEREST_APP_SECRET || '';
  // API read access and image reuse are separate gates. Pinterest API approval alone
  // does not authorize copying API content into Styled or sending it to an AI provider.
  const approved = enabled('PINTEREST_API_ENABLED', 'PINTEREST_API_APPROVAL_REFERENCE');
  try {
    const origin = new URL(process.env.NEXT_PUBLIC_SITE_URL || '');
    if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/') return null;
    if (!approved || !/^\d+$/.test(id) || secret.length < 20) return null;
    return { id, secret, origin: origin.origin, callback: `${origin.origin}/api/pinterest/callback` };
  } catch { return null; }
}
export function pinterestImageReuseEnabled() {
  return enabled('PINTEREST_IMAGE_REUSE_ENABLED', 'PINTEREST_IMAGE_REUSE_APPROVAL_REFERENCE');
}
function key(secret: string) { return createHash('sha256').update(`styled:pinterest-cookie:v1:${secret}`).digest(); }
export function sealPinterest(value: object, secret: string, purpose: string) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key(secret), iv);
  cipher.setAAD(Buffer.from(purpose));
  const payload = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), payload]).toString('base64url');
}
export function openPinterest(value: string | undefined, secret: string, purpose: string, userId: string, now = Date.now()): any | null {
  try {
    if (!value || value.length > 3800) return null;
    const raw = Buffer.from(value, 'base64url'), cipher = createDecipheriv('aes-256-gcm', key(secret), raw.subarray(0,12));
    cipher.setAAD(Buffer.from(purpose)); cipher.setAuthTag(raw.subarray(12,28));
    const body = JSON.parse(Buffer.concat([cipher.update(raw.subarray(28)), cipher.final()]).toString());
    return body.userId === userId && Number.isFinite(body.expires) && body.expires > now ? body : null;
  } catch { return null; }
}
export function stateMatches(left: unknown, right: unknown) {
  return typeof left === 'string' && typeof right === 'string' && /^[a-f0-9]{64}$/.test(left) &&
    /^[a-f0-9]{64}$/.test(right) && timingSafeEqual(Buffer.from(left), Buffer.from(right));
}
export const pinterestCookie = { httpOnly: true, secure: true, sameSite: 'lax' as const, path: '/api/pinterest' };
export async function pinterestAuth() {
  const auth = await requireUser();
  if (!auth.ok) return null;
  if (auth.user.is_anonymous || !auth.user.email_confirmed_at) return null;
  return auth;
}
export async function pinterestToken(userId: string, secret: string) {
  return openPinterest((await cookies()).get(PINTEREST_SESSION)?.value, secret, 'session', userId)?.token as string | undefined;
}
export async function pinterestRate(userId: string, action: string, limit = 90) {
  const r = await createAdminClient().rpc('hit_rate_limit', { p_key: `pinterest:${action}:${userId}`, p_limit: limit, p_window_seconds: 3600 });
  if (r.error || r.data !== true) throw Error('Please wait before importing more Pinterest images.');
}
export async function boundedPinterestBody(response: Response, limit: number): Promise<Buffer> {
  if (Number(response.headers.get('content-length')) > limit) throw Error('Pinterest returned a file that is too large.');
  const reader = response.body?.getReader();
  if (!reader) throw Error('Pinterest returned an empty response.');
  const chunks: Uint8Array[] = []; let length = 0;
  while (true) {
    const part = await reader.read(); if (part.done) break;
    length += part.value.length;
    if (length > limit) { await reader.cancel(); throw Error('Pinterest returned a file that is too large.'); }
    chunks.push(part.value);
  }
  return Buffer.concat(chunks);
}
export async function pinterestRequest(path: string, token: string, fetcher = fetch) {
  const r = await fetcher(`https://api.pinterest.com/v5/${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw Error(r.status === 401 ? 'Reconnect Pinterest to continue.' : 'Pinterest could not load those images. Please try again.');
  return JSON.parse((await boundedPinterestBody(r, 1024 * 1024)).toString());
}
export async function selectedPinterestImage(pinId: string, boardId: string, token: string, fetcher = fetch) {
  if (!pinterestId(pinId) || !pinterestId(boardId)) throw Error('Choose a Pinterest image from your board.');
  // Re-read the selected Pin with the user's token. Never download a client-supplied URL.
  const pin = await pinterestRequest(`pins/${pinId}`, token, fetcher);
  if (pin.board_id !== boardId) throw Error('This image is no longer on the selected board.');
  const photo = pinterestPhoto(pin);
  if (!photo || !pinterestImage(photo.image)) throw Error('This Pin does not have a supported image.');
  const r = await fetcher(photo.image, { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15000) });
  if (!r.ok || !/^image\/(jpeg|png|webp)(?:;|$)/i.test(r.headers.get('content-type') || ''))
    throw Error('Pinterest could not download this image.');
  // Below Vercel's response-size limit; larger images can use manual upload.
  return { photo, bytes: await boundedPinterestBody(r, 3 * 1024 * 1024), type: r.headers.get('content-type')!.split(';')[0] };
}
