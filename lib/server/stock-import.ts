import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseStockCsv, inferQtyRule, nameKey, type ImportRow } from "@/lib/stock-import";
import { CATEGORY_META } from "@/lib/categories";
import { todayUtc } from "@/lib/availability";

// Plan and apply a supplier's stock list.
//
//   planStockImport  reads the file and works out, row by row, what WOULD happen:
//                    create, update (with the exact changes), unchanged, or an
//                    error. Writes nothing. This is the preview.
//   applyStockImport re-plans from the same file (so it can't act on stale
//                    information) and writes every valid row in one transaction.
//
// Rules that keep a bulk upload safe:
//  - It never deletes. A product missing from the file is only reported.
//  - A field the file doesn't mention is left exactly as it is.
//  - Rows that are wrong are skipped and reported; they never half-apply.
//  - A supplier's own upload can only ever touch that supplier's products.
//  - New products from a supplier start hidden until Styled reviews them.

export type PlanAction = "create" | "update" | "unchanged" | "error";

export interface PlanChange {
  field: string;
  from: unknown;
  to: unknown;
}

export interface PlanRow {
  line: number;
  name: string;
  action: PlanAction;
  id?: string;
  changes: PlanChange[];
  errors: string[];
  warnings: string[];
  // What gets written (create/update only).
  payload?: Record<string, unknown>;
}

export interface ImportPlan {
  rows: PlanRow[];
  counts: { create: number; update: number; unchanged: number; error: number };
  ignoredColumns: string[];
  fileErrors: string[];
  // Products this supplier already has that aren't in the file (left untouched).
  missing: { id: string; name: string }[];
  newProductsStartHidden: boolean;
}

type Mode = "staff" | "vendor";

interface ExistingProduct {
  id: string;
  name: string;
  category: string;
  slot: string | null;
  unit_price_pence: number;
  unit: string;
  qty_rule: string;
  capacity: number | null;
  lead_time_days: number | null;
  styles: string[] | null;
  image: string | null;
  note: string | null;
  active: boolean;
}

const SLOT_BY_CATEGORY: Record<string, string> = {
  backdrops: "ceremony_backdrop",
  florals: "florals",
  centrepieces: "centrepieces",
  furniture: "chairs",
  linen_tableware: "tables_linen",
  lighting: "lighting",
  signage: "signage",
  bar: "bar",
};

const LIVE = ["requested", "confirmed", "deposit_paid"];

function makeId(name: string, taken: Set<string>): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "product";
  for (let i = 0; i < 20; i++) {
    const id = `${slug}-${randomBytes(3).toString("hex")}`;
    if (!taken.has(id)) {
      taken.add(id);
      return id;
    }
  }
  const id = `${slug}-${randomBytes(6).toString("hex")}`;
  taken.add(id);
  return id;
}

const sameSet = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join("|") === [...b].sort().join("|");

