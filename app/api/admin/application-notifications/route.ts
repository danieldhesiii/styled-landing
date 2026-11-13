import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/server/staff";
import { dispatchApplicationNotifications } from "@/lib/server/application-notifications";
export async function POST(req: Request) {
  const auth = await requireStaff(req);
  if (!auth.ok) return auth.response;
  const result = await dispatchApplicationNotifications(auth.admin);
  return NextResponse.json(
    { ok: !("error" in result), ...result },
    {
      status: "error" in result ? 503 : 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
