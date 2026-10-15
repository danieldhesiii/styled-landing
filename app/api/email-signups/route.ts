import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/email-signups
// Saves a landing-page email capture to the email_signups table.
// Silently succeeds if the email is already registered so the user
// always gets redirected to /design without seeing an error.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let email: string | undefined;
  try {
    ({ email } = await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  if (!email || typeof email !== "string") {
    return NextResponse.json({ ok: false, error: "Please enter an email address." }, { status: 400 });
  }

  email = email.trim().toLowerCase();
  if (email.length > 254 || !EMAIL.test(email)) {
    return NextResponse.json({ ok: false, error: "Please enter a valid email address." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("email_signups").insert({
    email,
    source: "landing_cta",
  });

  // 23505 = unique_violation — email already captured, silently succeed.
  if (error && error.code !== "23505") {
    console.error("[email-signups] insert failed:", error);
    // Don't block the user — still return ok so they get to /design.
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
