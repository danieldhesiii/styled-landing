"use client";
import { useEffect, useMemo, useRef } from "react";
import { pinterestLink } from "@/lib/board-inspiration";
import { pinterestPreviewDocument } from "@/lib/pinterest";
import { ImportIcon } from "./BoardImports";

export default function PinterestPreview({ url, boardName, disabled, onClose, onUpload }: {
  url: string; boardName: string; disabled: boolean; onClose: () => void; onUpload: () => void;
}) {
  const safe = pinterestLink(url);
  const heading = useRef<HTMLHeadingElement>(null);
  const previewHtml = useMemo(() => pinterestPreviewDocument(url), [url]);
  useEffect(() => {
    heading.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    heading.current?.focus({ preventScroll: true });
  }, [url]);
  if (!safe) return null;
  return <aside aria-label="Pinterest inspiration workspace" className="order-first min-w-0 self-start lg:order-last rounded-2xl border border-sand bg-cream p-4">
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-2"><ImportIcon source="pinterest" /><h2 ref={heading} tabIndex={-1} className="font-serif text-2xl outline-none">Pinterest inspiration</h2></div>
      <button type="button" onClick={onClose} aria-label="Close Pinterest preview" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-sand bg-white text-lg">×</button>
    </div>
    <p className="mt-3 text-sm leading-relaxed text-ink/70">Browse inspiration alongside {boardName}. Viewing a Pin here does not add its image to Styled.</p>
    <div className="mt-4 flex flex-wrap gap-3 text-sm">
      <button type="button" onClick={() => window.open(safe, "_blank", "noopener,noreferrer,popup,width=950,height=850")} className="min-h-11 rounded-full border border-sand bg-white px-4 py-2">Open Pinterest window ↗</button>
      <a href={safe} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center underline">Open in new tab ↗</a>
    </div>
    {previewHtml ? <>
      <p className="mt-4 text-xs leading-relaxed text-ink/60">Public preview from Pinterest. It may show only some Pins. If it is blank, asks you to sign in, or your board is private, use Open Pinterest window.</p>
      <iframe key={safe} title="Pinterest board or Pin preview" srcDoc={previewHtml}
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer" loading="lazy"
        className="mt-3 h-[520px] w-full min-w-0 rounded-xl border border-sand bg-white" />
    </> : <p role="status" className="mt-4 rounded-xl border border-sand bg-white p-4 text-sm leading-relaxed">Open this link in the Pinterest window to see its images. For a preview here, copy the full board or Pin address from Pinterest’s address bar instead of a shortened share link.</p>}
    <div className="mt-4 border-t border-sand pt-4">
      <h3 className="font-medium text-sm">Add a chosen image to {boardName}</h3>
      <ol className="mt-2 list-inside list-decimal space-y-2 text-xs leading-relaxed text-ink/70">
        <li>Open the Pin on Pinterest and use its Download image option, when available.</li>
        <li>Upload the downloaded image here if you have permission to use it.</li>
        <li>Choose Use board in visualiser when your inspiration is ready.</li>
      </ol>
      <button type="button" disabled={disabled} onClick={onUpload} className="mt-4 min-h-11 w-full rounded-full bg-ink px-4 py-3 text-sm text-cream disabled:opacity-50">Upload chosen image to this board</button>
      <p className="mt-2 text-xs text-ink/60">The Pinterest link is a reference. Only uploaded images are sent to the visualiser when you choose them.</p>
    </div>
  </aside>;
}
