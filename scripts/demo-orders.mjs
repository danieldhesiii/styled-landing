// Fill the staff area with realistic demo orders, or take them away again.
//
//   npm run demo:orders           add 8 demo orders in different states
//   npm run demo:orders:remove    delete every demo order and demo account
//
// Orders go through the real order API (so prices, lines and history are exactly
// what a real order produces), then a temporary staff account plays a stylist
// to leave them waiting, part-confirmed, confirmed, declined or cancelled.
// Everything is tagged with an @demo.styled.test email, which is how removal
// finds it. The dev server must be running (APP_URL, default http://localhost:3000)
// and the real Supabase project in .env.local is what gets the rows.

import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { CATALOGUE } from "../lib/catalogue.ts";
import { suggestedQty } from "../lib/quote.ts";

try {
  process.loadEnvFile(new URL("../.env.local", import.meta.url));
} catch {
  // use the existing environment
}

const APP = process.env.APP_URL || "http://localhost:3000";
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !ANON || !SERVICE) {
  console.error("Missing Supabase settings in .env.local.");
  process.exit(1);
}
const DOMAIN = "@demo.styled.test";
const REF = new globalThis.URL(URL_).hostname.split(".")[0];
const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } });

async function allDemoUsers() {
  const out = [];
  for (let page = 1; page < 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    out.push(...data.users.filter((u) => u.email?.endsWith(DOMAIN)));
    if (data.users.length < 200) break;
  }
  return out;
}

async function remove() {
  const { data: orders } = await admin.from("orders").select("id").like("email", `%${DOMAIN}`);
  const ids = (orders ?? []).map((o) => o.id);
  if (ids.length) await admin.from("orders").delete().in("id", ids);
  const users = await allDemoUsers();
  for (const u of users) await admin.auth.admin.deleteUser(u.id);
  console.log(`Removed ${ids.length} demo orders and ${users.length} demo accounts.`);
}

const day = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const cookieFor = (session) => {
  const v = "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
  const name = `sb-${REF}-auth-token`;
  if (v.length <= 3180) return `${name}=${v}`;
  return v.match(/.{1,3180}/g).map((p, i) => `${name}.${i}=${p}`).join("; ");
};

async function signedIn(email, password) {
  const c = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return cookieFor(data.session);
}

