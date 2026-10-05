import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/server/env";

// Service-role client. BYPASSES row level security: use only in server routes
// for writes clients must not make themselves (renders, orders, form intake),
// and always scope queries to the verified user id yourself.
export function createAdminClient() {
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
