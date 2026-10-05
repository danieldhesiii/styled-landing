import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/server/staff";

// Who's signed in as staff (used by the admin header, and to check access).
export async function GET(req: Request) {
  const auth = await requireStaff(req);
  if (!auth.ok) return auth.response;
  return NextResponse.json({ ok: true, email: auth.user.email });
}
