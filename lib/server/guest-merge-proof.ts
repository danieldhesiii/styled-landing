import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/server/env";

const TTL_SECONDS = 300;
const production = process.env.NODE_ENV === "production";
export const mergeCookieName = production ? "__Host-styled-guest-merge" : "styled-guest-merge";
export const mergeCookieOptions = {
  httpOnly: true,
  secure: production,
  sameSite: "strict" as const,
  path: production ? "/" : "/api/session",
  maxAge: TTL_SECONDS,
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
interface Proof { v: 1; anonId: string; email: string; issued: number; expires: number; nonce: string; }
// A domain-separated HMAC key stays server-only. An explicit secret can be rotated
// independently; otherwise the existing service-role secret provides signing material.
function sign(payload: string) {
  const secret = process.env.SESSION_MERGE_SECRET || env.supabaseServiceRoleKey;
  if (secret.length < 32) throw Error("Guest merge signing secret is too short");
  return createHmac("sha256", secret).update(`styled:guest-merge:v1:${payload}`).digest();
}
export function issueMergeProof(anonId: string, email: string, now = Date.now()): string {
  if (!uuid.test(anonId) || !email) throw Error("Invalid proof input");
  const issued = Math.floor(now / 1000);
  const proof: Proof = { v: 1, anonId, email: email.trim().toLowerCase(), issued, expires: issued + TTL_SECONDS, nonce: randomUUID() };
  const payload = Buffer.from(JSON.stringify(proof)).toString("base64url");
  return `${payload}.${sign(payload).toString("base64url")}`;
}
export function verifyMergeProof(token: string | undefined, email: string, now = Date.now()): Proof | null {
  if (!token || token.length > 2048) return null;
  const parts = token.split(".");
  if (parts.length !== 2 || parts.some(p => !/^[A-Za-z0-9_-]+$/.test(p))) return null;
  try {
    const actual = Buffer.from(parts[1], "base64url"), expected = sign(parts[0]);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const proof: Proof = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    const seconds = Math.floor(now / 1000);
    if (proof.v !== 1 || !uuid.test(proof.anonId) || !uuid.test(proof.nonce) ||
      !Number.isInteger(proof.issued) || !Number.isInteger(proof.expires) ||
      proof.issued > seconds || proof.expires <= seconds ||
      proof.expires - proof.issued !== TTL_SECONDS || proof.email !== email.trim().toLowerCase()) return null;
    return proof;
  } catch { return null; }
}
/** Browser-only, same-origin JSON writes. Missing Origin fails closed for legacy clients. */
export function validMergeRequest(req: Request): boolean {
  try {
    const origin = req.headers.get("origin");
    if (!origin) return false;
    const parsed = new URL(origin);
    const host = req.headers.get("host") || new URL(req.url).host;
    return ["http:", "https:"].includes(parsed.protocol) && parsed.host === host &&
      parsed.origin === origin &&
      req.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() === "application/json";
  } catch { return false; }
}
