/** Accept only local destinations; reject encoded URL/parser ambiguities too. */
export function safeLocalRedirect(value: string | null | undefined, fallback = "/design"): string {
  if (!value || value !== value.trim() || /[\\\u0000-\u001f\u007f]/.test(value)) return fallback;
  let path = value.split(/[?#]/, 1)[0];
  try {
    for (let i = 0; i < 5; i++) {
      if (!path.startsWith("/") || path.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(path)) return fallback;
      const decoded = decodeURIComponent(path);
      if (decoded === path) break;
      path = decoded;
      if (i === 4) return fallback;
    }
    const url = new URL(value, "https://local.invalid");
    const decodedURL = new URL(path, "https://local.invalid");
    if (url.origin !== "https://local.invalid" || decodedURL.origin !== url.origin) return fallback;
    // Do not bounce into auth handlers or another login form.
    if ([url.pathname, decodedURL.pathname].some(p => /^\/(?:auth|login)(?:\/|$)/.test(p) || p === "/portal/login")) return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}

export function authCallbackPath(next: string, recovery = false): string {
  const params = new URLSearchParams({ next: safeLocalRedirect(next) });
  if (recovery) params.set("flow", "recovery");
  return `/auth/callback?${params}`;
}

export function supplierAccessStatus(status: number): "allowed" | "signed-out" | "denied" | "temporary" {
  if (status >= 200 && status < 300) return "allowed";
  if (status === 401) return "signed-out";
  if (status === 403) return "denied";
  return "temporary";
}
