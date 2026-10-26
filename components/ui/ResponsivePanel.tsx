"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Inline on a large screen; a focus-trapped native dialog on a phone. */
export default function ResponsivePanel({
  open,
  onClose,
  title,
  children,
  alwaysDesktop = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  alwaysDesktop?: boolean;
}) {
  const [mobile, setMobile] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!mobile || !open) return;
    dialog.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.current?.close();
      document.body.style.overflow = previous;
    };
  }, [mobile, open]);
  if (!mobile) return open || alwaysDesktop ? <>{children}</> : null;
  if (!open) return null;
  return (
    <dialog
      ref={dialog}
      aria-label={title}
      onCancel={onClose}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-auto bg-cream p-4 text-ink backdrop:bg-ink/50"
    >
      <div className="mb-5 flex items-center justify-between gap-4 border-b border-sand pb-4">
        <h2 className="font-serif text-2xl">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-sand px-4 py-2 text-sm"
        >
          Close ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
