import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/server/staff';
import { supplierJson } from '@/lib/server/supplier-body';
import { bookingEmailEnabled } from '@/lib/server/booking-notifications';
import { dispatchVenueConversationNotifications } from '@/lib/server/venue-conversation-notifications';
import { UUID } from '@/lib/pilot-readiness';
const headers = { 'Cache-Control': 'private, no-store' };
export async function GET(req: Request) {
  const auth = await requireStaff(req);
  if (!auth.ok) return auth.response;
  const result = await auth.admin.from('venue_conversation_notifications')
    .select('id,request_id,audience,status,attempts,due_at,attempted_at,last_error,created_at,venue_enquiries(venue_id,venue_listings(name)),booking_email_deliveries(status,last_event_at,delivered_at)')
    .order('created_at', { ascending: false }).limit(101);
  if (result.error) return NextResponse.json({ error: 'Could not load venue notifications.' }, { status: 503, headers });
  return NextResponse.json({ jobs: (result.data || []).slice(0, 100), truncated: (result.data || []).length > 100, emailEnabled: bookingEmailEnabled() }, { headers });
}
export async function POST(req: Request) {
  const auth = await requireStaff(req);
  if (!auth.ok) return auth.response;
  try {
    // Requires a same-origin JSON request, including a present Origin header.
    const body = await supplierJson(req, 4000);
    if (body.action !== 'process_due' && body.action !== 'retry') throw Error('Choose an available action.');
    if (body.action === 'retry' && (typeof body.jobId !== 'string' || !UUID.test(body.jobId))) throw Error('Choose a notification.');
    const rate = await auth.admin.rpc('hit_rate_limit', { p_key: `venue-notifications:${auth.user.id}`, p_limit: 30, p_window_seconds: 3600 });
    if (rate.error || rate.data !== true) return NextResponse.json({ error: 'Please wait before processing more notifications.' }, { status: 429, headers });
    if (body.action === 'retry') {
      const job = await auth.admin.from('venue_conversation_notifications').select('status,attempts,due_at').eq('id', body.jobId).maybeSingle();
      if (job.error || !job.data) throw Error('Notification not found.');
      if (!['queued', 'blocked', 'failed'].includes(job.data.status) || job.data.attempts >= 5) throw Error('This notification is held for review and cannot be retried.');
      if (Date.parse(job.data.due_at) > Date.now()) throw Error('Wait until this notification is due.');
    }
    const result = await dispatchVenueConversationNotifications(auth.admin, undefined, body.action === 'retry' ? body.jobId : undefined);
    if (result.error) return NextResponse.json({ error: result.error }, { status: 503, headers });
    return NextResponse.json({ ok: true, ...result }, { headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not process notifications.' }, { status: 422, headers });
  }
}
