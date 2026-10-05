import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/server/env";

// Per-request server client acting as the signed-in (guest) couple, so row
// level security applies. Use in route handlers and server components.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a server component, where cookies are read-only.
          // The middleware refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}
