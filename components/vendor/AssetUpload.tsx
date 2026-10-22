"use client";
import { useState } from "react";
export default function AssetUpload({
  kind,
  productId,
  onUploaded,
  endpoint,
}: {
  kind: "logo" | "product";
  productId?: string;
  onUploaded?: () => void;
  endpoint?: string;
}) {
  const [busy, setBusy] = useState(false),
    [status, setStatus] = useState("");
  return (
    <div>
      <label className="inline-block cursor-pointer rounded-full border border-sand px-4 py-2 text-sm">
        {busy
          ? "Uploading…"
          : kind === "logo"
            ? "Upload business logo"
            : "Upload product photo"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          className="sr-only"
          onChange={async (e) => {
            const input = e.currentTarget;
            const file = input.files?.[0];
            if (!file) return;
            if (file.size > 5 * 1024 * 1024) {
              setStatus("Choose an image smaller than 5 MB.");
              return;
            }
            setBusy(true);
            setStatus("");
            try {
              const image = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result));
                reader.onerror = () => reject(Error("Could not read file."));
                reader.readAsDataURL(file);
              });
              const r = await fetch(endpoint || "/api/vendor/assets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ kind, productId, image }),
              });
              const d = await r.json();
              if (!r.ok) throw Error(d.error);
              setStatus("Image saved.");
              onUploaded?.();
            } catch (error) {
              setStatus(
                error instanceof Error ? error.message : "Could not upload.",
              );
            } finally {
              setBusy(false);
              input.value = "";
            }
          }}
        />
      </label>
      <p role="status" className="mt-2 text-xs text-ink/60">
        {status || "JPEG, PNG or WebP, up to 5 MB."}
      </p>
    </div>
  );
}
