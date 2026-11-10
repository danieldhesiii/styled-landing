import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // These endpoints own their authentication or rate limiting and do not use a browser session.
  if (["/api/health", "/api/webhooks/brevo", "/api/webhooks/resend", "/api/client-errors"].includes(request.nextUrl.pathname)) return NextResponse.next();
  return updateSession(request);
}

// Only routes that use the guest session. The marketing site is untouched.
export const config = {
  matcher: [
    "/design/:path*",
    "/api/:path*",
    "/admin/:path*",
    "/order/:path*",
    "/portal/:path*",
    "/venue-portal/:path*",
    "/venues/requests/:path*",
    "/venues/:path*",
  ],
};
