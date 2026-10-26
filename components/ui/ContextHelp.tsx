import type { ReactNode } from "react";

/** Secondary guidance stays available without competing with the page's task. */
export default function ContextHelp({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <details className={`group text-sm ${className}`}>
      <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center gap-2 text-xs text-ink/60 hover:text-ink [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          fill="none"
          className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180"
        >
          <path
            d="m4 6 4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </summary>
      <div className="max-w-2xl space-y-3 pb-4 text-sm leading-relaxed text-ink/70">
        {children}
      </div>
    </details>
  );
}
