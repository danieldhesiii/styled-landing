import type { SupabaseClient } from "@supabase/supabase-js";
import { STYLES } from "@/lib/styles";
import type { Failure } from "@/lib/server/quote";
import type { ServerCatalogueItem } from "@/lib/server/catalogue";

// Validation and presentation for orders.

export interface OrderFields {
  coupleName: string;
  email: string;
  phone: string | null;
  weddingDate: string | null; // YYYY-MM-DD
  venueLabel: string | null;
  styleId: string | null;
  guestCount: number | null;
  notes: string | null;
  idempotencyKey: string | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[0-9+()\-\s]{6,30}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

const clean = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const s = v.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
  return s ? s.slice(0, max) : null;
};

const bad = (error: string): Failure => ({ ok: false, status: 400, error });

export function validateOrderFields(body: Record<string, unknown>): { ok: true; fields: OrderFields } | Failure {
  const coupleName = clean(body.coupleName, 120);
  if (!coupleName) return bad("Please tell us your names.");

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email || email.length > 254 || !EMAIL.test(email)) return bad("Please enter a valid email address.");

  let phone: string | null = null;
  if (body.phone !== undefined && body.phone !== null && body.phone !== "") {
    if (typeof body.phone !== "string" || !PHONE.test(body.phone.trim())) return bad("Please enter a valid phone number.");
    phone = body.phone.trim();
  }

  let weddingDate: string | null = null;
  if (body.weddingDate !== undefined && body.weddingDate !== null && body.weddingDate !== "") {
    const d = typeof body.weddingDate === "string" ? body.weddingDate : "";
    const parsed = /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T00:00:00Z`) : null;
    if (!parsed || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== d) {
      return bad("Please enter a valid wedding date.");
    }
    const today = Date.parse(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
    if (parsed.getTime() < today) return bad("Your wedding date is in the past.");
    if (parsed.getTime() > today + 5 * 365 * DAY_MS) return bad("Your wedding date is too far ahead.");
    weddingDate = d;
  }

  let styleId: string | null = null;
  if (body.styleId !== undefined && body.styleId !== null && body.styleId !== "") {
    if (typeof body.styleId !== "string" || !STYLES.some((s) => s.id === body.styleId)) return bad("Unknown style.");
    styleId = body.styleId;
  }

  let guestCount: number | null = null;
  if (body.guestCount !== undefined && body.guestCount !== null) {
    if (typeof body.guestCount !== "number" || !Number.isInteger(body.guestCount) || body.guestCount < 1 || body.guestCount > 1000) {
      return bad("Guest count must be a whole number from 1 to 1000.");
    }
    guestCount = body.guestCount;
  }

  let idempotencyKey: string | null = null;
  if (body.idempotencyKey !== undefined && body.idempotencyKey !== null) {
    if (typeof body.idempotencyKey !== "string" || !UUID.test(body.idempotencyKey)) return bad("Invalid request key.");
    idempotencyKey = body.idempotencyKey.toLowerCase();
  }

  return {
    ok: true,
    fields: {
      coupleName,
      email,
      phone,
      weddingDate,
      venueLabel: clean(body.venueLabel, 200),
      styleId,
      guestCount,
      notes: clean(body.notes, 1000),
      idempotencyKey,
    },
  };
}

// A valid delivery date: a real YYYY-MM-DD, not in the past, within five years.
// (A delivery can be before or after the wedding — setup earlier, collection
// later — so it isn't tied to the wedding date, only to being a sane future day.)
export function isValidDeliveryDate(d: unknown): d is string {
  if (typeof d !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  const parsed = new Date(`${d}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== d) return false;
  const today = Date.parse(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
  return parsed.getTime() >= today && parsed.getTime() <= today + 5 * 365 * DAY_MS;
}

