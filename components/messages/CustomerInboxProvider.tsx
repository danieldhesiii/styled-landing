"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useUser } from "@/components/session/useUser";
import { customerAlertsEnabled, newSupplierReplies, type ReplyAlert } from "@/lib/customer-message-alerts";

const InboxContext = createContext({ signedIn: false, unread: 0 });
export function useCustomerInbox() { return useContext(InboxContext); }
export function CustomerInboxLink({ compact = false }: { compact?: boolean }) {
  const { signedIn, unread } = useCustomerInbox();
  const path = usePathname();
  if (!signedIn) return null;
  return <Link href="/messages" title="Inbox" aria-current={path === "/messages" ? "page" : undefined}
    aria-label={`Inbox${unread ? `, ${unread} unread conversation${unread === 1 ? "" : "s"}` : ""}`}
    className="relative inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md px-2 text-sm text-ink/75 transition-colors hover:bg-sand/30 hover:text-ink">
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/></svg>
    <span className={compact ? "hidden xl:inline" : ""}>Inbox</span>
    {unread > 0 && <span aria-hidden="true" className="flex min-w-5 items-center justify-center rounded-full bg-clay px-1 text-[10px] leading-5 text-white">{unread > 99 ? "99+" : unread}</span>}
  </Link>;
}

export default function CustomerInboxProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const path = usePathname(), pathRef = useRef(path);
  pathRef.current = path;
  const enabled = customerAlertsEnabled(path);
  const signedIn = !loading && !!user?.email_confirmed_at && !user.is_anonymous;
  const account = signedIn ? user!.id : "";
  const [snapshot, setSnapshot] = useState({ account: "", unread: 0 });
  const [alert, setAlert] = useState<{ account: string; thread: ReplyAlert; count: number } | null>(null);
  useEffect(() => { setAlert(null); }, [path]);
  useEffect(() => {
    if (!account || !enabled) return;
    let active = true, busy = false, since = "";
    const seen = new Set<string>(), controller = new AbortController();
    async function refresh() {
      if (!active || busy || document.visibilityState !== "visible") return;
      busy = true;
      try {
        const response = await fetch("/api/messages?notifications=1", { cache: "no-store", signal: controller.signal });
        if (!active) return;
        if (response.status === 401) {
          setSnapshot({ account, unread: 0 }); setAlert(null); return;
        }
        if (!response.ok) return;
        const data = await response.json();
        if (!active) return;
        const threads: ReplyAlert[] = data.threads || [];
        setSnapshot({ account, unread: data.unreadCount || 0 });
        setAlert(current => current && threads.some(thread => thread.id === current.thread.id) ? current : null);
        const incoming = since ? newSupplierReplies(threads, seen, since) : [];
        if (!since) since = data.observedAt;
        for (const thread of threads) seen.add(thread.last_message_id);
        // Keep memory bounded during long sessions without replaying old unread messages.
        if (seen.size > 500) { since = data.observedAt; seen.clear(); for (const thread of threads) seen.add(thread.last_message_id); }
        if (pathRef.current !== "/messages" && incoming.length)
          setAlert({ account, thread: incoming[0], count: incoming.length });
      } catch { /* Keep the last badge during temporary connection failures. */ }
      finally { busy = false; }
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 8000);
    const wake = () => void refresh();
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("styled-inbox-updated", wake);
    return () => { active = false; controller.abort(); window.clearInterval(timer); document.removeEventListener("visibilitychange", wake); window.removeEventListener("styled-inbox-updated", wake); };
  }, [account, enabled]);
  const visible = enabled && alert?.account === account && account && path !== "/messages" ? alert : null;
  return <InboxContext.Provider value={{ signedIn: signedIn && enabled, unread: snapshot.account === account ? snapshot.unread : 0 }}>
    {children}
    <aside aria-live="polite" aria-atomic="true" className="pointer-events-none fixed inset-x-4 bottom-20 z-[60] mx-auto max-w-sm md:bottom-6 md:left-auto md:right-6 md:mx-0">
      {visible && <div className="pointer-events-auto rounded-xl border border-sand bg-white p-4 text-ink shadow-xl motion-safe:animate-fade-in" onKeyDown={event => { if (event.key === "Escape") setAlert(null); }}>
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-[10px] uppercase tracking-[.16em] text-clay">New supplier message</p><p className="mt-1 font-serif text-xl">{visible.thread.suppliers?.name || "Your supplier"} replied</p></div>
          <button type="button" aria-label="Dismiss message notification" onClick={() => setAlert(null)} className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink/60 hover:bg-cream">×</button>
        </div>
        {visible.count > 1 && <p className="mt-1 text-sm text-ink/60">{visible.count} conversations have new replies.</p>}
        <Link href={"/messages?supplier=" + encodeURIComponent(visible.thread.supplier_id)} onClick={() => setAlert(null)} className="mt-3 inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm text-cream">Read message →</Link>
      </div>}
    </aside>
  </InboxContext.Provider>;
}
