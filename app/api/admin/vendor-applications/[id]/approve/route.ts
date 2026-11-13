import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/server/staff";
import { supplierJson } from "@/lib/server/supplier-body";
import { UUID } from "@/lib/pilot-readiness";
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireStaff(req);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  let body;
  try {
    body = await supplierJson(req, 2000);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Check the approval form." },
      { status: 400 },
    );
  }
  if (!UUID.test(id) || body.confirmReviewed !== true)
    return NextResponse.json(
      { ok: false, error: "Confirm that you have vetted this supplier." },
      { status: 422 },
    );
  const result = await auth.admin.rpc("approve_supplier_application", {
    p_application: id,
    p_actor: auth.user.id,
  });
  if (result.error)
    return NextResponse.json(
      {
        ok: false,
        error:
          result.error.code === "23505"
            ? "A supplier with this business name already exists. Check its account before creating access."
            : "Could not approve this application. Reopen declined applications first; venue applications use the venue review flow.",
      },
      { status: 409 },
    );
  return NextResponse.json(
    {
      ok: true,
      supplierId: result.data,
      message:
        "Approved. The private workspace is ready. Send the supplier invitation to give account access.",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
