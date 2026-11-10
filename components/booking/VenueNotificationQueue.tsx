'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
type Job = { id: string; request_id: string; audience: string; status: string; attempts: number; due_at: string; last_error: string | null; venue_enquiries?: { venue_id: string; venue_listings: { name: string } | null } | null; booking_email_deliveries: { status: string; delivered_at: string | null }[] };
type Queue = { jobs: Job[]; truncated: boolean; emailEnabled: boolean };
const button = 'min-h-11 rounded-full border border-sand px-4 py-2 text-sm disabled:opacity-40';
export default function VenueNotificationQueue() {
  const [data, setData] = useState<Queue | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  async function load() {
    const response = await fetch('/api/admin/venue-notifications', { cache: 'no-store' }), body = await response.json();
    if (!response.ok) throw Error(body.error || 'Could not load venue notifications.');
    setData(body);
  }
  async function act(body?: { action: string; jobId?: string }) {
    setBusy(true); setError('');
    try {
      if (body) {
        const response = await fetch('/api/admin/venue-notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const result = await response.json();
        if (!response.ok) throw Error(result.error || 'Could not process notifications.');
      }
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load notifications.'); }
    finally { setBusy(false); }
  }
  useEffect(() => { void act(); }, []);
  return <section>
    <Link href="/admin/operations" className="mb-5 inline-flex min-h-11 items-center text-sm underline">Back to Service checks</Link>
    <h1 className="font-serif text-4xl">Venue conversation notifications</h1>
    <p className="mt-4 text-sm leading-relaxed text-ink/70">{data?.emailEnabled ? 'Sending is enabled.' : 'Sending disabled. Updates remain saved.'} Private messages stay in Styled. Check provider reports for delivery.</p>
    <p className="mt-3 text-sm text-ink/70">Unknown or interrupted sends need review; do not resend.</p>
    <details className="mt-2 text-sm text-ink/65"><summary className="min-h-11 cursor-pointer py-3">Retry limits</summary><p>Definite failures wait 15 minutes between attempts, up to five attempts.</p></details><div className="mt-5 flex gap-3"><button className={button} disabled={busy} onClick={() => void act()}>Refresh</button><button className={button} disabled={busy || !data?.emailEnabled} onClick={() => void act({ action: 'process_due' })}>Process due notices</button></div>
    {error && <p role="alert" className="mt-4 text-clay">{error}</p>}
    {data?.truncated && <p className="mt-4 text-sm">Showing the latest 100 notices.</p>}
    <div className="mt-6 divide-y divide-sand">{data?.jobs.map(job => <article key={job.id} className="py-5 text-sm">
      <p className="font-medium">{job.venue_enquiries?.venue_listings?.name || 'Venue request'} · {job.venue_enquiries?.venue_id ? <Link className="underline" href={`/admin/venues/${job.venue_enquiries.venue_id}/enquiries`}>Request {job.request_id.slice(0, 8).toUpperCase()}</Link> : <span>Request {job.request_id.slice(0, 8).toUpperCase()}</span>}</p><p className="mt-2">To {job.audience} · {job.status.replaceAll('_', ' ')} · Attempts {job.attempts}/5</p>
      <p className="mt-2">Next check: {new Date(job.due_at).toLocaleString('en-GB')}</p>
      {job.last_error && <p className="mt-2 text-clay">{job.last_error}</p>}
      <ul className="mt-2">{job.booking_email_deliveries?.map((delivery, i) => <li key={i}>Recipient {i + 1}: {delivery.status.replaceAll('_', ' ')}{delivery.delivered_at ? ` · Delivered ${new Date(delivery.delivered_at).toLocaleString('en-GB')}` : ''}</li>)}</ul>
      {['queued', 'blocked', 'failed'].includes(job.status) && <button className={`${button} mt-3`} disabled={busy || !data?.emailEnabled || job.attempts >= 5 || Date.parse(job.due_at) > Date.now()} onClick={() => void act({ action: 'retry', jobId: job.id })}>Process this notice</button>}
    </article>)}{data && !data.jobs.length && <p className="py-5 text-sm">No venue conversation notices yet.</p>}</div>
  </section>;
}