export async function planStockImport(opts: {
  admin: SupabaseClient;
  supplierId: string;
  csv: string;
  mode: Mode;
}): Promise<ImportPlan> {
  const { admin, supplierId, mode } = opts;
  const parsed = parseStockCsv(opts.csv);
  const empty: ImportPlan = {
    rows: [],
    counts: { create: 0, update: 0, unchanged: 0, error: 0 },
    ignoredColumns: parsed.ignoredColumns,
    fileErrors: parsed.fileErrors,
    missing: [],
    newProductsStartHidden: mode === "vendor",
  };
  if (parsed.fileErrors.length > 0) return empty;

  const { data: existing, error } = await admin
    .from("products")
    .select("id, name, category, slot, unit_price_pence, unit, qty_rule, capacity, lead_time_days, styles, image, note, active")
    .eq("supplier_id", supplierId);
  if (error) throw new Error(`Couldn't load this supplier's products: ${error.message}`);
  const products = (existing ?? []) as ExistingProduct[];
  const byId = new Map(products.map((p) => [p.id, p]));
  const byName = new Map<string, ExistingProduct[]>();
  for (const p of products) byName.set(nameKey(p.name), [...(byName.get(nameKey(p.name)) ?? []), p]);

  // Ids already used anywhere (a new id must be unique across all suppliers).
  const { data: allIds } = await admin.from("products").select("id");
  const takenIds = new Set((allIds ?? []).map((r) => r.id as string));

  // Units already booked on upcoming dates, to warn when stock is cut below them.
  const peakBooked = new Map<string, { day: string; units: number }>();
  if (products.length > 0) {
    const { data: lines } = await admin
      .from("order_lines")
      .select("product_id, quantity, orders!inner(wedding_date, status)")
      .in("product_id", products.map((p) => p.id))
      .neq("supplier_status", "declined")
      .gte("orders.wedding_date", todayUtc())
      .in("orders.status", LIVE);
    const perDay = new Map<string, number>();
    for (const l of lines ?? []) {
      const o = l.orders as unknown as { wedding_date: string };
      const key = `${l.product_id}|${o.wedding_date}`;
      perDay.set(key, (perDay.get(key) ?? 0) + (l.quantity as number));
    }
    for (const [key, units] of perDay) {
      const [pid, day] = key.split("|");
      const cur = peakBooked.get(pid);
      if (!cur || units > cur.units) peakBooked.set(pid, { day, units });
    }
  }

  const claimed = new Set<string>(); // existing products already matched by an earlier row
  const seenNewNames = new Set<string>();
  const rows: PlanRow[] = [];

  for (const r of parsed.rows) {
    const errors = [...r.errors];
    const warnings = [...r.warnings];
    // A row given by id alone shows the product's real name in the preview.
    const displayName = r.name || (r.id ? (byId.get(r.id)?.name ?? r.id) : "");
    const base = { line: r.line, name: displayName, changes: [] as PlanChange[], errors, warnings };

    if (errors.length) {
      rows.push({ ...base, action: "error" });
      continue;
    }

    // Which existing product, if any, is this row about?
    let match: ExistingProduct | undefined;
    if (r.id) {
      match = byId.get(r.id);
      if (!match) {
        rows.push({ ...base, action: "error", errors: [`The id “${r.id}” isn't one of your products.`] });
        continue;
      }
    } else {
      const candidates = byName.get(r.nameKey) ?? [];
      if (candidates.length > 1) {
        rows.push({ ...base, action: "error", errors: ["More than one of your products has this name. Add an id column to say which."] });
        continue;
      }
      match = candidates[0];
    }

    if (match) {
      if (r.id && r.name && nameKey(match.name) !== r.nameKey) {
        warnings.push(`The name in the file (“${r.name}”) differs from “${match.name}”. Importing doesn't rename products.`);
      }
      if (claimed.has(match.id)) {
        rows.push({ ...base, id: match.id, action: "error", errors: ["This product appears more than once in the file."] });
        continue;
      }
      claimed.add(match.id);

      // Changes: only fields the file actually gave, and only where they differ.
      const f = r.fields;
      const changes: PlanChange[] = [];
      const payload: Record<string, unknown> = { action: "update", id: match.id };
      const set = (field: string, key: string, from: unknown, to: unknown) => {
        changes.push({ field, from, to });
        payload[key] = to;
      };
      if (f.category !== undefined && f.category !== match.category) {
        set("category", "category", match.category, f.category);
        payload.slot = SLOT_BY_CATEGORY[f.category] ?? null; // keep the render position in step
      }
      if (f.unit_price_pence !== undefined && f.unit_price_pence !== match.unit_price_pence) set("price", "unit_price_pence", match.unit_price_pence, f.unit_price_pence);
      if (f.unit !== undefined && f.unit !== match.unit) set("unit", "unit", match.unit, f.unit);
      if (f.qty_rule !== undefined && f.qty_rule !== match.qty_rule) set("quantity_rule", "qty_rule", match.qty_rule, f.qty_rule);
      if (f.capacity !== undefined && f.capacity !== match.capacity) set("capacity", "capacity", match.capacity, f.capacity);
      if (f.lead_time_days !== undefined && f.lead_time_days !== (match.lead_time_days ?? 0)) set("lead_time_days", "lead_time_days", match.lead_time_days ?? 0, f.lead_time_days);
      if (f.styles !== undefined && !sameSet(f.styles, match.styles ?? [])) set("styles", "styles", match.styles ?? [], f.styles);
      if (f.image !== undefined && (f.image ?? null) !== (match.image ?? null)) set("image", "image", match.image, f.image);
      if (f.note !== undefined && (f.note ?? null) !== (match.note ?? null)) set("note", "note", match.note, f.note);
      if (f.active !== undefined && f.active !== match.active) set("active", "active", match.active, f.active);

      // Risky changes get a warning but are still allowed: the supplier knows
      // their own stock and prices.
      if (f.capacity !== undefined && f.capacity !== null) {
        const peak = peakBooked.get(match.id);
        if (peak && f.capacity < peak.units) {
          warnings.push(`Capacity ${f.capacity} is below the ${peak.units} already booked on ${peak.day}.`);
        }
      }
      if (f.unit_price_pence !== undefined && match.unit_price_pence > 0) {
        const ratio = f.unit_price_pence / match.unit_price_pence;
        if (ratio > 3 || ratio < 1 / 3) warnings.push("This is a big price change. Check it's right.");
      }

      rows.push({
        ...base,
        id: match.id,
        action: changes.length ? "update" : "unchanged",
        changes,
        warnings,
        ...(changes.length ? { payload } : {}),
      });
      continue;
    }

    // A new product.
    if (r.name.length < 2) {
      rows.push({ ...base, action: "error", errors: ["Product name is missing."] });
      continue;
    }
    if (seenNewNames.has(r.nameKey)) {
      rows.push({ ...base, action: "error", errors: ["This new product appears more than once in the file."] });
      continue;
    }
    seenNewNames.add(r.nameKey);

    const f = r.fields;
    const missing: string[] = [];
    if (!f.category) missing.push("a category");
    if (f.unit_price_pence === undefined) missing.push("a price");
    if (missing.length) {
      rows.push({ ...base, action: "error", errors: [`This is a new product, so it needs ${missing.join(" and ")}.`] });
      continue;
    }

    const unit = f.unit ?? "each";
    const category = f.category!;
    const icon = CATEGORY_META.find((c) => c.category === category)?.icon ?? "";
    const forcedHidden = mode === "vendor";
    if (forcedHidden) warnings.push("New products start hidden until Styled has reviewed them.");
    if (f.capacity === undefined) warnings.push("No capacity given, so this is treated as made to order (no stock limit).");

    const id = makeId(r.name, takenIds);
    const payload = {
      action: "create",
      id,
      name: r.name,
      category,
      slot: SLOT_BY_CATEGORY[category] ?? null,
      unit_price_pence: f.unit_price_pence!,
      unit,
      qty_rule: f.qty_rule ?? inferQtyRule(unit),
      styles: f.styles ?? [],
      image: f.image ?? null,
      icon,
      swatch: "#cccccc",
      lead_time_days: f.lead_time_days ?? 0,
      capacity: f.capacity ?? null,
      note: f.note ?? null,
      active: forcedHidden ? false : (f.active ?? true),
    };
    rows.push({
      ...base,
      id,
      action: "create",
      warnings,
      changes: [
        { field: "price", from: null, to: payload.unit_price_pence },
        { field: "category", from: null, to: category },
        { field: "capacity", from: null, to: payload.capacity },
      ],
      payload,
    });
  }

  const counts = { create: 0, update: 0, unchanged: 0, error: 0 };
  for (const r of rows) counts[r.action]++;

  return {
    rows,
    counts,
    ignoredColumns: parsed.ignoredColumns,
    fileErrors: [],
    missing: products.filter((p) => !claimed.has(p.id)).map((p) => ({ id: p.id, name: p.name })),
    newProductsStartHidden: mode === "vendor",
  };
}

