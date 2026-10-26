import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { mergeCookieName, mergeCookieOptions, verifyMergeProof, validMergeRequest } from "@/lib/server/guest-merge-proof";

import { requireUser } from "@/lib/server/session";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Source ownership must be proven while the anonymous session is still active.
// No caller-supplied source ID is accepted. Missing/legacy proof fails closed.
const fail = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: Request) {
  if (!validMergeRequest(req)) return fail(403, "Guest transfer requires a same-site account form.");
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { user } = auth;

  if (user.is_anonymous || !user.email || !user.email_confirmed_at) {
    return fail(403, "Sign in to a confirmed account before transferring guest work.");
  }
  const cookieStore = await cookies();
  const proof = verifyMergeProof(cookieStore.get(mergeCookieName)?.value, user.email);
  if (!proof) return fail(403, "Guest ownership could not be verified. Sign in from the original guest browser, preparing the transfer before login. Contact support if you have already signed in.");
  let body;
  try {
    const raw = await req.text();
    if (raw.length > 1024) return fail(400, "Invalid transfer request.");
    body = JSON.parse(raw);
  } catch { return fail(400, "Invalid transfer request."); }
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length) return fail(400, "Guest transfers do not accept a source account ID.");
  // Consume the browser proof before any privileged work, including error paths.
  cookieStore.set(mergeCookieName, "", { ...mergeCookieOptions, maxAge: 0 });
  const anonUserId = proof.anonId;
  if (anonUserId === user.id) return NextResponse.json({ ok: true, merged: false }, { headers: { "Cache-Control": "no-store" } });
  try {
    const admin = createAdminClient();

    // Re-check that the proven source still exists and is anonymous.
    const { data: src } = await checked(admin.auth.admin.getUserById(anonUserId));
    if (!src?.user?.is_anonymous) {
      return fail(409, "The proven guest account is no longer available for transfer. Contact support if work is missing.");
    }

    // ---------------------------------------------------------------- briefs + basket
    // Only migrate if the real user has no brief yet. Their existing brief takes
    // priority; the anon brief is abandoned (it keeps its rows but owner_id
    // stays anon, which will be GC'd when the anon user is eventually purged).
    const { count: briefCount } = await checked(admin
      .from("briefs")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id));

    if ((briefCount ?? 0) === 0) {
      await checked(admin.from("briefs").update({ owner_id: user.id }).eq("owner_id", anonUserId));
      // basket_lines are scoped by owner_id for RLS; the FK (brief_id) is unchanged.
      await checked(admin.from("basket_lines").update({ owner_id: user.id }).eq("owner_id", anonUserId));
    }

    // ---------------------------------------------------------------- venues + photos
    await checked(admin.from("venues").update({ owner_id: user.id }).eq("owner_id", anonUserId));
    await checked(admin.from("venue_photos").update({ owner_id: user.id }).eq("owner_id", anonUserId));

    // ---------------------------------------------------------------- renders
    await checked(admin.from("renders").update({ owner_id: user.id }).eq("owner_id", anonUserId));

    // ---------------------------------------------------------------- saved looks
    // Unique constraint: (owner_id, render_id). Delete any anon rows that clash
    // with one the real user already has, then bulk-migrate the rest.
    const { data: anonLooks } = await checked(admin
      .from("saved_looks")
      .select("render_id")
      .eq("owner_id", anonUserId));

    const { data: realLooks } = await checked(admin
      .from("saved_looks")
      .select("render_id")
      .eq("owner_id", user.id));

    const realRenderIds = new Set((realLooks ?? []).map((l) => (l as { render_id: string }).render_id));
    const clashing = (anonLooks ?? [])
      .map((l) => (l as { render_id: string }).render_id)
      .filter((id) => realRenderIds.has(id));

    if (clashing.length > 0) {
      await checked(admin.from("saved_looks").delete().eq("owner_id", anonUserId).in("render_id", clashing));
    }
    await checked(admin.from("saved_looks").update({ owner_id: user.id }).eq("owner_id", anonUserId));

    // ---------------------------------------------------------------- storage objects
    // Move files from <anonId>/... to <userId>/... and patch the stored paths.
    // venue-uploads: <userId>/incoming/<uuid>.<ext>
    await moveStorageFolder(admin, "venue-uploads", `${anonUserId}/incoming`, `${user.id}/incoming`);
    // renders: <userId>/<renderId>.jpg
    await moveStorageFolder(admin, "renders", anonUserId, user.id);

    // Patch the stored path columns to reflect the new storage location.
    const { data: photos } = await checked(admin
      .from("venue_photos")
      .select("id, storage_path")
      .eq("owner_id", user.id)
      .like("storage_path", `${anonUserId}/%`));

    for (const photo of photos ?? []) {
      await checked(admin
        .from("venue_photos")
        .update({ storage_path: (photo.storage_path as string).replace(`${anonUserId}/`, `${user.id}/`) })
        .eq("id", photo.id));
    }

    const { data: renders } = await checked(admin
      .from("renders")
      .select("id, image_path")
      .eq("owner_id", user.id)
      .not("image_path", "is", null)
      .like("image_path", `${anonUserId}/%`));

    for (const render of renders ?? []) {
      await checked(admin
        .from("renders")
        .update({ image_path: (render.image_path as string).replace(`${anonUserId}/`, `${user.id}/`) })
        .eq("id", render.id));
    }

    return NextResponse.json({ ok: true, merged: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return fail(503, "Guest transfer could not be completed. Some work may have transferred. Your account is signed in; contact support before retrying.");
  }
}

async function moveStorageFolder(
  admin: ReturnType<typeof createAdminClient>,
  bucket: string,
  fromPrefix: string,
  toPrefix: string
) {
  const { data: files } = await checked(admin.storage.from(bucket).list(fromPrefix));
  for (const file of files ?? []) {
    // Skip "folders" (entries without an id are virtual directory nodes).
    if (!file.id) continue;
    await checked(admin.storage
      .from(bucket)
      .move(`${fromPrefix}/${file.name}`, `${toPrefix}/${file.name}`));
  }
}

async function checked<T extends { error?: unknown }>(operation: PromiseLike<T>): Promise<T> {
  const result = await operation;
  if (result.error) throw result.error;
  return result;
}
