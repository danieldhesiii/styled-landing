import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { requireStaff } from "@/lib/server/staff";

export const dynamic = "force-dynamic";

const fail = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status });
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// GET /api/admin/suppliers/[id]/users: the login accounts linked to this supplier.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff(req);
  if (!auth.ok) return auth.response;
  const { admin } = auth;
  const { id } = await params;

  const { data: links } = await admin.from("supplier_users").select("user_id, created_at").eq("supplier_id", id);
  if (!links || links.length === 0) return NextResponse.json({ ok: true, users: [] });

  // Resolve emails for the linked users.
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const emailById = new Map((list?.users ?? []).map((u) => [u.id, u.email ?? ""]));

  return NextResponse.json({
    ok: true,
    users: links.map((l) => ({ userId: l.user_id, email: emailById.get(l.user_id as string) ?? "(unknown)", createdAt: l.created_at })),
  });
}

// POST /api/admin/suppliers/[id]/users  { email }
// Give someone a portal login for this supplier. Creates the auth account if it's
// new (returning a one-time password to pass on), or links an existing account.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff(req);
  if (!auth.ok) return auth.response;
  const { admin } = auth;
  const { id } = await params;

  let body: { email?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail(400, "Invalid request body.");
  }
  const email = (typeof body.email === "string" ? body.email : "").trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 160) return fail(422, "Enter a valid email address.");

  // Supplier must exist.
  const { data: supplier } = await admin.from("suppliers").select("id").eq("id", id).maybeSingle();
  if (!supplier) return fail(404, "Supplier not found.");

  // Find an existing auth user with this email.
  let userId: string | null = null;
  for (let page = 1; page < 10 && !userId; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    const hit = (data?.users ?? []).find((u) => u.email?.toLowerCase() === email);
    if (hit) userId = hit.id;
    if (!data || data.users.length < 200) break;
  }

  let password: string | null = null;
  if (!userId) {
    password = randomBytes(15).toString("base64url");
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !data.user) {
      console.error("[admin/suppliers/users POST] createUser", error);
      return fail(500, "Couldn't create that account.");
    }
    userId = data.user.id;
  }

  // Guard: this user mustn't already act for a different supplier.
  const { data: existing } = await admin.from("supplier_users").select("supplier_id").eq("user_id", userId).maybeSingle();
  if (existing && existing.supplier_id !== id) {
    return fail(409, "That account already belongs to another supplier.");
  }

  const { error: linkError } = await admin.from("supplier_users").upsert({ user_id: userId, supplier_id: id }, { onConflict: "user_id" });
  if (linkError) {
    console.error("[admin/suppliers/users POST] link", linkError);
    return fail(500, "Couldn't link that account.");
  }

  return NextResponse.json({ ok: true, email, password, created: password !== null });
}
