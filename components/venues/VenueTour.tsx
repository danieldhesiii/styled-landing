"use client";
import { useRef, useState } from "react";
export default function VenueTour({
  name,
  url,
  management = false,
  viewingHref = "#enquire",
}: {
  name: string;
  url?: string | null;
  management?: boolean;
  viewingHref?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  function close() {
    dialog.current?.close();
    setOpen(false);
  }
  return (
    <section
      id="walkthrough"
      className="mt-12 scroll-mt-24 border-y border-sand py-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div>
          <p className="text-xs uppercase tracking-widest text-clay">
            Explore the space
          </p>
          <h2 className="mt-2 font-serif text-3xl">360° & 3D walkthrough</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink/60">
            {url
              ? "Look around the rooms and move between viewpoints. Use the tour controls to explore at your own pace."
              : management
                ? "Add a public Matterport or Kuula tour link above when a captured walkthrough is ready. You can leave this section empty while arranging your capture."
                : "A walkthrough has not been added for this venue yet. You can explore the photographs or request an in-person viewing below."}
          </p>
        </div>
        {url ? (
          <button
            type="button"
            onClick={() => {
              setOpen(true);
              dialog.current?.showModal();
            }}
            className="rounded-full bg-ink px-6 py-3 text-cream"
          >
            Explore the venue ↗
          </button>
        ) : !management ? (
          <a
            href={viewingHref}
            className="rounded-full border border-sand px-5 py-3 text-sm"
          >
            Request a viewing
          </a>
        ) : null}
      </div>
      {url && (
        <dialog
          ref={dialog}
          onCancel={() => setOpen(false)}
          onClose={() => setOpen(false)}
          aria-label={`${name} walkthrough`}
          className="w-[95vw] max-w-5xl rounded-2xl bg-cream p-4 text-ink backdrop:bg-ink/60"
        >
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="font-serif text-2xl">{name}</h2>
            <button
              type="button"
              onClick={close}
              className="rounded-full border border-sand px-4 py-2"
            >
              Close ×
            </button>
          </div>
          {open && (
            <iframe
              title={`${name} walkthrough`}
              src={url}
              className="aspect-[4/5] w-full sm:aspect-video"
              allow="xr-spatial-tracking; fullscreen"
              allowFullScreen
              referrerPolicy="no-referrer"
            />
          )}
          <p className="mt-3 text-xs text-ink/60">
            The interactive tour is hosted by{" "}
            {url.includes("kuula.co") ? "Kuula" : "Matterport"}. Photographs and
            a viewing are also available.
          </p>
        </dialog>
      )}
    </section>
  );
}
