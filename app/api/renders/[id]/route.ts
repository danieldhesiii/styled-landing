import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { SIGNED_URL_SECONDS } from "@/lib/server/photos";
import { STALE_RENDER_MINUTES, friendlyRenderError } from "@/lib/server/render-errors";

// GET /api/renders/[id]: where is this render up to? Polled by the studio after
// POST /api/generate. Only the guest's own renders are visible (row level security).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { supabase } = auth;
  const { id } = await params;

  const { data: render } = await supabase
    .from("renders")
    .select("id, status, image_path, error_kind, parent_render_id, depth, created_at")
    .eq("id", id)
    .maybeSingle();

  if (!render) {
    return NextResponse.json({ ok: false, error: "Render not found." }, { status: 404 });
  }

  let status = render.status as string;
  let errorKind = render.error_kind as string | null;

  // A job that never finished (the function was killed) would otherwise spin forever.
  const ageMs = Date.now() - new Date(render.created_at as string).getTime();
  if ((status === "queued" || status === "running") && ageMs > STALE_RENDER_MINUTES * 60 * 1000) {
    await createAdminClient()
      .from("renders")
      .update({ status: "failed", error_kind: "timeout", error: "Timed out", completed_at: new Date().toISOString() })
      .eq("id", id)
      .in("status", ["queued", "running"]);
    status = "failed";
    errorKind = "timeout";
  }

  let imageUrl: string | null = null;
  if (status === "succeeded" && render.image_path) {
    const { data: signed } = await supabase.storage
      .from("renders")
      .createSignedUrl(render.image_path as string, SIGNED_URL_SECONDS);
    imageUrl = signed?.signedUrl ?? null;
  }

  return NextResponse.json({
    ok: true,
    renderId: render.id,
    status,
    imageUrl,
    parentRenderId: render.parent_render_id,
    depth: render.depth,
    error: status === "failed" ? friendlyRenderError(errorKind) : null,
    errorKind: status === "failed" ? (errorKind ?? "failed") : null,
  });
}
