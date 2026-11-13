import { after } from "next/server";
import { supplierJson } from "@/lib/server/supplier-body";
import { dispatchApplicationNotifications } from "@/lib/server/application-notifications";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { VENDOR_CATEGORY_VALUES } from "@/lib/vendor-categories";
import { clientIpHash } from "@/lib/server/limits";

// POST /api/vendor-applications
//
// A supplier asks to list their business on Styled. This is a public lead form
// (no account needed), so it's written with the service role — the table has row
// level security on with no client policies. Staff review applications in
// /admin/vendors.
//
// Body: { businessName, email, contactName?, phone?, category?, area?, website?,
//         message?, company? }  ("company" is a honeypot — bots fill it in.)

function fail(status: number, error: string) {
  return NextResponse.json({ ok: false, error, status }, { status });
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) {
    return fail(415, "Send JSON.");
  }

  let body: Record<string, unknown>;
  try {
    body = await supplierJson(req, 10000);
  } catch {
    return fail(400, "Invalid request body.");
  }
  if (!body || typeof body !== "object")
    return fail(400, "Invalid request body.");

  // Honeypot: a real person leaves this blank. Pretend it worked so bots don't
  // learn anything.
  if (str(body.company)) return NextResponse.json({ ok: true }, { status: 201 });

  const businessName = str(body.businessName);
  const email = str(body.email).toLowerCase();
  const contactName = str(body.contactName);
  const phone = str(body.phone);
  const category = str(body.category);
  const area = str(body.area);
  const website = str(body.website);
  const message = str(body.message);

  if (businessName.length < 2 || businessName.length > 120)
    return fail(422, "Please enter your business name.");
  if (!EMAIL.test(email) || email.length > 160)
    return fail(422, "Please enter a valid email address.");
  if (contactName.length < 2 || contactName.length > 120)
    return fail(422, "Please enter your contact name.");
  if (phone.length > 40) return fail(422, "That phone number is too long.");
  if (!category || (category !== "venue" && !VENDOR_CATEGORY_VALUES.has(category)))
    return fail(422, "Please choose a category from the list.");
  if (area.length < 2 || area.length > 120) return fail(422, "Please enter the area you cover.");
  if (website.length > 200)
    return fail(422, "That website address is too long.");
  if (message.length > 2000)
    return fail(422, "Please keep your message under 2000 characters.");

  const admin = createAdminClient();

  // Cap submissions per network so the form can't be flooded. Uses the existing
  // fixed-window counter (same as order lookup).
  // refuse a submission if its abuse limit cannot be verified.
  const { data: allowed, error: limitError } = await admin.rpc(
    "hit_rate_limit",
    {
      p_key: `vendor_app:${clientIpHash(req)}`,
      p_limit: 5,
      p_window_seconds: 3600,
    },
  );
  if (limitError || allowed !== true) {
    return fail(
      429,
      "We've had a few applications from your network. Please try again later.",
    );
  }

  // If this email already has an application we haven't finished reviewing, don't
  // create a duplicate — tell them it's already with us. (A declined applicant is
  // free to apply again.)
  const { data: existing, error: lookupError } = await admin
    .from("vendor_applications")
    .select("id")
    .eq("email", email)
    .in("status", ["new", "reviewing", "accepted"]).limit(1)
    .maybeSingle();
  if (lookupError) return fail(503, "Applications are temporarily unavailable. Please try again.");
  if (existing) {
    return NextResponse.json(
      {
        ok: true,
        repeated: true,
        message: "We've already got your application and will be in touch.",
      },
      { status: 200 },
    );
  }

  const { error } = await admin.from("vendor_applications").insert({
    business_name: businessName,
    contact_name: contactName || null,
    email,
    phone: phone || null,
    category: category || null,
    area: area || null,
    website: website || null,
    message: message || null,
  });
  if (error) {
    console.error("[vendor-applications] insert failed:", error);
    return fail(500, "Couldn't send your application. Please try again.");
  }

  after(async () => { await dispatchApplicationNotifications(admin); });
  return NextResponse.json({ ok: true, message: "Your application is with the Styled team. If approved, we will email you a private invitation to set up your supplier account." }, { status: 201 });
}
