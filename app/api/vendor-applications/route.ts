import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { VENDOR_CATEGORY_VALUES } from "@/lib/vendor-categories";

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
    body = await req.json();
  } catch {
    return fail(400, "Invalid request body.");
  }
  if (!body || typeof body !== "object") return fail(400, "Invalid request body.");

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

  if (businessName.length < 2 || businessName.length > 120) return fail(422, "Please enter your business name.");
  if (!EMAIL.test(email) || email.length > 160) return fail(422, "Please enter a valid email address.");
  if (contactName.length > 120) return fail(422, "That contact name is too long.");
  if (phone.length > 40) return fail(422, "That phone number is too long.");
  if (category && !VENDOR_CATEGORY_VALUES.has(category)) return fail(422, "Please choose a category from the list.");
  if (area.length > 120) return fail(422, "That area is too long.");
  if (website.length > 200) return fail(422, "That website address is too long.");
  if (message.length > 2000) return fail(422, "Please keep your message under 2000 characters.");

  const admin = createAdminClient();

  // If this email already has an application we haven't finished reviewing, don't
  // create a duplicate — tell them it's already with us. (A declined applicant is
  // free to apply again.)
  const { data: existing } = await admin
    .from("vendor_applications")
    .select("id")
    .eq("email", email)
    .in("status", ["new", "reviewing", "accepted"])
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { ok: true, repeated: true, message: "We've already got your application and will be in touch." },
      { status: 200 }
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

  return NextResponse.json({ ok: true }, { status: 201 });
}
