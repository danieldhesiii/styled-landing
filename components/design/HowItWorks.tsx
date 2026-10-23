"use client";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { HELP_GUIDES, HELP_TOPICS, type HelpTopic } from "@/lib/help";

export default function HowItWorks({
  onClose,
  initialTopic = "catalogue",
}: {
  onClose: () => void;
  initialTopic?: HelpTopic;
}) {
  const [topic, setTopic] = useState<HelpTopic>(initialTopic);
  const dialog = useRef<HTMLDialogElement>(null),
    content = useRef<HTMLDivElement>(null),
    tabs = useRef<(HTMLButtonElement | null)[]>([]),
    id = useId();
  const topics = HELP_TOPICS.filter((key) =>
    initialTopic === "suppliers"
      ? key === "suppliers"
      : initialTopic === "venue_partners"
        ? key === "venue_partners" || key === "venues"
        : key !== "suppliers" && key !== "venue_partners",
  );
  const guide = HELP_GUIDES[topic];
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      node?.close();
      document.body.style.overflow = previous;
    };
  }, []);
  function close() {
    dialog.current?.close();
    onClose();
  }
  function select(next: HelpTopic) {
    setTopic(next);
    content.current?.scrollTo({ top: 0 });
  }
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown")
      next = (index + 1) % topics.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp")
      next = (index + topics.length - 1) % topics.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = topics.length - 1;
    else return;
    event.preventDefault();
    select(topics[next]);
    tabs.current[next]?.focus();
  }
  return (
    <dialog
      ref={dialog}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          e.nativeEvent.stopImmediatePropagation();
        }
      }}
      onClose={(e) => e.stopPropagation()}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const bounds = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < bounds.left ||
            e.clientX > bounds.right ||
            e.clientY < bounds.top ||
            e.clientY > bounds.bottom
          )
            close();
        }
      }}
      className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-full max-w-2xl flex-col border-l border-sand bg-cream p-0 text-ink shadow-2xl open:flex backdrop:bg-ink/40 backdrop:backdrop-blur-sm"
    >
      <header className="shrink-0 border-b border-sand px-5 py-5 sm:px-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={`${id}-title`} className="font-serif text-3xl">
              How it works
            </h2>
            <p
              id={`${id}-description`}
              className="mt-2 max-w-lg text-sm leading-relaxed text-ink/60"
            >
              Opened for {HELP_GUIDES[initialTopic].label.toLowerCase()}.
              Explore any topic here without changing your page.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close how it works"
            className="shrink-0 rounded-full border border-sand px-3 py-2 text-sm"
          >
            Close ×
          </button>
        </div>
        <div
          role="tablist"
          aria-label="How it works topics"
          className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3"
        >
          {topics.map((key, index) => (
            <button
              key={key}
              ref={(node) => {
                tabs.current[index] = node;
              }}
              id={`${id}-tab-${key}`}
              type="button"
              role="tab"
              aria-selected={topic === key}
              aria-controls={`${id}-panel`}
              tabIndex={topic === key ? 0 : -1}
              onKeyDown={(e) => navigate(e, index)}
              onClick={() => select(key)}
              className={`rounded-full border px-3 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay ${topic === key ? "border-ink bg-ink text-cream" : "border-sand hover:border-clay"}`}
            >
              {HELP_GUIDES[key].label}
            </button>
          ))}
        </div>
      </header>
      <div
        ref={content}
        id={`${id}-panel`}
        role="tabpanel"
        aria-labelledby={`${id}-tab-${topic}`}
        tabIndex={0}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-clay sm:px-7"
      >
        <h3 className="font-serif text-3xl">{guide.title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-ink/60">
          {guide.intro}
        </p>
        <ol className="mt-7 space-y-6">
          {guide.steps.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span
                aria-hidden="true"
                className="shrink-0 font-serif text-2xl text-clay"
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h4 className="font-serif text-xl">{step.title}</h4>
                <p className="mt-2 text-sm leading-relaxed text-ink/60">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-8 rounded-xl border border-sand bg-white p-4 text-sm leading-relaxed text-ink/60">
          {guide.note}
        </p>
      </div>
      <footer className="shrink-0 border-t border-sand px-5 py-4 sm:px-7">
        <button
          type="button"
          onClick={close}
          className="w-full rounded-full bg-ink px-5 py-3 text-sm text-cream"
        >
          Back to my page
        </button>
      </footer>
    </dialog>
  );
}
