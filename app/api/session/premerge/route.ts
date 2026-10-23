import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/session";
import { issueMergeProof, mergeCookieName, mergeCookieOptions, validMergeRequest } from "@/lib/server/guest-merge-proof";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const fail = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status, headers: { "Cache-Control": "no-store" } });

// Must run BEFORE sign-in replaces the anonymous session. The source ID comes
// exclusively from Supabase's server-validated current user, never request JSON.
export async function POST(req: Request) {
  if (!validMergeRequest(req)) return fail(403, "Guest transfer requires a same-site account form.");
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  if (!auth.user.is_anonymous) return fail(403, "Only the current guest session can prepare a transfer.");
  let body;
  try {
    const raw = await req.text();
    if (raw.length > 1024) return fail(400, "Invalid transfer request.");
    body = JSON.parse(raw);
  } catch { return fail(400, "Invalid transfer request."); }
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some(key => key !== "email") ||
    typeof body.email !== "string" || body.email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) return fail(400, "Enter the account email for this transfer.");
  try {
    const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(mergeCookieName, issueMergeProof(auth.user.id, body.email), mergeCookieOptions);
    return response;
  } catch { return fail(503, "Guest transfer could not be prepared. Your guest session has been kept. Please retry before signing in."); }
}
