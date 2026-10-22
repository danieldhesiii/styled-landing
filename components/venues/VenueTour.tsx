"use client";
import { useRef } from "react";
export default function VenueTour({
  name,
  url,
}: {
  name: string;
  url: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <section className="mt-8 border-y border-sand py-5">
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="rounded-full border border-sand px-6 py-3"
      >
        Explore {name} in 3D →
      </button>
      <dialog
        ref={dialog}
        aria-label={`${name} 3D walkthrough`}
        className="w-[95vw] max-w-5xl rounded-2xl bg-cream p-4 text-ink backdrop:bg-ink/60"
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="font-serif text-2xl">{name}</h2>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className="rounded-full border border-sand px-4 py-2"
          >
            Close ×
          </button>
        </div>
        <iframe
          title={`${name} 3D walkthrough`}
          src={url}
          className="aspect-video w-full"
          loading="lazy"
          allow="xr-spatial-tracking; fullscreen"
          allowFullScreen
        />
      </dialog>
    </section>
  );
}
