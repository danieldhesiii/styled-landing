import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/session";
import { parseWorkspace } from "@/lib/workspace-input";
import type { WorkspaceData } from "@/lib/wedding";
import { VENUE_BUCKET, SIGNED_URL_SECONDS } from "@/lib/server/photos";
const fail = (status: number, error: string) =>
  NextResponse.json({ ok: false, error }, { status });
export const dynamic = "force-dynamic";
export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth;
  const { data: row, error } = await supabase
    .from("wedding_workspaces")
    .select("data,revision,updated_at")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (error) return fail(500, "Could not load your wedding. Please try again.");
  const data = row?.data as WorkspaceData | undefined;
  const photos: Record<string, string> = {};
  {
    const { data: rows, error: photoError } = await supabase
      .from("venue_photos")
      .select("id,storage_path")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (photoError)
      return fail(500, "Could not load your private photographs.");
    if (rows?.length) {
      const { data: signed, error: signError } = await supabase.storage
        .from(VENUE_BUCKET)
        .createSignedUrls(
          rows.map((p) => p.storage_path),
          SIGNED_URL_SECONDS,
        );
      if (signError)
        return fail(500, "Could not open your private photographs.");
      rows.forEach((p, i) => {
        if (signed?.[i]?.signedUrl) photos[p.id] = signed[i].signedUrl;
      });
    }
  }
  return NextResponse.json(
    { ok: true, data: data || null, revision: row?.revision || 0, photos },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
export async function PUT(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(req.url).host)
    return fail(403, "Cross-site request refused.");
  let body;
  try {
    const text = await req.text();
    if (text.length > 200000) return fail(413, "Your boards are too large.");
    body = JSON.parse(text);
  } catch {
    return fail(400, "Invalid request.");
  }
  let value: WorkspaceData;
  try {
    value = parseWorkspace(body.data);
  } catch (e) {
    return fail(
      400,
      e instanceof Error ? e.message : "Check your wedding details.",
    );
  }
  if (!Number.isInteger(body.revision) || body.revision < 0)
    return fail(400, "Invalid revision.");
  const { supabase, user } = auth;
  const photoIds = [
    ...new Set([
      ...value.brief.photoIds,
      ...value.boards.flatMap((b) =>
        b.pins.filter((p) => p.kind === "photo").map((p) => p.ref!),
      ),
    ]),
  ];
  const lookIds = [
    ...new Set(
      value.boards.flatMap((b) =>
        b.pins.filter((p) => p.kind === "look").map((p) => p.ref!),
      ),
    ),
  ];
  if (photoIds.length) {
    const { data, error } = await supabase
      .from("venue_photos")
      .select("id")
      .eq("owner_id", user.id)
      .in("id", photoIds);
    if (error || data?.length !== photoIds.length)
      return fail(
        400,
        "One of those photos is no longer available in your account.",
      );
  }
  if (lookIds.length) {
    const { data, error } = await supabase
      .from("renders")
      .select("id")
      .eq("owner_id", user.id)
      .eq("status", "succeeded")
      .in("id", lookIds);
    if (error || data?.length !== lookIds.length)
      return fail(
        400,
        "One of those looks is no longer available in your account.",
      );
  }
  const q =
    body.revision === 0
      ? supabase
          .from("wedding_workspaces")
          .insert({ owner_id: user.id, data: value, revision: 1 })
      : supabase
          .from("wedding_workspaces")
          .update({ data: value, revision: body.revision + 1 })
          .eq("owner_id", user.id)
          .eq("revision", body.revision);
  const { data: row, error } = await q.select("revision").maybeSingle();
  if (error?.code === "23505" || (!error && !row))
    return fail(
      409,
      "Your wedding was updated in another tab. Reload the page before making more changes.",
    );
  if (error)
    return fail(
      500,
      "Could not save your wedding. Your changes are still on this page.",
    );
  return NextResponse.json({ ok: true, revision: row!.revision });
}
