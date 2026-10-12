import { NextResponse } from "next/server";
import { requireVendor } from "@/lib/server/vendor";
import { applyStockImport, planStockImport } from "@/lib/server/stock-import";
import { MAX_IMPORT_CHARS } from "@/lib/stock-import";

export const dynamic = "force-dynamic";

const fail = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status });

// POST /api/vendor/stock-import  { csv, filename?, apply? }
//
// A supplier previews or applies their own stock list. The supplier comes from
// their login, never from the request, so they can only ever change their own
// products. New products they add start hidden until Styled reviews them.
export async function POST(req: Request) {
  const auth = await requireVendor(req);
  if (!auth.ok) return auth.response;
  const { admin, supplierId, actor } = auth;

  let body: { csv?: unknown; filename?: unknown; apply?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail(400, "Invalid request body.");
  }
  if (typeof body.csv !== "string" || body.csv.trim() === "") return fail(400, "Choose a file or paste your stock list.");
  if (body.csv.length > MAX_IMPORT_CHARS) return fail(413, "That file is too large. Please split it into smaller lists.");

  try {
    if (body.apply === true) {
      const { data: allowed } = await admin.rpc("hit_rate_limit", { p_key: `stock-import:${actor.id}`, p_limit: 20, p_window_seconds: 3600 });
      if (allowed === false) return fail(429, "Too many imports in the last hour. Please wait a little.");
      const { plan, result } = await applyStockImport({
        admin,
        supplierId,
        csv: body.csv,
        mode: "vendor",
        actor,
        filename: typeof body.filename === "string" ? body.filename : null,
      });
      return NextResponse.json({ ok: true, applied: result !== null, plan, result });
    }
    const plan = await planStockImport({ admin, supplierId, csv: body.csv, mode: "vendor" });
    return NextResponse.json({ ok: true, applied: false, plan, result: null });
  } catch (err) {
    console.error("[vendor/stock-import]", err);
    return fail(500, "Couldn't process that stock list. Nothing was changed.");
  }
}
