import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/server/env";

// Server-side client with the publishable key and no user. It is bound by row
// level security exactly like a signed-out visitor: it can read the public
// catalogue (active rows only) and nothing else. Use it for catalogue reads so
// an inactive product can never be quoted or ordered by mistake.
export function createAnonClient() {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
