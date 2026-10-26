import { requireUser } from "./session";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
export const venueUuid = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export async function requireVenueAccount(req?: Request) {
  if (req && !["GET", "HEAD"].includes(req.method)) {
    const origin = req.headers.get("origin");
    try {
      if (
        origin &&
        new URL(origin).host !==
          (req.headers.get("host") || new URL(req.url).host)
      )
        return {
          ok: false as const,
          response: NextResponse.json(
            { error: "Cross-site request refused." },
            { status: 403 },
          ),
        };
    } catch {
      return {
        ok: false as const,
        response: NextResponse.json(
          { error: "Invalid origin." },
          { status: 403 },
        ),
      };
    }
    if (
      req.method === "POST" &&
      !req.headers.get("content-type")?.includes("application/json")
    )
      return {
        ok: false as const,
        response: NextResponse.json({ error: "Send JSON." }, { status: 415 }),
      };
  }
  const auth = await requireUser();
  if (!auth.ok) return auth;
  if (
    auth.user.is_anonymous ||
    !auth.user.email ||
    !auth.user.email_confirmed_at
  )
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Sign in with a confirmed email address to continue." },
        { status: 401 },
      ),
    };
  return { ...auth, admin: createAdminClient() };
}
export function londonToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
