"use client";
import { useId, useRef, useState } from "react";
import {
  SUPPORT_EMAIL,
  SUPPORT_TOPICS,
  SUPPORT_ANSWERS,
  supportMailto,
  supportEmailBody,
  type SupportTopic,
} from "@/lib/support";
import SupportRequests from "./SupportRequests";
export default function SupportContent() {
  const id = useId(),
    notice = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState("contact"),
    [topic, setTopic] = useState<SupportTopic>("planning"),
    [reference, setReference] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [sent, setSent] = useState(""),
    [copied, setCopied] = useState("");
  const submission = useRef({ id: "", body: "" });
  const draft = { topic, reference, message };
  const field =
    "mt-2 block min-h-11 w-full min-w-0 rounded-xl border border-sand bg-white px-3 py-2.5 text-base text-ink";
  return (
    <div className="min-w-0">
      <nav
        aria-label="Support options"
        className="mb-6 grid grid-cols-3 gap-2 border-b border-sand text-sm"
      >
        {[
          ["contact", "Ask a question"],
          ["requests", "Your requests"],
          ["answers", "Quick answers"],
        ].map(([key, label]) => (
          <button
            type="button"
            key={key}
            aria-pressed={tab === key}
            onClick={() => setTab(key)}
            className={`min-h-12 border-b-2 ${tab === key ? "border-clay font-medium" : "border-transparent text-ink/70"}`}
          >
            {label}
          </button>
        ))}
      </nav>
      {tab === "requests" && <SupportRequests />}
      <div hidden={tab !== "answers"} className="space-y-3">
        {SUPPORT_ANSWERS.map((a) => (
          <details
            key={a.question}
            className="rounded-xl border border-sand bg-white px-4"
          >
            <summary className="cursor-pointer py-4 text-sm font-medium">
              {a.question}
            </summary>
            <p className="pb-4 text-sm leading-relaxed text-ink/70">
              {a.answer}
            </p>
          </details>
        ))}
        <button
          type="button"
          onClick={() => setTab("contact")}
          className="min-h-11 text-sm underline"
        >
          Still need help? Ask us
        </button>
      </div>
      <div hidden={tab !== "contact"}>
        {sent ? (
          <div
            ref={notice}
            role="status"
            tabIndex={-1}
            className="rounded-xl border border-sage/40 bg-sage/10 p-5"
          >
            <h3 className="font-serif text-2xl">Your request is saved</h3>
            <p className="mt-3 text-sm leading-relaxed">
              You can check replies in Your requests. Keep reference{" "}
              <strong>{sent}</strong> when following up.
            </p>
            <p className="mt-3 text-sm text-ink/70">
              A support message does not change or cancel a booking.
            </p>
            <button
              type="button"
              onClick={() => {
                setSent("");
                submission.current = { id: "", body: "" };
                setMessage("");
                setReference("");
              }}
              className="mt-4 min-h-11 text-sm underline"
            >
              Write another message
            </button>
          </div>
        ) : (
          <form
            className="space-y-5"
            onSubmit={async (e) => {
              e.preventDefault();
              if (busy) return;
              const body = JSON.stringify(draft);
              if (submission.current.body !== body)
                submission.current = { id: crypto.randomUUID(), body };
              setBusy(true);
              setError("");
              try {
                const res = await fetch("/api/support", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    ...draft,
                    clientId: submission.current.id,
                  }),
                });
                const data = await res.json();
                if (!res.ok || !data.ok)
                  throw Error(
                    data.error || "Could not send. Please use email instead.",
                  );
                setSent(data.reference);
                setTimeout(() => notice.current?.focus(), 0);
              } catch (err) {
                setError(
                  err instanceof Error
                    ? err.message
                    : "Could not send. Your draft is still here.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <p className="text-sm leading-relaxed text-ink/70">
              Ask about your plans, a request or your business workspace. Send
              directly to the Styled team and check replies in Your requests.
            </p>
            <label className="block text-sm" htmlFor={`${id}-topic`}>
              What can we help with?
              <select
                id={`${id}-topic`}
                className={field}
                value={topic}
                onChange={(e) => setTopic(e.target.value as SupportTopic)}
                disabled={busy}
              >
                {Object.entries(SUPPORT_TOPICS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm" htmlFor={`${id}-reference`}>
              Request reference or listing name{" "}
              <span className="text-ink/60">(optional)</span>
              <input
                id={`${id}-reference`}
                className={field}
                maxLength={120}
                value={reference}
                disabled={busy}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Find your reference in My bookings"
              />
            </label>
            <label className="block text-sm" htmlFor={`${id}-message`}>
              Your question
              <textarea
                id={`${id}-message`}
                className={field}
                rows={5}
                minLength={10}
                maxLength={4000}
                required
                disabled={busy}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what you need help with, or what you expected to happen."
              />
            </label>
            <p className="text-xs leading-relaxed text-ink/70">
              Do not include passwords, card details or sign-in codes.
            </p>
            {error && (
              <p
                role="alert"
                className="rounded-xl bg-blush/30 p-4 text-sm leading-relaxed"
              >
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="min-h-11 w-full rounded-full bg-ink px-5 py-3 text-sm text-cream disabled:opacity-50"
            >
              {busy ? "Saving your request…" : "Send to Styled support"}
            </button>
            <p className="text-xs leading-relaxed text-ink/60">
              A confirmed account is needed to send here. Your request stays in
              Styled. Closing Support keeps this draft while the page stays
              open.
            </p>
          </form>
        )}
        <div className="mt-7 border-t border-sand pt-5 text-sm">
          <p className="font-medium">Prefer email or can’t sign in?</p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="mt-1 inline-flex min-h-11 items-center underline underline-offset-4"
          >
            {SUPPORT_EMAIL}
          </a>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <a
              href={supportMailto(draft)}
              className="inline-flex min-h-11 items-center underline"
            >
              Open in email app
            </a>
            <button
              type="button"
              className="min-h-11 underline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    `To: ${SUPPORT_EMAIL}\n\n${supportEmailBody(draft)}`,
                  );
                  setCopied(
                    "Message copied. Paste it into your email and send it to Styled.",
                  );
                } catch {
                  setCopied(
                    "Copy is unavailable. You can select your message above and copy it manually.",
                  );
                }
              }}
            >
              Copy message
            </button>
            <a
              href="/auth/recovery"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center underline"
            >
              Recover account ↗
            </a>
          </div>
          {copied && (
            <p role="status" className="mt-2 text-xs text-ink/70">
              {copied}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
