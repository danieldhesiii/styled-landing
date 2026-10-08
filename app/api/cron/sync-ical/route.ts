import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/server/env";
import { syncSupplierCalendar } from "@/lib/server/ical";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET /api/cron/sync-ical — re-sync every supplier's connected calendar.
//
// Run on a schedule by Vercel Cron (see vercel.json). Protected by CRON_SECRET:
// Vercel sends it as a Bearer token. Without the secret set, the job refuses to
// run, so the endpoint can't be triggered by anyone else. Vendors can still
// sync on demand from the portal regardless.
export async function GET(req: Request) {
  const secret = env.cronSecretIfSet;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: suppliers } = await admin
    .from("suppliers")
    .select("id, ical_url")
    .not("ical_url", "is", null);

  let synced = 0;
  let failed = 0;
  for (const s of suppliers ?? []) {
    const result = await syncSupplierCalendar(admin, s.id as string, s.ical_url as string);
    if (result.ok) synced++;
    else { failed++; console.error(`[cron/sync-ical] ${s.id}: ${result.error}`); }
  }

  return NextResponse.json({ ok: true, suppliers: (suppliers ?? []).length, synced, failed });
}
