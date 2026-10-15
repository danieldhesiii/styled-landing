import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/session";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/session/merge
//
// Transfers an anonymous user's data into the caller's real account. Called
// after signInWithPassword when the browser had an active anonymous session
// that may have accumulated a brief, basket, renders or saved looks.
//
// Body: { anonUserId: string }
//
// Idempotent: safe to call more than once for the same pair (all updates are
// owner_id=X → owner_id=Y, so a second call finds no rows to move).

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { user } = auth;

  if (user.is_anonymous) {
    return NextResponse.json({ ok: false, error: "Must be signed in to a real account." }, { status: 400 });
  }

  let anonUserId: string | undefined;
  try {
    ({ anonUserId } = await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  }

  if (!anonUserId || !UUID.test(anonUserId)) {
    return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  }

  // Same ID — nothing to do (upgrade path kept the same UUID).
  if (anonUserId === user.id) {
    return NextResponse.json({ ok: true, merged: false });
  }

  const admin = createAdminClient();

  // Confirm the source user exists and IS anonymous. If not, silently succeed:
  // either already merged on a previous call, or the ID was never anon.
  const { data: src } = await admin.auth.admin.getUserById(anonUserId);
  if (!src?.user?.is_anonymous) {
    return NextResponse.json({ ok: true, merged: false });
  }

  // ---------------------------------------------------------------- briefs + basket
  // Only migrate if the real user has no brief yet. Their existing brief takes
  // priority; the anon brief is abandoned (it keeps its rows but owner_id
  // stays anon, which will be GC'd when the anon user is eventually purged).
  const { count: briefCount } = await admin
    .from("briefs")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id);

  if ((briefCount ?? 0) === 0) {
    await admin.from("briefs").update({ owner_id: user.id }).eq("owner_id", anonUserId);
    // basket_lines are scoped by owner_id for RLS; the FK (brief_id) is unchanged.
    await admin.from("basket_lines").update({ owner_id: user.id }).eq("owner_id", anonUserId);
  }

  // ---------------------------------------------------------------- venues + photos
  await admin.from("venues").update({ owner_id: user.id }).eq("owner_id", anonUserId);
  await admin.from("venue_photos").update({ owner_id: user.id }).eq("owner_id", anonUserId);

  // ---------------------------------------------------------------- renders
  await admin.from("renders").update({ owner_id: user.id }).eq("owner_id", anonUserId);

  // ---------------------------------------------------------------- saved looks
  // Unique constraint: (owner_id, render_id). Delete any anon rows that clash
  // with one the real user already has, then bulk-migrate the rest.
  const { data: anonLooks } = await admin
    .from("saved_looks")
    .select("render_id")
    .eq("owner_id", anonUserId);

  const { data: realLooks } = await admin
    .from("saved_looks")
    .select("render_id")
    .eq("owner_id", user.id);

  const realRenderIds = new Set((realLooks ?? []).map((l) => (l as { render_id: string }).render_id));
  const clashing = (anonLooks ?? [])
    .map((l) => (l as { render_id: string }).render_id)
    .filter((id) => realRenderIds.has(id));

  if (clashing.length > 0) {
    await admin.from("saved_looks").delete().eq("owner_id", anonUserId).in("render_id", clashing);
  }
  await admin.from("saved_looks").update({ owner_id: user.id }).eq("owner_id", anonUserId);

  // ---------------------------------------------------------------- storage objects
  // Move files from <anonId>/... to <userId>/... and patch the stored paths.
  // venue-uploads: <userId>/incoming/<uuid>.<ext>
  await moveStorageFolder(admin, "venue-uploads", `${anonUserId}/incoming`, `${user.id}/incoming`);
  // renders: <userId>/<renderId>.jpg
  await moveStorageFolder(admin, "renders", anonUserId, user.id);

  // Patch the stored path columns to reflect the new storage location.
  const { data: photos } = await admin
    .from("venue_photos")
    .select("id, storage_path")
    .eq("owner_id", user.id)
    .like("storage_path", `${anonUserId}/%`);

  for (const photo of photos ?? []) {
    await admin
      .from("venue_photos")
      .update({ storage_path: (photo.storage_path as string).replace(`${anonUserId}/`, `${user.id}/`) })
      .eq("id", photo.id);
  }

  const { data: renders } = await admin
    .from("renders")
    .select("id, image_path")
    .eq("owner_id", user.id)
    .not("image_path", "is", null)
    .like("image_path", `${anonUserId}/%`);

  for (const render of renders ?? []) {
    await admin
      .from("renders")
      .update({ image_path: (render.image_path as string).replace(`${anonUserId}/`, `${user.id}/`) })
      .eq("id", render.id);
  }

  return NextResponse.json({ ok: true, merged: true });
}

async function moveStorageFolder(
  admin: ReturnType<typeof createAdminClient>,
  bucket: string,
  fromPrefix: string,
  toPrefix: string
) {
  const { data: files } = await admin.storage.from(bucket).list(fromPrefix);
  for (const file of files ?? []) {
    // Skip "folders" (entries without an id are virtual directory nodes).
    if (!file.id) continue;
    await admin.storage
      .from(bucket)
      .move(`${fromPrefix}/${file.name}`, `${toPrefix}/${file.name}`);
  }
}
