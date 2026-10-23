import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeLocalRedirect } from "@/lib/auth/navigation";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeLocalRedirect(url.searchParams.get("next"));
  const params = new URLSearchParams({ next });
  const recovery = url.searchParams.get("flow") === "recovery";
  const code = url.searchParams.get("code");
  let destination = `/auth/recovery?${params}&error=link`;
  if (code && !url.searchParams.has("error")) {
    try {
      // The per-request SSR client reads the PKCE verifier cookie and writes
      // session cookies through next/headers before this redirect is returned.
      const supabase = await createClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error && data.session && !data.user?.is_anonymous) {
        destination = recovery ? `/auth/reset?${params}` : next;
      }
    } catch { /* Expired links and temporary auth failures have the same safe retry path. */ }
  }
  const response = NextResponse.redirect(new URL(destination, url.origin), 303);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
