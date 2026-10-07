import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/server/staff";

// GET /api/admin/accounts: the couples who have created an account, with a quick
// read of how active each one is (saved looks, orders, renders). Staff only.
// Anonymous guests and staff accounts are left out.
export async function GET(req: Request) {
  const auth = await requireStaff(req);
  if (!auth.ok) return auth.response;
  const { admin } = auth;

  const { data: list, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) {
    console.error("[admin/accounts] couldn't list users:", error);
    return NextResponse.json({ ok: false, error: "Couldn't load accounts." }, { status: 500 });
  }

  const { data: staffRows } = await admin.from("staff").select("user_id");
  const staffIds = new Set((staffRows ?? []).map((r) => r.user_id as string));

  // Count rows per owner for each kind of activity.
  const tally = async (table: string) => {
    const { data } = await admin.from(table).select("owner_id");
    const m = new Map<string, number>();
    for (const row of data ?? []) {
      const id = (row as { owner_id: string | null }).owner_id;
      if (id) m.set(id, (m.get(id) ?? 0) + 1);
    }
    return m;
  };
  const [saved, orders, renders] = await Promise.all([
    tally("saved_looks"),
    tally("orders"),
    tally("renders"),
  ]);

  const accounts = (list.users ?? [])
    .filter((u) => u.email && !u.is_anonymous && !staffIds.has(u.id))
    .map((u) => ({
      id: u.id,
      email: u.email,
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at ?? null,
      savedLooks: saved.get(u.id) ?? 0,
      orders: orders.get(u.id) ?? 0,
      renders: renders.get(u.id) ?? 0,
    }))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  return NextResponse.json({ ok: true, accounts });
}
