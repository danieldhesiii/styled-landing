import { NextResponse } from "next/server";
import { requireVendor } from "@/lib/server/vendor";
import { syncSupplierCalendar } from "@/lib/server/ical";

export const dynamic = "force-dynamic";

const fail = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status });

// PUT /api/vendor/availability/ical  { url }
// Connect (or change) the supplier's calendar feed and sync it straight away.
export async function PUT(req: Request) {
  const auth = await requireVendor(req);
  if (!auth.ok) return auth.response;
  const { admin, supplierId } = auth;

  let body: { url?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail(400, "Invalid request body.");
  }
  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!/^https?:\/\/.+/i.test(url) || url.length > 2000) return fail(422, "Enter a valid calendar link (webcal links won't work — use the https version).");

  await admin.from("suppliers").update({ ical_url: url }).eq("id", supplierId);
  const result = await syncSupplierCalendar(admin, supplierId, url);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 422 });
  return NextResponse.json({ ok: true, blockedDays: result.blockedDays });
}

// POST /api/vendor/availability/ical — re-sync the stored feed now.
export async function POST(req: Request) {
  const auth = await requireVendor(req);
  if (!auth.ok) return auth.response;
  const { admin, supplierId } = auth;

  const { data: supplier } = await admin.from("suppliers").select("ical_url").eq("id", supplierId).maybeSingle();
  const url = supplier?.ical_url as string | null;
  if (!url) return fail(400, "No calendar is connected yet.");

  const result = await syncSupplierCalendar(admin, supplierId, url);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 422 });
  return NextResponse.json({ ok: true, blockedDays: result.blockedDays });
}

// DELETE /api/vendor/availability/ical — disconnect and remove its blocks.
export async function DELETE(req: Request) {
  const auth = await requireVendor(req);
  if (!auth.ok) return auth.response;
  const { admin, supplierId } = auth;

  await admin.from("availability_overrides").delete().eq("supplier_id", supplierId).eq("source", "ical");
  await admin.from("suppliers").update({ ical_url: null, ical_synced_at: null }).eq("id", supplierId);
  return NextResponse.json({ ok: true });
}
