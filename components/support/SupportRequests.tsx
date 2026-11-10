"use client";
import { useEffect, useState } from "react";
import { SUPPORT_TOPICS, type SupportTopic } from "@/lib/support";
export type SupportRequest = {
  id?: string;
  notification?: { id: string; status: string; attempts: number; last_error: string | null;
    delivery: { status: string; message_id: string | null } | null } | null;
  reference: string;
  account_email?: string;
  topic: SupportTopic;
  related_reference: string;
  message: string;
  status: string;
  reply: string;
  created_at: string;
  updated_at: string;
};
const statuses: Record<string, string> = {
  new: "Received",
  in_progress: "In progress",
  resolved: "Resolved",
};
export default function SupportRequests({
  staff = false,
}: {
  staff?: boolean;
}) {
  const [requests, setRequests] = useState<SupportRequest[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [refresh, setRefresh] = useState(0),
    [status, setStatus] = useState("open"),
    [page, setPage] = useState(0),
    [hasMore, setHasMore] = useState(false),
    [warning, setWarning] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    fetch(staff ? `/api/admin/support?status=${status}&page=${page}` : "/api/support", { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.error || "Could not load requests.");
        if (active) {
          setRequests(d.requests); setHasMore(!!d.hasMore); setWarning(d.notificationWarning || "");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [staff, refresh, status, page]);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-ink/70">
          {staff
            ? "Open a question to reply or update its status."
            : "Replies from Styled appear here."}
        </p>
        <button
          type="button"
          disabled={loading}
          onClick={() => setRefresh((v) => v + 1)}
          className="min-h-11 shrink-0 text-sm underline"
        >
          Refresh
        </button>
      </div>
      {staff && <label className="block text-sm">Show requests
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(0); }} className="ml-3 min-h-11 rounded-xl border border-sand bg-white px-3">
          <option value="open">Open questions</option><option value="new">Received</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="all">All requests</option>
        </select>
      </label>}
      {staff && warning && <p role="alert" className="rounded-xl bg-blush/30 p-4 text-sm">{warning}</p>}
      {loading ? (
        <p role="status">Loading requests…</p>
      ) : error ? (
        <p role="alert" className="text-sm">
          {error}
        </p>
      ) : !requests.length ? (
        <p className="rounded-xl bg-cream p-5 text-sm">
          {staff
            ? "No support requests yet."
            : "You have no support requests yet. Ask a question to get started."}
        </p>
      ) : (
        requests.map((r) => (
          <details
            key={r.reference}
            className="rounded-xl border border-sand bg-white p-4"
          >
            <summary className="cursor-pointer break-words text-sm">
              <span className="font-medium">{SUPPORT_TOPICS[r.topic]}</span>
              <span className="ml-2 rounded-full bg-sage/15 px-2 py-1 text-xs">
                {statuses[r.status]}
              </span>
              <span className="mt-2 block text-xs text-ink/60">
                {r.reference} ·{" "}
                {new Date(r.created_at).toLocaleDateString("en-GB")}
                {staff && r.account_email ? ` · ${r.account_email}` : ""}
              </span>
            </summary>
            <div className="mt-4 space-y-4 text-sm">
              {r.related_reference && (
                <p>Related request or listing: {r.related_reference}</p>
              )}
              <p className="whitespace-pre-wrap break-words">{r.message}</p>
              {r.reply && (
                <div className="rounded-xl bg-sage/10 p-4">
                  <p className="mb-2 font-medium">Latest reply from Styled</p>
                  <p className="whitespace-pre-wrap break-words">{r.reply}</p>
                </div>
              )}
              {staff && <NotificationState request={r} onQueued={() => setRefresh(v => v + 1)} />}
              {staff && (
                <ReplyEditor
                  request={r}
                  onSaved={() => setRefresh((v) => v + 1)}
                />
              )}
            </div>
          </details>
        ))
      )}
      {staff && !loading && (page > 0 || hasMore) && <nav aria-label="Support pages" className="flex items-center gap-5 text-sm">
        <button disabled={!page} onClick={() => setPage(p => p - 1)} className="min-h-11 underline disabled:opacity-40">Previous</button>
        <span>Page {page + 1}</span><button disabled={!hasMore} onClick={() => setPage(p => p + 1)} className="min-h-11 underline disabled:opacity-40">Next</button>
      </nav>}
      {!staff && !loading && requests.length >= 50 && (
        <p className="text-xs text-ink/60">
          Showing the latest {staff ? 100 : 50} requests.
        </p>
      )}
    </div>
  );
}
function ReplyEditor({
  request: r,
  onSaved,
}: {
  request: SupportRequest;
  onSaved: () => void;
}) {
  const [reply, setReply] = useState(r.reply),
    [status, setStatus] = useState(r.status),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className="space-y-3 border-t border-sand pt-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setError("");
        try {
          const res = await fetch("/api/admin/support", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: r.id,
              updatedAt: r.updated_at,
              reply,
              status,
            }),
          });
          const d = await res.json();
          if (!res.ok) throw Error(d.error);
          onSaved();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Could not save.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="block">
        Reply visible to the customer
        <textarea
          aria-label={`Reply for ${r.reference}`}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          maxLength={4000}
          rows={5}
          className="mt-2 w-full rounded-xl border border-sand p-3"
          disabled={busy}
        />
      </label>
      <p className="text-sm text-ink/60">
        Reply saved in Styled only; no automatic email.
      </p>
      <label className="block">
        Status
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="ml-3 rounded-lg border border-sand p-2"
          disabled={busy}
        >
          {Object.entries(statuses).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {error && <p role="alert">{error}</p>}
      <button
        disabled={busy}
        className="min-h-11 rounded-full bg-ink px-5 py-2 text-cream"
      >
        {busy ? "Saving…" : "Save reply and status"}
      </button>
    </form>
  );
}

function NotificationState({ request, onQueued }: { request: SupportRequest; onQueued: () => void }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const job = request.notification;
  const labels: Record<string, string> = { queued: "Queued — sending must be enabled", blocked: "Blocked — needs attention", sending: "Send started — review if interrupted", provider_accepted: "Provider accepted — delivery unconfirmed", failed: "Rejected — retry available", unknown: "Delivery uncertain — do not retry" };
  return <div className="rounded-xl bg-cream p-4">
    <p className="font-medium">Staff email notification</p>
    <p className="mt-2">{job ? labels[job.status] || job.status : "No staff email recorded. Request saved."}</p>
    {job?.delivery && <p className="mt-2 break-words">Provider report: {job.delivery.status}</p>}
    {job?.delivery?.message_id && <details className="mt-2"><summary className="min-h-11 cursor-pointer py-3">Provider message reference</summary><p className="break-words">{job.delivery.message_id}</p></details>}
    {job?.last_error && <p className="mt-2">{job.last_error}</p>}
    {job && job.attempts >= 5 && <p className="mt-2">Attempt limit reached. Check the provider before retrying.</p>}
    {job && ["blocked", "failed"].includes(job.status) && job.attempts < 5 && <button type="button" disabled={busy} className="mt-2 min-h-11 underline" onClick={async () => {
      setBusy(true); setError("");
      try { const r = await fetch("/api/admin/support", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: job.id }) }); const d = await r.json(); if (!r.ok) throw Error(d.error || "Could not queue retry."); onQueued(); }
      catch(e) { setError(e instanceof Error ? e.message : "Could not queue retry."); } finally { setBusy(false); }
    }}>{busy ? "Queueing…" : "Queue safe retry"}</button>}
    {error && <p role="alert" className="mt-2">{error}</p>}
  </div>;
}