// Items whose supplier needs more notice than the couple has left. Lead time is
// the number of days ahead an item must be booked.
export function itemsBookedTooLate(
  weddingDate: string | null,
  items: ServerCatalogueItem[]
): { itemId: string; name: string; leadTimeDays: number }[] {
  if (!weddingDate) return [];
  const today = Date.parse(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
  const daysAway = Math.round((Date.parse(`${weddingDate}T00:00:00Z`) - today) / DAY_MS);
  return items
    .filter((i) => i.leadTimeDays > daysAway)
    .map((i) => ({ itemId: i.id, name: i.name, leadTimeDays: i.leadTimeDays }));
}

export const orderReference = (id: string) => `STY-${id.slice(0, 8).toUpperCase()}`;

interface OrderRow {
  id: string;
  reference: string | null;
  couple_message: string | null;
  updated_at: string;
  status: string;
  created_at: string;
  couple_name: string;
  email: string;
  phone: string | null;
  wedding_date: string | null;
  venue_label: string | null;
  style_id: string | null;
  guest_count: number | null;
  subtotal_pence: number;
  deposit_pence: number;
  notes: string | null;
}
interface LineRow {
  product_id: string | null;
  product_name: string;
  supplier_name: string;
  unit: string | null;
  quantity: number;
  unit_price_pence: number;
  line_total_pence: number;
  supplier_status: string;
  needed_date: string | null;
}

// What a couple sees of an order. Never includes commission, network hash or
// the idempotency key.
export function orderView(o: OrderRow, lines: LineRow[]) {
  // Per supplier: their total and their delivery date (all a supplier's lines
  // share one date). Falls back to the wedding date when none was set.
  const bySupplier = new Map<string, { totalPence: number; neededDate: string | null }>();
  for (const l of lines) {
    const g = bySupplier.get(l.supplier_name) ?? { totalPence: 0, neededDate: l.needed_date ?? o.wedding_date };
    g.totalPence += l.line_total_pence;
    bySupplier.set(l.supplier_name, g);
  }

  return {
    id: o.id,
    reference: o.reference ?? orderReference(o.id),
    status: o.status,
    coupleMessage: o.couple_message,
    createdAt: o.created_at,
    updatedAt: o.updated_at,
    coupleName: o.couple_name,
    email: o.email,
    phone: o.phone,
    weddingDate: o.wedding_date,
    venueLabel: o.venue_label,
    styleId: o.style_id,
    guestCount: o.guest_count,
    notes: o.notes,
    subtotalPence: o.subtotal_pence,
    depositPence: o.deposit_pence,
    balancePence: o.subtotal_pence - o.deposit_pence,
    bySupplier: [...bySupplier].map(([supplier, g]) => ({ supplier, totalPence: g.totalPence, neededDate: g.neededDate })),
    lines: lines.map((l) => ({
      productId: l.product_id,
      name: l.product_name,
      supplier: l.supplier_name,
      unit: l.unit,
      quantity: l.quantity,
      unitPricePence: l.unit_price_pence,
      lineTotalPence: l.line_total_pence,
      supplierStatus: l.supplier_status,
      neededDate: l.needed_date ?? o.wedding_date,
    })),
  };
}

export const ORDER_VIEW_COLUMNS =
  "id, reference, couple_message, updated_at, status, created_at, couple_name, email, phone, wedding_date, venue_label, style_id, guest_count, subtotal_pence, deposit_pence, notes";
export const LINE_VIEW_COLUMNS =
  "product_id, product_name, supplier_name, unit, quantity, unit_price_pence, line_total_pence, supplier_status, needed_date";

// Load an order and its lines as the signed-in guest (row level security makes
// other people's orders invisible).
export async function loadOrderView(supabase: SupabaseClient, id: string) {
  const { data: order } = await supabase.from("orders").select(ORDER_VIEW_COLUMNS).eq("id", id).maybeSingle();
  if (!order) return null;
  const { data: lines } = await supabase.from("order_lines").select(LINE_VIEW_COLUMNS).eq("order_id", id).order("created_at");
  return orderView(order as OrderRow, (lines ?? []) as LineRow[]);
}
