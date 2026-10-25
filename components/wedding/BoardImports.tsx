"use client";
import { useState } from "react";
import { pinterestLink } from "@/lib/board-inspiration";
export function ImportIcon({
  source,
}: {
  source: "upload" | "google" | "pinterest";
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-6 w-6 shrink-0 text-clay"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {source === "upload" ? (
        <path d="M12 16V3m-4 4 4-4 4 4 M4 15v5h16v-5" />
      ) : source === "google" ? (
        <>
          <path d="M12 12V3a4.5 4.5 0 0 1 4.5 4.5V12z M12 12h9a4.5 4.5 0 0 1-4.5 4.5H12z M12 12v9a4.5 4.5 0 0 1-4.5-4.5V12z M12 12H3a4.5 4.5 0 0 1 4.5-4.5H12z" />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="10" />
          <path d="m9 21 3-14 M11 15c8 3 9-9 2-9-4 0-6 5-4 7" />
        </>
      )}
    </svg>
  );
}
export default function BoardImports({
  disabled,
  hasBoard,
  onUpload,
  onLink,
  onPreview,
}: {
  disabled: boolean;
  hasBoard: boolean;
  onUpload: () => void;
  onLink: (url: string) => Promise<void>;
  onPreview: (url: string) => void;
}) {
  const [link, setLink] = useState(""),
    [error, setError] = useState(""),
    [status, setStatus] = useState(""),
    [saving, setSaving] = useState(false);
  function validatedLink() {
    const safe = pinterestLink(link);
    if (!safe) setError("Enter an https Pinterest board or Pin link.");
    else setError("");
    return safe;
  }
  return (
    <section aria-labelledby="board-import-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="board-import-title" className="font-serif text-2xl">
            Add inspiration
          </h2>
          <p className="mt-2 text-sm text-ink/60">
            Upload photos or bring ideas from Google Photos and Pinterest.
          </p>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={onUpload}
          className="flex min-h-11 items-center gap-2 rounded-full border border-sand px-4 text-sm disabled:opacity-50"
        >
          <ImportIcon source="upload" />
          Upload a photo
        </button>
      </div>
      <div className="mt-5 grid min-w-0 gap-5 lg:grid-cols-2">
        <section
          aria-label="Google Photos import instructions"
          className="min-w-0 rounded-xl bg-cream p-4"
        >
          <h3 className="flex items-center gap-2 font-medium">
            <ImportIcon source="google" />
            Google Photos
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-ink/70">
            Download photos from Google, then upload them here. Direct library
            access isn’t connected.
          </p>
          <a
            href="https://photos.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex min-h-11 items-center text-xs underline underline-offset-4"
          >
            Open Google Photos ↗
          </a>
          <button
            type="button"
            disabled={disabled}
            onClick={onUpload}
            className="mt-4 min-h-11 rounded-full border border-sand bg-white px-4 text-sm disabled:opacity-50"
          >
            Upload a downloaded photo
          </button>
        </section>
        <section
          aria-label="Pinterest import instructions"
          className="min-w-0 rounded-xl bg-cream p-4"
        >
          <h3 className="flex items-center gap-2 font-medium">
            <ImportIcon source="pinterest" />
            Pinterest
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-ink/70">
            Preview a public board or Pin. Open private boards on Pinterest.
            Upload images you have permission to use.
          </p>
          <a
            href="https://www.pinterest.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex min-h-11 items-center text-xs underline"
          >
            Open Pinterest ↗
          </a>
          <form
            className="mt-3 space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const safe = validatedLink();
              if (!safe || disabled || saving) return;
              setSaving(true);
              setStatus("");
              try {
                await onLink(safe);
                setStatus(
                  "Link saved. Upload individual images to add them to Styled.",
                );
              } catch {
                setError("Could not save the link. Try again.");
              } finally {
                setSaving(false);
              }
            }}
          >
            <label className="block text-xs">
              Pinterest board or Pin link
              <input
                type="url"
                required
                maxLength={900}
                value={link}
                onChange={(e) => {
                  setLink(e.target.value);
                  setStatus("");
                }}
                placeholder="https://www.pinterest.com/…"
                className="mt-2 block min-h-11 w-full min-w-0 rounded-lg border border-sand bg-white px-3 text-sm"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                disabled={disabled || saving}
                className="min-h-11 rounded-full bg-ink px-4 text-xs text-cream disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save link"}
              </button>
              <button
                type="button"
                disabled={disabled || saving}
                onClick={() => {
                  const safe = validatedLink();
                  if (safe) onPreview(safe);
                }}
                className="min-h-11 px-2 text-xs underline disabled:opacity-50"
              >
                View beside board
              </button>
            </div>
          </form>
          {status && (
            <p role="status" className="mt-3 text-xs text-ink/70">
              {status}
            </p>
          )}
          {error && (
            <p role="alert" className="mt-3 text-xs text-clay">
              {error}
            </p>
          )}
        </section>
      </div>
      <p className="mt-4 text-xs text-ink/60">
        {!hasBoard
          ? "Create a board above to add photos and save links."
          : disabled
            ? "Please wait until your board is ready before adding ideas."
            : "Only catalogue products can be added to your basket."}
      </p>
    </section>
  );
}
