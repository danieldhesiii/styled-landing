"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import SupportContent from "./SupportContent";
const Context = createContext<(() => void) | null>(null);
export function SupportButton({
  className = "min-h-11 rounded-full border border-clay/40 bg-clay/10 px-4 py-2 text-sm text-ink",
  label = "Contact support",
}: {
  className?: string;
  label?: string;
}) {
  const open = useContext(Context);
  if (!open)
    return (
      <a href="/support" className={className}>
        {label}
      </a>
    );
  return (
    <button
      type="button"
      onClick={open}
      aria-haspopup="dialog"
      className={className}
    >
      {label}
    </button>
  );
}
export default function SupportProvider({ children }: { children: ReactNode }) {
  const [hasOpened, setHasOpened] = useState(false);
  const [open, setOpen] = useState(false),
    dialog = useRef<HTMLDialogElement>(null),
    lastFocus = useRef<HTMLElement | null>(null),
    closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    dialog.current?.showModal();
    closeButton.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.current?.close();
      document.body.style.overflow = previous;
      lastFocus.current?.focus();
    };
  }, [open]);
  return (
    <Context.Provider
      value={() => {
        lastFocus.current = document.activeElement as HTMLElement;
        setHasOpened(true);
        setOpen(true);
      }}
    >
      {children}
      <dialog
        ref={dialog}
        aria-labelledby="support-title"
        onCancel={(e) => {
          e.preventDefault();
          setOpen(false);
        }}
        className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-full max-w-xl flex-col border-l border-sand bg-cream p-0 text-ink open:flex backdrop:bg-ink/40 backdrop:backdrop-blur-sm"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-sand px-5 py-5 sm:px-7">
          <div>
            <h2 id="support-title" className="font-serif text-2xl sm:text-3xl">
              Help & support
            </h2>
            <p className="mt-2 text-sm text-ink/70">Ask the Styled team.</p>
          </div>
          <button
            ref={closeButton}
            type="button"
            aria-label="Close support"
            onClick={() => setOpen(false)}
            className="min-h-11 shrink-0 rounded-full border border-sand px-3 text-sm"
          >
            Close ×
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">
          {hasOpened && <SupportContent />}
        </div>
      </dialog>
    </Context.Provider>
  );
}
