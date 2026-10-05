// Loads lib/catalogue.ts (seed data) into the database: suppliers, then products.
//
//   npm run seed:catalogue
//
// Safe to re-run: rows are upserted by id (products) and name (suppliers). It
// never deletes anything. It refreshes names, prices, photos and so on for rows
// that share an id with the seed file, but it deliberately leaves `capacity` and
// `active` alone on existing products, because staff manage those in /admin.
// New products get a placeholder capacity (see defaultCapacity). Stop re-seeding
// once suppliers manage their own products.
//
// Needs Node 22.18+ (imports the TypeScript seed file directly) and
// NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local.

import { createClient } from "@supabase/supabase-js";
import { CATALOGUE } from "../lib/catalogue.ts";

try {
  process.loadEnvFile(new URL("../.env.local", import.meta.url));
} catch {
  // fall back to variables already in the environment
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (.env.local).");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

// 1. Suppliers (name is unique; each supplier has one area).
const suppliers = new Map();
for (const item of CATALOGUE) {
  const prev = suppliers.get(item.supplier);
  if (prev && prev !== item.supplierArea) {
    console.error(`Supplier "${item.supplier}" has two areas: "${prev}" and "${item.supplierArea}".`);
    process.exit(1);
  }
  suppliers.set(item.supplier, item.supplierArea);
}
const { data: supplierRows, error: supplierError } = await db
  .from("suppliers")
  .upsert([...suppliers].map(([name, area]) => ({ name, area })), { onConflict: "name" })
  .select("id, name");
if (supplierError) throw supplierError;
const supplierId = new Map(supplierRows.map((s) => [s.name, s.id]));

// Placeholder stock for NEW products only: units a supplier can provide per day.
// Made-to-order items aren't limited by stock. Staff replace these with real numbers.
function defaultCapacity(i) {
  if (i.stock === "made_to_order") return null;
  const low = i.stock === "low_stock";
  switch (i.qtyRule) {
    case "per_guest":
      return low ? 120 : 600;
    case "per_table":
      return low ? 12 : 40;
    default:
      return low ? 1 : 2;
  }
}

// 2. Products, in shop order.
const products = CATALOGUE.map((i, index) => ({
  id: i.id,
  supplier_id: supplierId.get(i.supplier),
  name: i.name,
  category: i.category,
  slot: i.slot ?? null,
  unit_price_pence: Math.round(i.unitPrice * 100),
  unit: i.unit,
  qty_rule: i.qtyRule,
  styles: i.styles,
  image: i.image ?? null,
  rating: i.rating,
  review_count: i.reviewCount,
  lead_time_days: i.leadTimeDays,
  stock: i.stock,
  note: i.note ?? null,
  icon: i.icon,
  swatch: i.swatch,
  sort_order: index,
}));

const { data: existing, error: existingError } = await db.from("products").select("id");
if (existingError) throw existingError;
const have = new Set(existing.map((r) => r.id));
const fresh = products.filter((p) => !have.has(p.id)).map((p, _, __) => ({
  ...p,
  active: true,
  capacity: defaultCapacity(CATALOGUE.find((i) => i.id === p.id)),
}));
const known = products.filter((p) => have.has(p.id));
if (fresh.length) {
  const { error } = await db.from("products").insert(fresh);
  if (error) throw error;
}
if (known.length) {
  const { error } = await db.from("products").upsert(known, { onConflict: "id" });
  if (error) throw error;
}
console.log(`${fresh.length} new products, ${known.length} refreshed (capacity and active left as staff set them).`);

// 3. Read back and compare, so a silent mismatch can't slip through.
const { data: back, error: readError } = await db.from("products").select("*").in("id", products.map((p) => p.id));
if (readError) throw readError;
const byId = new Map(back.map((r) => [r.id, r]));
let mismatches = 0;
for (const p of products) {
  const r = byId.get(p.id);
  for (const [k, v] of Object.entries(p)) {
    const got = r?.[k];
    const same = Array.isArray(v) ? JSON.stringify(v) === JSON.stringify(got) : String(v) === String(got);
    if (!same) {
      mismatches++;
      console.error(`Mismatch ${p.id}.${k}: seed=${JSON.stringify(v)} db=${JSON.stringify(got)}`);
    }
  }
}
if (mismatches) {
  console.error(`${mismatches} mismatches.`);
  process.exit(1);
}
console.log(`Seeded ${suppliers.size} suppliers and ${products.length} products; read-back matches the seed file.`);
