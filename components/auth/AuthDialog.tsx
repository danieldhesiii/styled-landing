"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import AccountForm from "@/components/auth/AccountForm";

interface Props { initialMode?: "signup" | "login"; onClose: () => void; onAuthed?: () => void; }
export default function AuthDialog({ initialMode = "signup", onClose, onAuthed }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const heading = useId();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!mounted) return;
    const previous = document.activeElement;
    const dialog = ref.current;
    dialog?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, [mounted]);
  if (!mounted) return null;
  return createPortal(<dialog ref={ref} aria-labelledby={heading} onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === e.currentTarget) onClose(); }} className="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-sm overflow-y-auto rounded-3xl border border-sand bg-white p-7 text-ink shadow-2xl backdrop:bg-black/40">
    <div className="flex items-start justify-between gap-3">
      <h2 id={heading} className="font-serif text-2xl">Your Styled account</h2>
      <button type="button" onClick={onClose} aria-label="Close account dialog" className="h-9 w-9 shrink-0 rounded-full border border-sand">×</button>
    </div>
    <AccountForm initialMode={initialMode} next={window.location.pathname + window.location.search + window.location.hash} onAuthed={onAuthed} />
  </dialog>, document.body);
}
