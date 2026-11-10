"use client";
import VenueMediaPlaceholder from "./VenueMediaPlaceholder";
import { useRef, useState } from "react";
export default function VenueTour({
  name,
  url,
  management = false,
  demo = false,
  viewingHref = "#enquire",
}: {
  name: string;
  url?: string | null;
  management?: boolean;
  demo?: boolean;
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
          <p className="text-sm uppercase tracking-widest text-clay">
            Explore the space
          </p>
          <h2 className="mt-2 font-serif text-3xl">360° & 3D walkthrough</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink/60">
            {url
              ? "Use the tour controls to explore the rooms."
              : demo
                ? "Example tour space. No walkthrough added."
                : management
                  ? "Add a Matterport or Kuula link when your walkthrough is ready."
                  : "No walkthrough yet. Browse photos or request a viewing."}
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
        ) : !management && !demo ? (
          <a
            href={viewingHref}
            className="rounded-full border border-sand px-5 py-3 text-sm"
          >
            Request a viewing
          </a>
        ) : null}
      </div>
      {!url && <VenueMediaPlaceholder kind="tour" />}
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
              className="aspect-video w-full"
              allow="xr-spatial-tracking; fullscreen"
              allowFullScreen
              referrerPolicy="no-referrer"
            />
          )}
          <p className="mt-3 text-sm text-ink/60">
            The interactive tour is hosted by{" "}
            {url.includes("kuula.co") ? "Kuula" : "Matterport"}. Photographs and
            a viewing are also available.
          </p>
        </dialog>
      )}
    </section>
  );
}
