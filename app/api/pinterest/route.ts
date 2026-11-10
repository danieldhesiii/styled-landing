import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { supplierJson } from '@/lib/server/supplier-body';
import { pinterestId, pinterestPhoto } from '@/lib/pinterest-import';
import { PINTEREST_SESSION, PINTEREST_STATE, pinterestAuth, pinterestConfig, pinterestCookie,
  pinterestImageReuseEnabled, pinterestRate, pinterestRequest, pinterestToken, privateHeaders, sealPinterest, selectedPinterestImage } from '@/lib/server/pinterest-import';
export const runtime = 'nodejs';
function error(message: string, status: number) { return NextResponse.json({ error: message }, { status, headers: privateHeaders }); }
export async function GET(req: Request) {
  const config = pinterestConfig();
  if (!config) return NextResponse.json({ enabled: false, connected: false }, { headers: privateHeaders });
  const auth = await pinterestAuth();
  if (!auth) return error('Log in with a verified Styled account to connect Pinterest.', 401);
  const token = await pinterestToken(auth.user.id, config.secret);
  const url = new URL(req.url), action = url.searchParams.get('action') || 'status';
  if (action === 'status') return NextResponse.json({ enabled: true, connected: !!token, imageReuseEnabled: pinterestImageReuseEnabled() }, { headers: privateHeaders });
  if (!token) return error('Connect Pinterest to choose your images.', 401);
  try {
    if (!['boards','pins'].includes(action)) return error('Choose boards or images.', 400);
    const bookmark = url.searchParams.get('bookmark') || '';
    if (bookmark.length > 2000) return error('Invalid page.', 400);
    const board = url.searchParams.get('boardId');
    if (action === 'pins' && !pinterestId(board)) return error('Choose a Pinterest board.', 400);
    await pinterestRate(auth.user.id, 'read');
    const query = new URLSearchParams({ page_size: '25' });
    if (bookmark) query.set('bookmark', bookmark);
    const d = await pinterestRequest(`${action === 'boards' ? 'boards' : `boards/${board}/pins`}?${query}`, token);
    const items = Array.isArray(d.items) ? d.items.slice(0,25) : [];
    const mapped = action === 'boards' ? items.filter((b:any) => pinterestId(b.id)).map((b:any) => ({ id: b.id, name: String(b.name || 'Pinterest board').slice(0,150) })) : items.map(pinterestPhoto).filter(Boolean);
    return NextResponse.json({ items: mapped, bookmark: typeof d.bookmark === 'string' ? d.bookmark : null }, { headers: privateHeaders });
  } catch { return error('Pinterest could not load this page. Try reconnecting if the problem continues.', 502); }
}
export async function POST(req: Request) {
  const auth = await pinterestAuth();
  if (!auth) return error('Log in with a verified Styled account to connect Pinterest.', 401);
  try {
    const body = await supplierJson(req, 4000);
    if (body.action === 'disconnect') {
      const response = NextResponse.json({ ok: true }, { headers: privateHeaders });
      for (const name of [PINTEREST_SESSION, PINTEREST_STATE]) response.cookies.set(name, '', { ...pinterestCookie, maxAge: 0 });
      return response;
    }
    const config = pinterestConfig();
    if (!config) return error('Direct Pinterest importing is not connected yet. Upload images you have permission to use.', 503);
    if (body.action === 'image' && !pinterestImageReuseEnabled()) return error('Pinterest image copying and AI use are not enabled. You can view the Pins here or upload an image you have permission to use.', 403);
    await pinterestRate(auth.user.id, 'write', 30);
    if (body.action === 'connect') {
      if (body.targetBoardId !== undefined && (typeof body.targetBoardId !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.targetBoardId))) return error('Choose a Styled board.', 400);
      const nonce = randomBytes(32).toString('hex'), expires = Date.now() + 10 * 60 * 1000;
      const scopes = ['boards:read','pins:read'];
      const url = new URL('https://www.pinterest.com/oauth/');
      url.search = new URLSearchParams({ client_id: config.id, redirect_uri: config.callback, response_type: 'code', scope: scopes.join(','), state: nonce }).toString();
      const response = NextResponse.json({ url: url.href }, { headers: privateHeaders });
      response.cookies.set(PINTEREST_STATE, sealPinterest({ userId: auth.user.id, nonce, expires, scopes, targetBoardId: body.targetBoardId }, config.secret, 'state'), { ...pinterestCookie, maxAge: 600 });
      return response;
    }
    if (body.action !== 'image' || body.permission !== true) return error('Confirm permission to use the selected image as AI inspiration.', 400);
    const token = await pinterestToken(auth.user.id, config.secret);
    if (!token) return error('Reconnect Pinterest to continue.', 401);
    const result = await selectedPinterestImage(body.pinId, body.boardId, token);
    return new Response(new Uint8Array(result.bytes), { headers: { ...privateHeaders, 'Content-Type': result.type, 'X-Content-Type-Options': 'nosniff' } });
  } catch { return error('Could not import this image. Try again, or download it on Pinterest and upload it here.', 422); }
}
