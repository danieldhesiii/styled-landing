import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Resolve the guest (or signed-in) user for an API route. Returns either the
// user, or a ready-made 401 response to return straight away:
//
//   const auth = await requireUser();
//   if (!auth.ok) return auth.response;
//   const { user, supabase } = auth;
export async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, error: "No session. Open the design studio first." },
        { status: 401 }
      ),
    };
  }

  return { ok: true as const, user: data.user as User, supabase };
}
