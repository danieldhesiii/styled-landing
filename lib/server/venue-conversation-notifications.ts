import type { SupabaseClient } from '@supabase/supabase-js';
import { bookingEmailEnabled } from './booking-notifications';
import { trackedDelivery } from './email-delivery';
import { env } from './env';

const retryable = ['queued', 'blocked', 'failed'];
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

// All recipients are resolved at send time. Never use enquiry email, venue contact
// fields, or staff membership as substitutes for current verified participants.
async function recipients(admin: SupabaseClient, request: { owner_user_id: string | null; venue_id: string }, audience: string) {
  let ids: string[];
  if (audience === 'customer') ids = request.owner_user_id ? [request.owner_user_id] : [];
  else {
    const links = await admin.from('venue_users').select('user_id').eq('venue_id', request.venue_id);
    if (links.error) throw Error('Could not resolve current venue members.');
    ids = (links.data || []).map(row => row.user_id).filter(id => id !== request.owner_user_id);
  }
  const emails: string[] = [];
  for (const id of new Set(ids)) {
    const result = await admin.auth.admin.getUserById(id);
    if (result.error) throw Error('Could not verify current recipient accounts.');
    const user = result.data.user;
    if (user && !user.is_anonymous && user.email_confirmed_at && user.email &&
      (!user.banned_until || Date.parse(user.banned_until) <= Date.now()) &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email) && !user.email.toLowerCase().endsWith('.invalid')) emails.push(user.email.trim().toLowerCase());
  }
  return [...new Set(emails)];
}

export async function dispatchVenueConversationNotifications(admin: SupabaseClient, requestId?: string, jobId?: string) {
  // Disabled means zero sends, ledger writes, claims or attempt consumption.
  if (!bookingEmailEnabled()) return { processed: 0, sendingEnabled: false };
  let processed = 0;
  try {
    let query = admin.from('venue_conversation_notifications').select('*').in('status', retryable)
      .lt('attempts', 5).lte('due_at', new Date().toISOString()).order('created_at').limit(10);
    if (requestId) query = query.eq('request_id', requestId);
    if (jobId) query = query.eq('id', jobId);
    const jobs = await query;
    if (jobs.error) return { processed, error: 'Could not load venue notification queue.' };
    for (const job of jobs.data || []) {
      if (!bookingEmailEnabled()) break;
      const claim = await admin.from('venue_conversation_notifications').update({ status: 'sending',
        attempts: job.attempts + 1, attempted_at: new Date().toISOString(), last_error: null })
        .eq('id', job.id).eq('status', job.status).eq('attempts', job.attempts).select('id');
      if (claim.error || !claim.data?.length) continue;
      let status = 'blocked', reason: string | null = 'No verified participant is available.';
      // Any exception after entering delivery is uncertain. Never retry a possibly
      // accepted send, even when persisting its final state failed.
      let enteredDelivery = false;
      try {
        const request = await admin.from('venue_enquiries').select('id,venue_id,owner_user_id').eq('id', job.request_id).maybeSingle();
        const message = await admin.from('venue_request_messages').select('id,request_id,sender_kind').eq('id', job.message_id).maybeSingle();
        if (request.error || message.error || !request.data || !message.data || message.data.request_id !== job.request_id ||
          job.audience !== (message.data.sender_kind === 'customer' ? 'venue' : 'customer')) throw Error('Could not verify this conversation notification.');
        const to = await recipients(admin, request.data, job.audience);
        if (to.length && bookingEmailEnabled()) {
          const url = `${env.siteUrl}${job.audience === 'venue' ? '/venue-portal' : '/venues/requests'}`;
          const text = `There is a new update in your Styled venue conversation. Sign in to read and respond:\n\n${url}\n\nThis notice does not confirm a booking or collect payment.`;
          enteredDelivery = true;
          const receipt = await trackedDelivery(admin, { to, subject: 'Styled: venue conversation update', text,
            html: `<p>${escape(text).replaceAll('\n', '<br>')}</p>` }, { venueJobId: job.id });
          status = receipt.accepted ? 'provider_accepted' : receipt.outcome === 'rejected' ? 'failed' : receipt.outcome === 'disabled' ? 'blocked' : 'unknown';
          reason = receipt.accepted ? null : status === 'unknown' ? 'Delivery may have occurred. Review the provider; do not retry.' : 'Delivery was not started or was definitely rejected.';
        }
      } catch {
        status = enteredDelivery ? 'unknown' : 'blocked';
        reason = enteredDelivery ? 'Delivery may have occurred. Review the provider; do not retry.' : 'Could not verify current conversation participants. No email sent.';
      }
      const saved = await admin.from('venue_conversation_notifications').update({ status, last_error: reason,
        due_at: new Date(Date.now() + 15 * 60_000).toISOString() }).eq('id', job.id).eq('status', 'sending');
      if (saved.error) return { processed, error: 'Could not save delivery state. Sending jobs are held for review.' };
      processed++;
    }
    return { processed, sendingEnabled: true };
  } catch { return { processed, error: 'Could not process venue notifications. Review the saved queue.' }; }
}
