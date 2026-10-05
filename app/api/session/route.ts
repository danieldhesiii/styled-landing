import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/session";

// Who am I? Used by the client to confirm a guest session exists.
export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  return NextResponse.json({
    ok: true,
    userId: auth.user.id,
    isAnonymous: auth.user.is_anonymous ?? false,
  });
}
