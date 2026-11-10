"use client";
import useOutsideClick from "@/components/ui/useOutsideClick";
import { useCallback, useEffect, useRef, useState } from "react";
import { venueNextStep } from "@/lib/venue-workflow";
type Message = { id: string; body: string; sender_kind: string; created_at: string };
export default function VenueMessageThread({ requestId, status, nextActor, expanded, onExpandedChange }: { requestId: string; status: string; nextActor?: string; expanded?: boolean; onExpandedChange?: (open:boolean)=>void }) {
  const [localOpen, setLocalOpen] = useState(false), [messages, setMessages] = useState<Message[] | null>(null);
  const open = expanded ?? localOpen;
  const setOpen = (value:boolean) => { setLocalOpen(value); onExpandedChange?.(value); };
  const [actor, setActor] = useState(nextActor), [text, setText] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [currentStatus, setCurrentStatus] = useState(status), [updated, setUpdated] = useState("");
  const latestRequest = useRef(requestId), loading = useRef(false);
  latestRequest.current = requestId;
  const load = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    try {
      const r = await fetch(`/api/venue-follow-up?id=${encodeURIComponent(requestId)}`, { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || "Could not load messages.");
      if (latestRequest.current !== requestId) return;
      setMessages(d.messages); setActor(d.nextActor);
      if (typeof d.status === "string") setCurrentStatus(d.status);
      setUpdated(new Date().toLocaleTimeString("en-GB", {hour:"2-digit", minute:"2-digit"}));
      setError("");
    } finally { loading.current = false; }
  }, [requestId]);
  useEffect(() => { setActor(nextActor); setCurrentStatus(status); }, [nextActor, status]);
  useEffect(() => {
    if (open) void load().catch((e) => setError(e.message));
  }, [open, load, status, nextActor]);
  useEffect(() => {
    if (!open) return;
    const refresh = () => {
      if (document.visibilityState === "visible" && !busy) void load().catch(() => setError("Could not refresh the conversation. Your reply is still here."));
    };
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [open, load, busy]);
  const outside = useOutsideClick<HTMLDivElement>(open && !busy, () => setOpen(false));
  return <div ref={outside} id={`venue-conversation-${requestId}`} className="mt-5 scroll-mt-28 text-sm">
    <p role="status">{venueNextStep(currentStatus, actor)}</p>
    <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="mt-3 underline">{open ? "Hide conversation" : "Open conversation"}</button>
    {open && <div className="mt-4 rounded-xl border border-sand p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink/60">Private to you and the venue team. Latest 100 messages shown.</p>
        <button type="button" disabled={busy} className="min-h-11 underline disabled:opacity-50" onClick={() => void load().catch((e) => setError(e.message))}>Refresh conversation</button>
      </div>
      <p className="text-sm text-ink/60">Updates every 30 seconds while open.{updated ? ` Last checked ${updated}.` : ""}</p>
      {messages === null && !error && <p role="status" className="mt-3">Loading conversation…</p>}
      {messages?.length === 0 && <p className="mt-3">No follow-up messages yet.</p>}
      {messages?.map((m) => <div key={m.id} className="mt-4 border-b border-sand pb-3">
        <p className="text-sm text-ink/60">{m.sender_kind === "customer" ? "Couple" : "Venue team"} · {new Date(m.created_at).toLocaleString("en-GB", { timeZone: "Europe/London" })}</p>
        <p className="mt-2 whitespace-pre-line break-words">{m.body}</p>
      </div>)}
      {error && <p role="alert" className="mt-3">{error} <button type="button" className="underline" onClick={() => { setError(""); void load().catch((e) => setError(e.message)); }}>Retry loading</button></p>}
      {currentStatus !== "cancelled" && <form className="mt-4" onSubmit={async (e) => {
        e.preventDefault(); if (busy) return; setBusy(true); setError("");
        try {
          const r = await fetch("/api/venue-follow-up", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: requestId, action: "message", message: text }) });
          const d = await r.json(); if (!r.ok) throw Error(d.error || "Could not send message.");
          setText(""); await load();
        } catch (e) { setError(e instanceof Error ? e.message : "Could not send message."); }
        finally { setBusy(false); }
      }}>
        <label>Reply about this request<textarea required maxLength={3000} rows={3} value={text} onChange={(e) => setText(e.target.value)} className="mt-2 block w-full rounded-lg border border-sand p-3" /></label>
        <p className="mt-2 text-sm text-ink/60">Messages and suggested dates do not confirm or reserve a wedding date.</p>
        <button disabled={busy || !text.trim()} className="mt-3 rounded-full bg-ink px-4 py-2 text-cream disabled:opacity-50">{busy ? "Sending…" : "Send reply"}</button>
      </form>}
    </div>}
  </div>;
}
