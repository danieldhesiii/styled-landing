"use client";
import { useState } from "react";
export default function VenuePhotoUpload({
  venueId,
  onUploaded,
}: {
  venueId: string;
  onUploaded: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function upload(input: HTMLInputElement, kind: "hero" | "gallery") {
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setMessage("Choose an image smaller than 5 MB.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(Error("Could not read photo."));
        reader.readAsDataURL(file);
      });
      const r = await fetch("/api/admin/venues/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueId, kind, image }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setMessage("Photo saved.");
      onUploaded();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not upload photo.",
      );
    } finally {
      setBusy(false);
      input.value = "";
    }
  }
  return (
    <section className="mt-6 rounded-xl border border-sand p-5">
      <h2 className="font-serif text-2xl">Venue photography</h2>
      <p className="mt-2 text-sm text-ink/60">
        Upload your own photos for the public page and visualiser. Save any form
        changes first.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        {(["hero", "gallery"] as const).map((kind) => (
          <label
            key={kind}
            className="cursor-pointer rounded-full border border-sand px-4 py-2 text-sm"
          >
            {kind === "hero" ? "Replace main photo" : "Add gallery photo"}
            <input
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              onChange={(e) => void upload(e.currentTarget, kind)}
            />
          </label>
        ))}
      </div>
      <p role="status" className="mt-3 text-xs text-ink/60">
        {busy ? "Uploading…" : message || "JPEG, PNG or WebP, up to 5 MB."}
      </p>
    </section>
  );
}
