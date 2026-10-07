import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/server/staff";

// PATCH /api/admin/vendor-applications/[id]  { status }
// Move an application through the pipeline: new → reviewing → accepted/declined.
// Staff only. (Accepting is a decision to onboard them; the supplier/products are
// still created separately — that's the next admin screen to build.)
const STATUSES = ["new", "reviewing", "accepted", "declined"];

function fail(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff(req);
  if (!auth.ok) return auth.response;
  const { id } = await params;

  let body: { status?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail(400, "Invalid request body.");
  }

  if (typeof body.status !== "string" || !STATUSES.includes(body.status)) {
    return fail(400, `status must be one of: ${STATUSES.join(", ")}.`);
  }

  const { data, error } = await auth.admin
    .from("vendor_applications")
    .update({ status: body.status })
    .eq("id", id)
    .select("id, status");
  if (error) {
    console.error("[admin/vendor-applications PATCH]", error);
    return fail(500, "Couldn't update the application.");
  }
  if (!data || data.length === 0) return fail(404, "Application not found.");
  return NextResponse.json({ ok: true, application: data[0] });
}
