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
  onUpload,
  onLink,
}: {
  disabled: boolean;
  onUpload: () => void;
  onLink: (url: string, name: string) => Promise<void>;
}) {
  const [source, setSource] = useState<"google" | "pinterest" | null>(null),
    [link, setLink] = useState(""),
    [linkName, setLinkName] = useState(""),
    [error, setError] = useState("");
  return (
    <section
      aria-labelledby="board-import-title"
      className="mb-6 border-b border-sand pb-6"
    >
      <h2 id="board-import-title" className="font-serif text-2xl">
        Add inspiration
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink/60">
        Bring photos and ideas into this board, then prepare them for the
        visualiser. Only catalogue pieces can be added to your basket.
      </p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={onUpload}
          className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl sm:min-h-16 sm:flex-row sm:justify-start sm:gap-3 border border-sand px-2 py-3 text-center text-xs sm:px-4 sm:text-left sm:text-sm disabled:opacity-50"
        >
          <ImportIcon source="upload" />
          <span>
            Upload a photo
            <span className="mt-1 hidden text-xs text-ink/60 sm:block">
              From your device
            </span>
          </span>
        </button>
        {(
          [
            ["google", "Google Photos", "How to add your photos"],
            ["pinterest", "Pinterest", "Save a link or add images"],
          ] as const
        ).map(([id, label, detail]) => (
          <button
            key={id}
            type="button"
            aria-expanded={source === id}
            aria-controls="board-import-guide"
            onClick={() => {
              setSource(source === id ? null : id);
              setError("");
            }}
            className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl sm:min-h-16 sm:flex-row sm:justify-start sm:gap-3 border px-2 py-3 text-center text-xs sm:px-4 sm:text-left sm:text-sm ${source === id ? "border-clay bg-cream" : "border-sand"}`}
          >
            <ImportIcon source={id} />
            <span>
              {label}
              <span className="mt-1 hidden text-xs text-ink/60 sm:block">
                {detail}
              </span>
            </span>
          </button>
        ))}
      </div>
      {source && (
        <div
          id="board-import-guide"
          className="mt-4 rounded-xl bg-cream p-4 text-sm"
        >
          <h3 className="font-medium">
            {source === "google"
              ? "Add photos from Google Photos"
              : "Bring Pinterest ideas into your board"}
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-ink/60">
            Direct account import is not connected yet.{" "}
            {source === "google"
              ? "For now, open Google Photos, download the photos you want to use, then upload them here. Styled cannot browse your Google library."
              : "For now, save a Pinterest board or Pin link below. To use an image in the visualiser, upload a copy you have permission to use. A saved link does not import the images from a Pinterest board."}
          </p>
          <ol className="mt-3 list-inside list-decimal space-y-2 text-xs leading-relaxed">
            <li>
              <a
                href={
                  source === "google"
                    ? "https://photos.google.com/"
                    : "https://www.pinterest.com/"
                }
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4"
              >
                Open {source === "google" ? "Google Photos" : "Pinterest"} in a
                new tab ↗
              </a>{" "}
              and choose your inspiration.
            </li>
            <li>
              {source === "google"
                ? "Download your selected photos to your device."
                : "Copy a board or Pin link, or download an image you have permission to use."}
            </li>
            <li>
              Upload the photo here, then choose Use board in visualiser when
              you are ready.
            </li>
          </ol>
          {source === "pinterest" && (
            <form
              className="mt-4 flex flex-wrap items-end gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const url = pinterestLink(link);
                if (!url) {
                  setError("Enter an https Pinterest board or Pin link.");
                  return;
                }
                setError("");
                try {
                  await onLink(url, linkName.trim());
                  setLink("");
                  setLinkName("");
                } catch {
                  setError("Could not save the link. Please try again.");
                }
              }}
            >
              <label className="min-w-0 flex-1 basis-full text-xs">
                Name this link
                <input
                  type="text"
                  maxLength={80}
                  value={linkName}
                  onChange={(e) => setLinkName(e.target.value)}
                  placeholder="e.g. Ceremony arch ideas"
                  className="mt-2 block w-full rounded-lg border border-sand bg-white px-3 py-2.5 text-sm"
                />
              </label>
              <label className="min-w-0 flex-1 text-xs">
                Pinterest board or Pin link
                <input
                  type="url"
                  required
                  maxLength={900}
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://www.pinterest.com/…"
                  className="mt-2 block w-full rounded-lg border border-sand bg-white px-3 py-2.5 text-sm"
                />
              </label>
              <button
                disabled={disabled}
                className="rounded-full border border-sand bg-white px-4 py-2.5 text-xs disabled:opacity-50"
              >
                Save Pinterest link
              </button>
            </form>
          )}
          {error && (
            <p role="alert" className="mt-3 text-xs text-clay">
              {error}
            </p>
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={onUpload}
            className="mt-4 rounded-full bg-ink px-4 py-2.5 text-xs text-cream disabled:opacity-50"
          >
            Upload selected photo
          </button>
          {disabled && (
            <p className="mt-2 text-xs text-ink/60">
              Create or select a board and wait for it to finish saving before
              adding inspiration.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
