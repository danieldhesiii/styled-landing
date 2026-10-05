import { createHmac } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/server/env";
import { STALE_RENDER_MINUTES } from "@/lib/server/render-errors";

// Spend and abuse controls for the (paid) render endpoint.
//
//   - one render at a time per guest
//   - a daily cap per guest
//   - a daily cap per network (hashed IP), because guest sessions are free to create
//   - a daily cap across the whole site, as a hard ceiling on spend
//
// Counts are of renders that didn't fail, over the last 24 hours.

// Hash of the caller's IP, so networks can be rate limited without storing
// addresses. Behind Vercel the first x-forwarded-for entry is the real client.
export function clientIpHash(req: Request): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  return createHmac("sha256", env.supabaseServiceRoleKey).update(ip).digest("hex").slice(0, 32);
}

export interface LimitFailure {
  status: number;
  error: string;
}

export async function checkRenderLimits(opts: {
  supabase: SupabaseClient; // as the guest (RLS-scoped)
  admin: SupabaseClient; // service role, for network-wide counts
  userId: string;
  ipHash: string;
}): Promise<LimitFailure | null> {
  const { supabase, admin, userId, ipHash } = opts;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Fail renders that have been "running" too long (crashed or killed jobs), so
  // they never block the guest or the one-in-flight rule.
  await admin
    .from("renders")
    .update({ status: "failed", error_kind: "timeout", error: "Timed out", completed_at: new Date().toISOString() })
    .eq("owner_id", userId)
    .in("status", ["queued", "running"])
    .lt("created_at", new Date(Date.now() - STALE_RENDER_MINUTES * 60 * 1000).toISOString());

  const { count: inFlight } = await supabase
    .from("renders")
    .select("id", { count: "exact", head: true })
    .in("status", ["queued", "running"]);
  if ((inFlight ?? 0) > 0) {
    return { status: 409, error: "Your last render is still being created. Hang on a moment." };
  }

  const { count: mine } = await supabase
    .from("renders")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since)
    .neq("status", "failed");
  if ((mine ?? 0) >= env.maxRendersPerDay) {
    return { status: 429, error: "You've reached today's render limit. Please try again tomorrow." };
  }

  const { count: network } = await admin
    .from("renders")
    .select("id", { count: "exact", head: true })
    .eq("client_ip_hash", ipHash)
    .gte("created_at", since)
    .neq("status", "failed");
  if ((network ?? 0) >= env.maxRendersPerIpPerDay) {
    return { status: 429, error: "There have been a lot of renders from your network today. Please try again tomorrow." };
  }

  const { count: everyone } = await admin
    .from("renders")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since)
    .neq("status", "failed");
  if ((everyone ?? 0) >= env.maxRendersGlobalPerDay) {
    return { status: 503, error: "We're at capacity for today. Please try again tomorrow." };
  }

  return null;
}