async function api(cookie, method, path, body) {
  const res = await fetch(APP + path, {
    method,
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${JSON.stringify(json)}`);
  return json;
}

const byId = Object.fromEntries(CATALOGUE.map((i) => [i.id, i]));

// Each demo: who, when, what they bought, how old the order is, and what the stylist has done.
const DEMOS = [
  { couple: "Amelia & James", slug: "amelia-james", ahead: 210, venue: "Hedingham Manor Orangery", style: "garden_romance", guests: 90, ageMin: 25,
    items: ["bd-moongate", "fl-garden-romance", "ch-chiavari", "tw-glassware", "lt-fairy"], notes: "We'd love candles everywhere if possible.",
    plan: async () => {} },
  { couple: "Sophie & Tom", slug: "sophie-tom", ahead: 150, venue: "The Oak Barn", style: "rustic_barn", guests: 70, ageMin: 5 * 60,
    items: ["bd-rustic-arch", "fl-wildflower", "ch-crossback", "fn-trestle-table", "lt-festoon"],
    plan: async (s) => { await s.confirmSupplier("Willow & Co Prop Hire"); await s.notes("Bloomwell need until Friday to confirm 70 tables of meadow flowers."); } },
  { couple: "Fatima & Daniel", slug: "fatima-daniel", ahead: 125, venue: "Hertford County Hall", style: "classic_elegance", guests: 120, ageMin: 2 * 24 * 60,
    items: ["cp-candelabra", "ch-chiavari", "tl-linen-ivory", "tw-cutlery-gold", "bar-horsebox"], notes: "Our families are travelling from abroad, so the date is fixed.",
    plan: async (s) => {
      await s.confirmSupplier("County Furniture Hire");
      await s.declineSupplier("The Tipple Co Mobile Bars", "Horsebox is booked out that whole weekend.");
      await s.messageCouple("We're finding you an alternative bar and will be in touch shortly.");
    } },
  { couple: "Chloe & Ben", slug: "chloe-ben", ahead: 90, venue: "The Oak Barn", style: "rustic_barn", guests: 80, ageMin: 4 * 24 * 60,
    items: ["bd-rustic-arch", "ch-crossback", "fn-trestle-table", "tl-linen-natural", "cp-foliage-runner", "tw-glassware"],
    plan: async (s) => { await s.confirmAll(); await s.setStatus("confirmed", "All confirmed. See you in the barn!"); } },
  { couple: "Hannah & Marcus", slug: "hannah-marcus", ahead: 75, venue: "Hedingham Manor Orangery", style: "modern_minimal", guests: 60, ageMin: 6 * 24 * 60,
    items: ["bd-plinth-pair", "cp-stem-vase", "ch-bentwood", "tl-linen-ivory", "sg-neon"],
    plan: async (s) => {
      await s.declineSupplier("Mono Event Studio", "Fully booked: another wedding has the whole studio that day.");
      await s.setStatus("declined", "We're so sorry: one of our suppliers is fully booked on your date, and we couldn't find a good alternative in time. Nothing has been charged.");
    } },
  { couple: "Isla & Ryan", slug: "isla-ryan", ahead: 100, venue: "The Oak Barn", style: "garden_romance", guests: 50, ageMin: 9 * 24 * 60,
    items: ["bd-moongate", "fl-bridal-bouquet", "ch-chiavari", "tw-napkin-linen"],
    plan: async (s) => { await s.confirmAll(); await s.setStatus("confirmed"); await s.setStatus("cancelled", "Cancelled at your request. We hope to style another occasion for you."); } },
  { couple: "Grace & Oliver", slug: "grace-oliver", ahead: 260, venue: "Hedingham Manor Orangery", style: "classic_elegance", guests: 110, ageMin: 3 * 24 * 60,
    items: ["bd-moongate", "bd-plinth-pair", "fl-garden-romance", "cp-candelabra", "ch-chiavari", "fn-round-table", "tl-linen-ivory", "tw-glassware", "tw-cutlery-gold", "lt-uplight", "bar-copper", "st-invites", "ck-three-tier", "fv-favour-boxes"],
    notes: "Black-tie wedding, ivory and gold throughout.",
    plan: async (s) => { await s.confirmSupplier("County Furniture Hire"); await s.confirmSupplier("Willow & Co Prop Hire"); } },
  { couple: "Mei & Arjun", slug: "mei-arjun", ahead: 45, venue: "Hertford County Hall", style: "modern_minimal", guests: 40, ageMin: 12 * 24 * 60,
    items: ["bd-plinth-pair", "cp-stem-vase", "ch-bentwood", "tl-linen-ivory", "sg-mirror"],
    plan: async (s) => { await s.confirmAll(); await s.setStatus("confirmed", "Everything is confirmed. We'll be in touch a week before to arrange delivery times."); } },
];

async function add() {
  if ((await allDemoUsers()).length > 0) {
    console.error("Demo orders already exist. Run `npm run demo:orders:remove` first.");
    process.exit(1);
  }
  const probe = await fetch(APP + "/api/catalogue").catch(() => null);
  if (!probe?.ok) {
    console.error(`Can't reach the app at ${APP}. Start it with \`npm run dev\` first.`);
    process.exit(1);
  }

  // A temporary stylist, deleted again at the end (the history keeps their email).
  const stylistEmail = `sam.stylist${DOMAIN}`;
  const stylistPassword = randomBytes(18).toString("base64url");
  const { data: stylist, error: stylistError } = await admin.auth.admin.createUser({ email: stylistEmail, password: stylistPassword, email_confirm: true });
  if (stylistError) throw stylistError;
  await admin.from("staff").insert({ user_id: stylist.user.id });
  const staffCookie = await signedIn(stylistEmail, stylistPassword);

  try {
    for (const d of DEMOS) {
      const email = `${d.slug}${DOMAIN}`;
      const password = randomBytes(18).toString("base64url");
      await admin.auth.admin.createUser({ email, password, email_confirm: true });
      const couple = await signedIn(email, password);

      const basket = d.items.map((id) => ({ itemId: id, quantity: suggestedQty(byId[id], d.guests) }));
      const placed = await api(couple, "POST", "/api/orders", {
        basket, coupleName: d.couple, email, phone: "07700 900" + String(100 + DEMOS.indexOf(d) * 7),
        weddingDate: day(d.ahead), venueLabel: d.venue, styleId: d.style, guestCount: d.guests, notes: d.notes,
        idempotencyKey: crypto.randomUUID(),
      });
      const id = placed.order.id;

      const s = {
        async lines(pred, supplierStatus, note) {
          const detail = await api(staffCookie, "GET", `/api/admin/orders/${id}`);
          const ids = detail.lines.filter(pred).map((l) => l.id);
          if (ids.length) await api(staffCookie, "PATCH", `/api/admin/orders/${id}/lines`, { lineIds: ids, supplierStatus, ...(note ? { note } : {}) });
        },
        confirmAll: () => s.lines(() => true, "confirmed"),
        confirmSupplier: (name) => s.lines((l) => l.supplier_name === name, "confirmed"),
        declineSupplier: (name, note) => s.lines((l) => l.supplier_name === name, "declined", note),
        setStatus: (status, coupleMessage) => api(staffCookie, "PATCH", `/api/admin/orders/${id}`, { status, ...(coupleMessage ? { coupleMessage } : {}) }),
        messageCouple: (coupleMessage) => api(staffCookie, "PATCH", `/api/admin/orders/${id}`, { coupleMessage }),
        notes: (staffNotes) => api(staffCookie, "PATCH", `/api/admin/orders/${id}`, { staffNotes }),
      };
      await d.plan(s);

      // Make the order look as old as it should be.
      const placedAt = new Date(Date.now() - d.ageMin * 60000).toISOString();
      await admin.from("orders").update({ created_at: placedAt }).eq("id", id);
      await admin.from("order_events").update({ created_at: placedAt }).eq("order_id", id).eq("type", "placed");

      console.log(`${placed.order.reference}  ${d.couple.padEnd(17)} ${String(d.ahead).padStart(3)} days ahead  £${(placed.order.subtotalPence / 100).toLocaleString("en-GB")}`);
    }
  } finally {
    await admin.auth.admin.deleteUser(stylist.user.id);
  }
  console.log("\nDone. Sign in at /admin/login to see them. Remove with: npm run demo:orders:remove");
}

const command = process.argv[2];
if (command === "add") await add();
else if (command === "remove") await remove();
else {
  console.error("Usage: node scripts/demo-orders.mjs <add|remove>");
  process.exit(1);
}