export async function applyStockImport(opts: {
  admin: SupabaseClient;
  supplierId: string;
  csv: string;
  mode: Mode;
  actor: { id: string; label: string };
  filename?: string | null;
}): Promise<{ plan: ImportPlan; result: { importId: string; created: number; updated: number; unchanged: number } | null }> {
  // Plan again from the file itself, so what's written is exactly what was just
  // validated, whatever changed since the preview.
  const plan = await planStockImport(opts);
  const writable = plan.rows.filter((r) => r.action === "create" || r.action === "update");
  if (plan.fileErrors.length > 0 || (writable.length === 0 && plan.counts.error === 0)) {
    return { plan, result: null };
  }
  if (writable.length === 0) return { plan, result: null };

  const { data, error } = await opts.admin.rpc("apply_stock_import", {
    p_supplier: opts.supplierId,
    p_rows: writable.map((r) => r.payload),
    p_actor: opts.actor.id,
    p_actor_label: opts.actor.label,
    p_filename: opts.filename ? opts.filename.slice(0, 200) : null,
    p_source: opts.mode,
    p_skipped: plan.counts.error,
  });
  if (error) throw new Error(`Couldn't apply the stock list: ${error.message}`);
  return { plan, result: data as { importId: string; created: number; updated: number; unchanged: number } };
}
