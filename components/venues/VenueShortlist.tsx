"use client";
import { useEffect, useState } from "react";
export const VENUE_SHORTLIST_KEY = "styled:venue-shortlist";
export function readVenueShortlist(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(VENUE_SHORTLIST_KEY) || "[]");
    return Array.isArray(raw)
      ? raw
          .filter((x) => typeof x === "string" && /^[0-9a-f-]{36}$/i.test(x))
          .slice(0, 100)
      : [];
  } catch {
    return [];
  }
}
export default function VenueShortlist({ id }: { id: string }) {
  const [saved, setSaved] = useState(false),
    [notice, setNotice] = useState("");
  useEffect(() => {
    const sync = () => setSaved(readVenueShortlist().includes(id));
    sync();
    window.addEventListener("venue-shortlist", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("venue-shortlist", sync);
      window.removeEventListener("storage", sync);
    };
  }, [id]);
  return (
    <div>
      <button
        type="button"
        aria-pressed={saved}
        aria-label={`${saved ? "Remove venue from" : "Add venue to"} shortlist`}
        onClick={() => {
          try {
            const ids = readVenueShortlist();
            if (!saved && ids.length >= 100) {
              setNotice(
                "Your shortlist has 100 venues. Remove one to save another.",
              );
              return;
            }
            localStorage.setItem(
              VENUE_SHORTLIST_KEY,
              JSON.stringify(
                saved ? ids.filter((x) => x !== id) : [...ids, id],
              ),
            );
            window.dispatchEvent(new Event("venue-shortlist"));
            setNotice(
              saved
                ? "Removed from this device’s shortlist."
                : "Saved to this device’s shortlist.",
            );
          } catch {
            setNotice("Your browser could not save the shortlist.");
          }
        }}
        className="rounded-full border border-sand px-4 py-2 text-xs transition-colors hover:border-clay"
      >
        {saved ? "♥ Shortlisted" : "♡ Save venue"}
      </button>
      <span className="sr-only" role="status">
        {notice}
      </span>
    </div>
  );
}
