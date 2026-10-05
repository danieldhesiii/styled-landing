import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Keeps the guest session fresh. Supabase access tokens are short-lived; this
// refreshes them and writes the new cookies onto both the request and the
// response. It never creates a session: the browser does that on first visit to
// the design studio (see components/session/GuestSession.tsx), so landing page
// traffic and bots don't mint anonymous users.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Validates the token with Supabase Auth (getUser, not getSession).
  await supabase.auth.getUser();

  return response;
}
