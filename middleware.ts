import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

// Only routes that use the guest session. The marketing site is untouched.
export const config = {
  matcher: ["/design/:path*", "/api/:path*", "/admin/:path*", "/order/:path*"],
};
