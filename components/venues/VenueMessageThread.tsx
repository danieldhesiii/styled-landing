"use client";
import { useCallback, useEffect, useState } from "react";
import { venueNextStep } from "@/lib/venue-workflow";
type Message = { id: string; body: string; sender_kind: string; created_at: string };
export default function VenueMessageThread({ requestId, status, nextActor }: { requestId: string; status: string; nextActor?: string }) {
  const [open, setOpen] = useState(false), [messages, setMessages] = useState<Message[] | null>(null);
  const [actor, setActor] = useState(nextActor), [text, setText] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const load = useCallback(async () => {
    const r = await fetch(`/api/venue-follow-up?id=${encodeURIComponent(requestId)}`, { cache: "no-store" });
    const d = await r.json();
    if (!r.ok) throw Error(d.error || "Could not load messages.");
    setMessages(d.messages); setActor(d.nextActor);
  }, [requestId]);
  useEffect(() => { setActor(nextActor); }, [nextActor, status]);
  useEffect(() => {
    if (open) void load().catch((e) => setError(e.message));
  }, [open, load, status, nextActor]);
  return <div className="mt-5 text-sm">
    <p role="status">{venueNextStep(status, actor)}</p>
    <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="mt-3 underline">{open ? "Hide conversation" : "Open conversation"}</button>
    {open && <div className="mt-4 rounded-xl border border-sand p-4">
      <p className="text-xs text-ink/60">Messages stay with this request and are visible to its customer and venue team. Latest 100 messages shown.</p>
      {messages === null && !error && <p role="status" className="mt-3">Loading conversation…</p>}
      {messages?.length === 0 && <p className="mt-3">No follow-up messages yet.</p>}
      {messages?.map((m) => <div key={m.id} className="mt-4 border-b border-sand pb-3">
        <p className="text-xs text-ink/60">{m.sender_kind === "customer" ? "Couple" : "Venue team"} · {new Date(m.created_at).toLocaleString("en-GB", { timeZone: "Europe/London" })}</p>
        <p className="mt-2 whitespace-pre-line">{m.body}</p>
      </div>)}
      {error && <p role="alert" className="mt-3">{error} <button type="button" className="underline" onClick={() => { setError(""); void load().catch((e) => setError(e.message)); }}>Retry loading</button></p>}
      {status !== "cancelled" && <form className="mt-4" onSubmit={async (e) => {
        e.preventDefault(); if (busy) return; setBusy(true); setError("");
        try {
          const r = await fetch("/api/venue-follow-up", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: requestId, action: "message", message: text }) });
          const d = await r.json(); if (!r.ok) throw Error(d.error || "Could not send message.");
          setText(""); await load();
        } catch (e) { setError(e instanceof Error ? e.message : "Could not send message."); }
        finally { setBusy(false); }
      }}>
        <label>Reply about this request<textarea required maxLength={3000} rows={3} value={text} onChange={(e) => setText(e.target.value)} className="mt-2 block w-full rounded-lg border border-sand p-3" /></label>
        <p className="mt-2 text-xs text-ink/60">Messages and suggested dates do not confirm or reserve a wedding date.</p>
        <button disabled={busy || !text.trim()} className="mt-3 rounded-full bg-ink px-4 py-2 text-cream disabled:opacity-50">{busy ? "Sending…" : "Send reply"}</button>
      </form>}
    </div>}
  </div>;
}
