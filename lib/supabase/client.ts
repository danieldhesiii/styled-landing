import { createBrowserClient } from "@supabase/ssr";

// Browser client. Uses the publishable key, so everything it does is bound by
// row level security. Variables are referenced statically so Next inlines them.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
