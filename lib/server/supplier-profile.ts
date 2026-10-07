// Shared parse/validate for a supplier's optional profile fields (logo and
// commission). Used by both the create and edit routes so the rules can't drift.
// Pass a field as undefined to leave it unchanged (for PATCH).

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export function parseProfile(body: { logoUrl?: unknown; commissionRate?: unknown }):
  | { ok: true; logoUrl?: string | null; commissionRate?: number | null }
  | { ok: false; error: string } {
  const out: { logoUrl?: string | null; commissionRate?: number | null } = {};

  if (body.logoUrl !== undefined) {
    const logo = str(body.logoUrl);
    if (logo.length > 300) return { ok: false, error: "That logo URL is too long." };
    out.logoUrl = logo || null;
  }

  if (body.commissionRate !== undefined) {
    const raw = body.commissionRate;
    if (raw === null || str(raw) === "") {
      out.commissionRate = null; // clear → use the platform default
    } else {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0 || n > 100) return { ok: false, error: "Commission must be a percentage from 0 to 100." };
      out.commissionRate = Math.round(n * 100) / 100; // keep to 2 decimals
    }
  }

  return { ok: true, ...out };
}
