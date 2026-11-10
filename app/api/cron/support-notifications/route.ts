import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { dispatchSupportNotifications, supportEmailEnabled } from '@/lib/server/support-notifications';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = Buffer.from(req.headers.get('authorization') || '');
  const expected = Buffer.from(`Bearer ${secret || ''}`);
  if (!secret || provided.length !== expected.length || !timingSafeEqual(provided, expected))
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  if (!supportEmailEnabled()) return NextResponse.json({ ok: true, processed: 0, sendingEnabled: false });
  const result = await dispatchSupportNotifications(createAdminClient());
  return NextResponse.json({ ok: !('error' in result), ...result }, { status: 'error' in result ? 503 : 200 });
}
