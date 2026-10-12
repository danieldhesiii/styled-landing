import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/server/staff";
import { applyStockImport, planStockImport } from "@/lib/server/stock-import";
import { MAX_IMPORT_CHARS } from "@/lib/stock-import";
import { UUID } from "@/lib/server/admin-orders";

export const dynamic = "force-dynamic";

const fail = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status });

// POST /api/admin/stock-import  { supplierId, csv, filename?, apply? }
//
// Preview (apply omitted or false) or apply a supplier's stock list on their
// behalf. A preview writes nothing and returns exactly what would change.
// Staff only. See lib/server/stock-import.ts for the rules.
export async function POST(req: Request) {
  const auth = await requireStaff(req);
  if (!auth.ok) return auth.response;
  const { admin, actor } = auth;

  let body: { supplierId?: unknown; csv?: unknown; filename?: unknown; apply?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail(400, "Invalid request body.");
  }
  if (typeof body.supplierId !== "string" || !UUID.test(body.supplierId)) return fail(400, "Which supplier is this for?");
  if (typeof body.csv !== "string" || body.csv.trim() === "") return fail(400, "Choose a file or paste your stock list.");
  if (body.csv.length > MAX_IMPORT_CHARS) return fail(413, "That file is too large. Please split it into smaller lists.");

  const { data: supplier } = await admin.from("suppliers").select("id, name").eq("id", body.supplierId).maybeSingle();
  if (!supplier) return fail(404, "That supplier doesn't exist.");

  try {
    if (body.apply === true) {
      const { data: allowed } = await admin.rpc("hit_rate_limit", { p_key: `stock-import:${actor.id}`, p_limit: 30, p_window_seconds: 3600 });
      if (allowed === false) return fail(429, "Too many imports in the last hour. Please wait a little.");
      const { plan, result } = await applyStockImport({
        admin,
        supplierId: supplier.id as string,
        csv: body.csv,
        mode: "staff",
        actor,
        filename: typeof body.filename === "string" ? body.filename : null,
      });
      return NextResponse.json({ ok: true, applied: result !== null, plan, result, supplier: supplier.name });
    }
    const plan = await planStockImport({ admin, supplierId: supplier.id as string, csv: body.csv, mode: "staff" });
    return NextResponse.json({ ok: true, applied: false, plan, result: null, supplier: supplier.name });
  } catch (err) {
    console.error("[admin/stock-import]", err);
    return fail(500, "Couldn't process that stock list. Nothing was changed.");
  }
}
