import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { PINTEREST_SESSION, PINTEREST_STATE, boundedPinterestBody, openPinterest, pinterestAuth,
  pinterestConfig, pinterestCookie, privateHeaders, sealPinterest, stateMatches } from '@/lib/server/pinterest-import';
export const runtime = 'nodejs';
export async function GET(req: Request) {
  const config = pinterestConfig();
  if (!config) return NextResponse.json({ error: 'Pinterest is not connected.' }, { status: 503, headers: privateHeaders });
  const target = new URL('/design?tab=boards', config.origin);
  const response = NextResponse.redirect(target, 303);
  Object.entries(privateHeaders).forEach(([k,v]) => response.headers.set(k,v));
  response.cookies.set(PINTEREST_STATE, '', { ...pinterestCookie, maxAge: 0 });
  try {
    const auth = await pinterestAuth();
    if (!auth) throw Error();
    const saved = openPinterest((await cookies()).get(PINTEREST_STATE)?.value, config.secret, 'state', auth.user.id);
    const u = new URL(req.url), code = u.searchParams.get('code');
    if (u.searchParams.has('error') || !saved || !stateMatches(saved.nonce, u.searchParams.get('state')) || !code || code.length > 2000) throw Error();
    if (typeof saved.targetBoardId === 'string' && /^[0-9a-f-]{36}$/i.test(saved.targetBoardId)) target.searchParams.set('boardId', saved.targetBoardId);
    const r = await fetch('https://api.pinterest.com/v5/oauth/token', {
      method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${config.id}:${config.secret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: config.callback }),
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) throw Error();
    const d = JSON.parse((await boundedPinterestBody(r, 16384)).toString());
    const scopes = String(d.scope || '').split(/[ ,]+/);
    const requested = Array.isArray(saved.scopes) ? saved.scopes : ['boards:read','pins:read'];
    if (typeof d.access_token !== 'string' || !d.access_token || d.access_token.length > 2000 ||
      !requested.every((scope:string) => scopes.includes(scope)) || !scopes.includes('boards:read') || !scopes.includes('pins:read') || !Number.isFinite(d.expires_in) || d.expires_in < 60) throw Error();
    const maxAge = Math.min(3600, Math.floor(d.expires_in));
    response.cookies.set(PINTEREST_SESSION, sealPinterest({ userId: auth.user.id, token: d.access_token, expires: Date.now() + maxAge * 1000 }, config.secret, 'session'), { ...pinterestCookie, maxAge });
    target.searchParams.set('pinterest', 'connected');
  } catch { target.searchParams.set('pinterest', 'failed'); }
  response.headers.set('Location', target.href);
  return response;
}
