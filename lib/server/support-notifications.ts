import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPPORT_EMAIL } from '@/lib/support';
import { environmentMatches } from '@/lib/pilot-readiness';
import { emailProvider } from '@/lib/email-provider';
import { trackedDelivery } from './email-delivery';
import { env } from './env';

export function supportEmailEnabled() {
  return process.env.ENABLE_SUPPORT_EMAILS === 'true' && !!emailProvider(env) && environmentMatches(env.supabaseUrl, env.siteUrl);
}

// The existing delivery ledger/provider callbacks distinguish acceptance from
// delivery. Uncertain or interrupted sends are held, never automatically retried.
export async function dispatchSupportNotifications(admin: SupabaseClient) {
  if (!supportEmailEnabled()) return { processed: 0, sendingEnabled: false };
  let processed = 0;
  try {
    const jobs = await admin.from('support_notifications').select('*')
      .in('status', ['queued', 'blocked', 'failed']).lt('attempts', 5)
      .lte('due_at', new Date().toISOString()).order('created_at').limit(5);
    if (jobs.error) return { processed, error: 'Could not load support notification queue.' };
    for (const job of jobs.data || []) {
      if (!supportEmailEnabled()) break;
      const claim = await admin.from('support_notifications').update({ status: 'sending',
        attempts: job.attempts + 1, attempted_at: new Date().toISOString(), last_error: null })
        .eq('id', job.id).eq('status', job.status).eq('attempts', job.attempts).select('id');
      if (claim.error || !claim.data?.length) continue;
      let status = 'blocked', reason: string | null = 'Email delivery is disabled.';
      let enteredDelivery = false;
      try {
        const request = await admin.from('support_requests').select('reference').eq('id', job.request_id).maybeSingle();
        if (request.error || !request.data) throw Error('Request unavailable');
        if (supportEmailEnabled()) {
          // No customer body, address, or reply-to is sent to the provider.
          // Staff must authenticate to read the saved request.
          const text = `A support request is saved: ${request.data.reference}.\nSign in to read and respond:\n${env.siteUrl}/admin/support`;
          enteredDelivery = true;
          const receipt = await trackedDelivery(admin, { to: [SUPPORT_EMAIL],
            subject: 'Styled: new support request', text,
            html: `<p>${text.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!)).replaceAll('\n', '<br>')}</p>` }, { supportJobId: job.id });
          status = receipt.accepted ? 'provider_accepted' : receipt.outcome === 'rejected' ? 'failed' : receipt.outcome === 'disabled' ? 'blocked' : 'unknown';
          reason = receipt.accepted ? null : status === 'unknown'
            ? 'Delivery may have occurred. Review the provider; do not retry.'
            : 'Delivery was not started or was definitely rejected.';
        }
      } catch {
        status = enteredDelivery ? 'unknown' : 'blocked';
        reason = enteredDelivery ? 'Delivery may have occurred. Review the provider; do not retry.' : 'Could not load the saved request. No email sent.';
      }
      const saved = await admin.from('support_notifications').update({ status, last_error: reason,
        due_at: new Date(Date.now() + 15 * 60_000).toISOString() }).eq('id', job.id).eq('status', 'sending');
      if (saved.error) return { processed, error: 'Could not save support delivery state. Sending jobs are held for review.' };
      processed++;
    }
    return { processed, sendingEnabled: true };
  } catch { return { processed, error: 'Could not process support notifications. Review the saved queue.' }; }
}
