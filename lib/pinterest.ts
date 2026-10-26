import { pinterestLink } from "./board-inspiration";

export interface PinterestPreviewLink {
  url: string;
  kind: "board" | "pin";
}

// Only full board/Pin URLs can be embedded. Short links and account/settings
// pages remain ordinary links; never fetch arbitrary redirects on our server.
export function pinterestPreviewLink(value: string): PinterestPreviewLink | null {
  const safe = pinterestLink(value);
  if (!safe) return null;
  const u = new URL(safe);
  if (u.hostname === "pin.it") return null;
  const parts = u.pathname.split("/").filter(Boolean);
  if (parts.length === 2 && parts[0] === "pin" && /^\d{1,30}$/.test(parts[1]))
    return { url: `https://www.pinterest.com/pin/${parts[1]}/`, kind: "pin" };
  if (parts.length !== 2 || !/^[a-zA-Z0-9_]{1,100}$/.test(parts[0]) ||
    ["pin", "ideas", "search", "settings", "business", "login", "logout", "oauth", "resource", "_", "today", "explore"].includes(parts[0].toLowerCase())) return null;
  try {
    const slug = decodeURIComponent(parts[1]);
    if (!slug || slug.length > 300 || /[\u0000-\u001f\u007f/\\?#<>"']/.test(slug)) return null;
    return { url: `https://www.pinterest.com/${parts[0]}/${encodeURIComponent(slug)}/`, kind: "board" };
  } catch { return null; }
}

// Pinterest's official widget runs in a separate sandboxed document, with no
// access to the parent Styled page, session or private inspiration uploads.
export function pinterestPreviewDocument(value: string): string | null {
  const link = pinterestPreviewLink(value);
  if (!link) return null;
  const url = link.url.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><style>html,body{margin:0;padding:0;background:#fff;font:14px Arial,sans-serif}body{padding:8px;box-sizing:border-box;overflow-x:hidden}a{color:#71533f}body>span{max-width:100%!important}</style></head><body><a data-pin-do="${link.kind === "board" ? "embedBoard" : "embedPin"}" data-pin-scale-height="440" data-pin-scale-width="80" href="${url}" target="_blank" rel="noopener noreferrer">View on Pinterest</a><script async defer src="https://assets.pinterest.com/js/pinit.js"></script></body></html>`;
}
