import { supplierJson } from "@/lib/server/supplier-body";
import { NextResponse } from "next/server";
import { createAnonClient } from "@/lib/supabase/anon";
import { supplierReadiness } from "@/lib/vendor-readiness";
import {validReplyHours} from "@/lib/message-status";
import { servicesInput } from "@/lib/supplier-workspace";
import { requireVendor } from "@/lib/server/vendor";
export async function GET(req: Request) {
  const auth = await requireVendor(req);
  if (!auth.ok) return auth.response;
  const [s, p, draft, live] = await Promise.all([
    auth.admin
      .from("suppliers")
      .select(
        "name,area,contact_email,active,logo_url,bio,service_details,message_reply_hours,onboarding_availability_confirmed_at",
      )
      .eq("id", auth.supplierId)
      .single(),
    auth.admin
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("supplier_id", auth.supplierId),
    auth.admin
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("supplier_id", auth.supplierId)
      .eq("active", false),
    // Use public RLS and the supplier join, just as loadCatalogue does.
    createAnonClient()
      .from("products")
      .select("id,suppliers!inner(id)", { count: "exact", head: true })
      .eq("supplier_id", auth.supplierId),
  ]);
  if (s.error || !s.data || p.error || draft.error || live.error)
    return NextResponse.json(
      { error: "Could not load onboarding." },
      { status: 503 },
    );
  return NextResponse.json(
    {
      profile: s.data,
      productCount: p.count ?? 0,
      readiness: supplierReadiness({
        logoUrl: s.data.logo_url,
        availabilityReviewedAt: s.data.onboarding_availability_confirmed_at,
        total: p.count ?? 0,
        draft: draft.count ?? 0,
        live: live.count ?? 0,
        supplierId: auth.supplierId,
      }),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
export async function POST(req: Request) {
  const auth = await requireVendor(req);
  if (!auth.ok) return auth.response;
  let body;
  try {
    body = await supplierJson(req);
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const patch: Record<string, unknown> = {};
  if(body?.messageReplyHours!==undefined){
    if(!validReplyHours(body.messageReplyHours))return NextResponse.json({error:"Choose a reply target between 1 and 168 hours, or leave it unset."},{status:422});
    patch.message_reply_hours=body.messageReplyHours;
  }
  if (body?.services !== undefined) {
    const services = servicesInput(body.services);
    if (!services)
      return NextResponse.json(
        { error: "Check your business rules, amounts and percentages." },
        { status: 422 },
      );
    patch.service_details = services;
  }
  for (const key of ["name", "area", "contact_email"] as const) {
    if (body?.[key] !== undefined) {
      const v = body[key];
      if (
        typeof v !== "string" ||
        !v.trim() ||
        v.length > 200 ||
        /[\r\n\x00]/.test(v) ||
        (key === "contact_email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
      )
        return NextResponse.json(
          { error: "Check your business name, area and email." },
          { status: 422 },
        );
      patch[key] = v.trim();
    }
  }
  if (body?.bio !== undefined) {
    if (typeof body.bio !== "string" || body.bio.length > 2000)
      return NextResponse.json(
        { error: "Keep your story under 2,000 characters." },
        { status: 422 },
      );
    patch.bio = body.bio.trim() || null;
  }
  if (body?.confirmAvailability === true)
    patch.onboarding_availability_confirmed_at = new Date().toISOString();
  if (!Object.keys(patch).length)
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  const { error } = await auth.admin
    .from("suppliers")
    .update(patch)
    .eq("id", auth.supplierId);
  return error
    ? NextResponse.json({ error: "Could not save profile." }, { status: 503 })
    : NextResponse.json({ ok: true });
}
