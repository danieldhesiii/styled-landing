"use client";
import { useEffect, useRef, useState } from "react";
import HelpButton from "@/components/help/HelpButton";
import Link from "next/link";
import {
  conversationStatus,
  receiptLabel,
  replyTargetLabel,
  type ReplyState,
} from "@/lib/message-status";

type Thread = ReplyState & {
  id: string;
  customer_label: string;
  supplier_id: string;
  last_body: string;
  last_message_id: string;
  customer_unread: boolean;
  supplier_unread: boolean;
  updated_at: string;
  suppliers: { name: string } | null;
};
type Message = {
  id: string;
  sender_role: string;
  body: string;
  created_at: string;
  read_at: string | null;
};
type Contact = { id: string; name: string; message_reply_hours: number | null };
const time = (value: string) =>
  new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
export default function Inbox({
  supplier = false,
  initialSupplier = "",
}: {
  supplier?: boolean;
  initialSupplier?: string;
}) {
  const [threads, setThreads] = useState<Thread[]>([]),
    [selected, setSelected] = useState(""),
    [contact, setContact] = useState(initialSupplier),
    [contactInfo, setContactInfo] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]),
    [older, setOlder] = useState<Message[]>([]),
    [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true),
    [sending, setSending] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [hasMoreThreads, setHasMoreThreads] = useState(false),
    [loadingMore, setLoadingMore] = useState(false),
    [hasOlder, setHasOlder] = useState(false),
    [loadingOlder, setLoadingOlder] = useState(false),
    [reload, setReload] = useState(0);
  const drafts = useRef<Record<string, string>>({}),
    retry = useRef({ body: "", id: "" }),
    end = useRef<HTMLDivElement>(null),
    previousThread = useRef(""),
    loadedOlder = useRef(false),
    activeThread = useRef(selected);
  activeThread.current = selected;
  const endpoint = supplier
    ? "/api/messages?workspace=supplier"
    : "/api/messages?";
  const separator = supplier ? "&" : "";
  const current = threads.find((t) => t.id === selected),
    myRole = supplier ? "supplier" : "customer";
  const state = current ? conversationStatus(current, supplier) : null;
  const target = current
    ? current.reply_target_hours
    : contactInfo?.message_reply_hours;
  const supportHref =
    "/support" +
    (selected ? "?conversation=" + encodeURIComponent(selected) : "");
  useEffect(() => {
    if (!contact || supplier) {
      setContactInfo(null);
      return;
    }
    let live = true;
    void fetch("/api/messages?supplier=" + encodeURIComponent(contact), {
      cache: "no-store",
    })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
        if (live) setContactInfo(d.contact);
      })
      .catch((e) => {
        if (live) setError(e.message || "Could not load supplier.");
      });
    return () => {
      live = false;
    };
  }, [contact, supplier]);
  useEffect(() => {
    let live = true;
    async function load() {
      try {
        const r = await fetch(endpoint, { cache: "no-store" }),
          d = await r.json();
        if (!r.ok) throw Error(d.error);
        if (!live) return;
        setThreads((previous) =>
          Array.from(
            new Map(
              [...previous, ...d.threads].map((t: Thread) => [t.id, t]),
            ).values(),
          ).sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
        );
        setHasMoreThreads(d.hasMoreThreads);
        if (initialSupplier && !selected) {
          const thread = d.threads.find(
            (t: Thread) => t.supplier_id === initialSupplier,
          );
          if (thread) {
            setSelected(thread.id);
            setContact("");
          }
        }
      } catch (e) {
        if (live)
          setError(e instanceof Error ? e.message : "Could not load inbox.");
      } finally {
        if (live) setLoading(false);
      }
    }
    void load();
    const timer = setInterval(() => {
      if (!document.hidden) void load();
    }, 12000);
    const visible = () => {
      if (!document.hidden) void load();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      live = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [endpoint, initialSupplier, selected, reload]);
  useEffect(() => {
    if (!selected) {
      setMessages([]);
      return;
    }
    let live = true;
    if (previousThread.current !== selected) {
      setMessages([]);
      setOlder([]);
      loadedOlder.current=false;
      setError("");
      previousThread.current = selected;
    }
    async function load() {
      try {
        const r = await fetch(endpoint + separator + "thread=" + selected, {
            cache: "no-store",
          }),
          d = await r.json();
        if (!r.ok) throw Error(d.error);
        if (!live) return;
        setMessages(d.messages);
        if(!loadedOlder.current)setHasOlder(d.hasOlder);
        setThreads((rows) =>
          rows.map((t) => (t.id === selected ? d.thread : t)),
        );
        // A background tab must not produce a seen receipt. Only acknowledge the visible open conversation.
        if (
          document.hidden ||
          !d.thread.last_message_id ||
          (!d.messages.some(
            (m: Message) => m.sender_role !== myRole && !m.read_at,
          ) &&
            !(supplier ? d.thread.supplier_unread : d.thread.customer_unread))
        )
          return;
        const read = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "read",
            threadId: selected,
            lastMessageId: d.thread.last_message_id,
          }),
        });
        if (live && read.ok) {
          if (!supplier) window.dispatchEvent(new Event("styled-inbox-updated"));
          setThreads((rows) =>
            rows.map((t) =>
              t.id === selected &&
              t.last_message_id === d.thread.last_message_id
                ? {
                    ...t,
                    [supplier ? "supplier_unread" : "customer_unread"]: false,
                  }
                : t,
            ),
          );
        }
      } catch (e) {
        if (live)
          setError(e instanceof Error ? e.message : "Could not load messages.");
      }
    }
    void load();
    const timer = setInterval(() => {
      if (!document.hidden) void load();
    }, 5000);
    const visible = () => {
      if (!document.hidden) void load();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      live = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [selected, endpoint, separator, supplier, reload]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [messages.length, selected]);
  function select(thread: Thread) {
    if (sending) return;
    drafts.current[selected || contact] = draft;
    setSelected(thread.id);
    setContact("");
    setDraft(drafts.current[thread.id] || "");
    setError("");
    setNotice("");
  }
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || sending || (!selected && !contactInfo)) return;
    setSending(true);
    setError("");
    setNotice("");
    let accepted = false;
    const fingerprint = (selected || contact) + ":" + draft;
    if (retry.current.body !== fingerprint)
      retry.current = { body: fingerprint, id: crypto.randomUUID() };
    try {
      const r = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            threadId: selected || undefined,
            supplierId: contact,
            message: draft,
            clientId: retry.current.id,
          }),
        }),
        d = await r.json();
      if (!r.ok) throw Error(d.error);
      accepted = true;
      delete drafts.current[selected || contact];
      setDraft("");
      retry.current = { body: "", id: "" };
      setContact("");
      setSelected(d.threadId);
      setNotice("Message sent");
      const list = await fetch(endpoint, { cache: "no-store" }),
        inbox = await list.json();
      if (!list.ok) throw Error(inbox.error);
      setThreads(inbox.threads);
      setReload((n) => n + 1);
    } catch (e) {
      setError(
        accepted
          ? "Your message was sent. Reload messages to update the conversation."
          : e instanceof Error
            ? e.message
            : "Could not confirm sending. Your text is kept; retry safely.",
      );
    } finally {
      setSending(false);
    }
  }
  async function moreThreads() {
    setLoadingMore(true);
    try {
      const r = await fetch(endpoint + separator + "offset=" + threads.length),
        d = await r.json();
      if (!r.ok) throw Error(d.error);
      setThreads((rows) =>
        Array.from(
          new Map(
            [...rows, ...d.threads].map((t: Thread) => [t.id, t]),
          ).values(),
        ),
      );
      setHasMoreThreads(d.hasMoreThreads);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load conversations.",
      );
    } finally {
      setLoadingMore(false);
    }
  }
  async function earlier() {
    const first = older[0] || messages[0];
    if (!first) return;
    setLoadingOlder(true);
    try {
      const targetThread = selected;
      const r = await fetch(
          endpoint + separator + "thread=" + selected + "&before=" + first.id,
        ),
        d = await r.json();
      if (!r.ok) throw Error(d.error);
      if (activeThread.current !== targetThread) return;
      loadedOlder.current=true;
      setOlder((rows) =>
        Array.from(
          new Map(
            [...d.messages, ...rows].map((m: Message) => [m.id, m]),
          ).values(),
        ),
      );
      setHasOlder(d.hasOlder);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load earlier messages.",
      );
    } finally {
      setLoadingOlder(false);
    }
  }
  const name = current
    ? supplier
      ? current.customer_label
      : current.suppliers?.name || "Supplier"
    : contactInfo?.name || "New conversation";
  return (
    <section className="min-w-0">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs uppercase tracking-[.18em] text-clay">
            Conversations
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl">Inbox</h1>
          <p className="mt-2 text-sm text-ink/60">
            {supplier
              ? "Read and reply to your customers."
              : "Your plans, discussed directly with suppliers."}
          </p>
        </div>
        <div className="flex flex-wrap gap-5 text-sm">
          {!supplier && <HelpButton topic="messages" className="inline-flex min-h-11 items-center underline underline-offset-4" />}
          {!supplier && (
            <Link
              href="/suppliers"
              className="inline-flex min-h-11 items-center underline underline-offset-4"
            >
              Find a supplier
            </Link>
          )}
          <Link
            href={supportHref}
            className="inline-flex min-h-11 items-center underline underline-offset-4"
          >
            Contact Styled
          </Link>
        </div>
      </header>
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-clay/30 bg-white p-4 text-sm"
        >
          {error}{" "}
          <button
            onClick={() => {
              setError("");
              setReload((n) => n + 1);
            }}
            className="min-h-11 underline"
          >
            Reload messages
          </button>
        </div>
      )}
      <div className="grid overflow-hidden rounded-2xl border border-sand bg-white md:min-h-[590px] md:grid-cols-[270px_1fr]">
        <aside
          aria-label="Conversations"
          className="min-w-0 border-b border-sand md:border-b-0 md:border-r"
        >
          <h2 className="px-5 py-4 text-xs uppercase tracking-widest text-ink/50">
            Your conversations
          </h2>
          {loading ? (
            <p role="status" className="p-5 text-sm">
              Loading conversations…
            </p>
          ) : threads.length === 0 ? (
            <p className="p-5 text-sm leading-relaxed text-ink/60">
              {supplier
                ? "New customer messages will appear here."
                : "Send a supplier your first message to start."}
            </p>
          ) : (
            <ul className="max-h-44 overflow-y-auto md:max-h-[650px]">
              {threads.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    disabled={sending}
                    onClick={() => select(t)}
                    aria-pressed={selected === t.id}
                    className={`w-full border-t border-sand p-5 text-left transition-colors ${selected === t.id ? "bg-cream" : "hover:bg-cream/60"}`}
                  >
                    <span className="flex items-center justify-between gap-2 font-medium">
                      <span className="min-w-0 truncate">
                        {supplier
                          ? t.customer_label
                          : t.suppliers?.name || "Supplier"}
                      </span>
                      {(supplier ? t.supplier_unread : t.customer_unread) && (
                        <span
                          aria-label="Unread"
                          className="h-2 w-2 shrink-0 rounded-full bg-clay"
                        />
                      )}
                    </span>
                    <span className="mt-1 block truncate text-sm text-ink/55">
                      {t.last_body}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {hasMoreThreads && (
            <button
              disabled={loadingMore}
              onClick={() => void moreThreads()}
              className="min-h-11 w-full p-3 text-sm underline"
            >
              {loadingMore ? "Loading…" : "More conversations"}
            </button>
          )}
        </aside>
        <div className="flex min-w-0 flex-col">
          {selected || contact ? (
            <>
              <header className="border-b border-sand p-4 sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="break-words font-serif text-2xl">{name}</h2>
                  {!supplier && (current?.supplier_id || contactInfo?.id) && (
                    <Link
                      href={
                        "/suppliers/" +
                        (current?.supplier_id || contactInfo?.id)
                      }
                      className="min-h-11 py-3 text-xs underline underline-offset-4"
                    >
                      View supplier
                    </Link>
                  )}
                </div>
                <p
                  aria-live="polite"
                  className={`mt-1 text-sm ${state?.overdue ? "text-clay" : "text-ink/65"}`}
                >
                  {state?.label || "Start a conversation"}
                </p>
                {!supplier && (
                  <p className="mt-2 text-xs text-ink/55">
                    {replyTargetLabel(target)}
                  </p>
                )}
                {supplier && current?.last_sender_role === "customer" && (
                  <p className="mt-2 text-xs text-ink/55">
                    {replyTargetLabel(target)}
                    {current.awaiting_since && target
                      ? ` · due ${time(new Date(Date.parse(current.awaiting_since) + target * 3600000).toISOString())}`
                      : ""}
                  </p>
                )}
              </header>
              <div
                aria-label="Message history"
                role="log"
                aria-live="polite"
                className="flex h-[360px] flex-col gap-4 overflow-y-auto p-4 sm:h-[400px] sm:p-6"
              >
                {hasOlder && (
                  <button
                    disabled={loadingOlder}
                    className="min-h-11 text-sm underline"
                    onClick={() => void earlier()}
                  >
                    {loadingOlder ? "Loading…" : "Load earlier messages"}
                  </button>
                )}
                {!messages.length && !older.length && (
                  <p className="my-auto px-3 text-center text-sm text-ink/45">
                    Ask about products, availability or delivery.
                  </p>
                )}
                {Array.from(
                  new Map(
                    [...older, ...messages].map((m) => [m.id, m]),
                  ).values(),
                ).map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[92%] rounded-2xl px-4 py-3 sm:max-w-[82%] ${m.sender_role === myRole ? "ml-auto bg-ink text-cream" : "mr-auto bg-cream text-ink"}`}
                  >
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed [overflow-wrap:anywhere]">
                      {m.body}
                    </p>
                    <div className="mt-2 flex flex-wrap justify-end gap-x-3 gap-y-1 text-[11px] opacity-75">
                      <time dateTime={m.created_at}>{time(m.created_at)}</time>
                      {m.sender_role === myRole && (
                        <span
                          title={
                            m.read_at
                              ? `Opened ${time(m.read_at)}`
                              : "Saved to the conversation"
                          }
                        >
                          <span aria-hidden="true">
                            {m.read_at ? "✓✓" : "✓"}{" "}
                          </span>
                          {receiptLabel(m.read_at, supplier)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={end} />
              </div>
              {state?.overdue && (
                <p className="border-t border-sand bg-cream/60 px-5 py-3 text-xs leading-relaxed">
                  {supplier
                    ? "Please reply or let the customer know when you can help."
                    : "Still waiting? Styled can help."}{" "}
                  <Link
                    href={supportHref}
                    className="underline underline-offset-4"
                  >
                    Contact us
                  </Link>
                </p>
              )}
              <form
                onSubmit={send}
                className="mt-auto border-t border-sand p-4"
              >
                <label htmlFor="supplier-message" className="sr-only">
                  Your message
                </label>
                <textarea
                  id="supplier-message"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  maxLength={4000}
                  rows={3}
                  placeholder="Write a message…"
                  className="w-full resize-y rounded-xl border border-sand bg-cream/40 px-4 py-3 text-base outline-offset-2"
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p role="status" className="text-xs text-ink/60">
                    {sending ? "Sending…" : notice}
                  </p>
                  <button
                    disabled={
                      sending || !draft.trim() || (!selected && !contactInfo)
                    }
                    className="min-h-11 rounded-full bg-ink px-6 py-2 text-sm text-cream disabled:opacity-40"
                  >
                    {sending ? "Sending…" : "Send message"}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex min-h-64 flex-1 items-center justify-center p-10 text-center text-sm text-ink/55">
              Select a conversation to read and reply.
            </div>
          )}
        </div>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-ink/50">
        A tick means your message is saved. Seen means the other person opened
        this conversation. Reply targets are calendar hours, not a guaranteed
        response.
      </p>
    </section>
  );
}
