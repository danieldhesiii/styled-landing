import { NextResponse } from "next/server";
import { requireVendor } from "@/lib/server/vendor";

export const dynamic = "force-dynamic";

// GET /api/vendor/me: who's signed in as a vendor, and their supplier.
export async function GET(req: Request) {
  const auth = await requireVendor(req);
  if (!auth.ok) return auth.response;
  return NextResponse.json({
    ok: true,
    email: auth.user.email,
    supplier: { name: auth.supplier.name, active: auth.supplier.active },
  });
}
