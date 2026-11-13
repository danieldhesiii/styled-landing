import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { dispatchSupportNotifications, supportEmailEnabled } from '@/lib/server/support-notifications';
import { dispatchApplicationNotifications } from '@/lib/server/application-notifications';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = Buffer.from(req.headers.get('authorization') || '');
  const expected = Buffer.from(`Bearer ${secret || ''}`);
  if (!secret || provided.length !== expected.length || !timingSafeEqual(provided, expected))
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  const admin = createAdminClient();
  const [applications, result] = await Promise.all([dispatchApplicationNotifications(admin), supportEmailEnabled() ? dispatchSupportNotifications(admin) : Promise.resolve({ processed: 0, sendingEnabled: false })]);
  return NextResponse.json({ ok: !('error' in result) && !('error' in applications), ...result, applications }, { status: 'error' in result || 'error' in applications ? 503 : 200 });
}
