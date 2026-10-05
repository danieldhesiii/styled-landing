// Give someone staff access to /admin. There is deliberately no way to do this
// from the website.
//
//   npm run staff:add -- someone@example.com          create the account if needed, make them staff
//   npm run staff:add -- someone@example.com --reset  also set a new password
//   npm run staff:remove -- someone@example.com       take staff access away (keeps the account)
//
// A new account gets a random password, printed ONCE here. Pass it on securely
// and ask them to keep it in a password manager. Needs NEXT_PUBLIC_SUPABASE_URL
// and SUPABASE_SERVICE_ROLE_KEY in .env.local.

import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

try {
  process.loadEnvFile(new URL("../.env.local", import.meta.url));
} catch {
  // use the existing environment
}

const [, , command, emailArg, flag] = process.argv;
const remove = command === "remove";
const email = (emailArg ?? "").trim().toLowerCase();
if (!["add", "remove"].includes(command ?? "") || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Usage: node scripts/add-staff.mjs <add|remove> <email> [--reset]");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (.env.local).");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

async function findUser() {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

let user = await findUser();

if (remove) {
  if (!user) {
    console.log(`No account for ${email}.`);
    process.exit(0);
  }
  const { error } = await db.from("staff").delete().eq("user_id", user.id);
  if (error) throw error;
  console.log(`${email} is no longer staff.`);
  process.exit(0);
}

let password = null;
if (!user) {
  password = randomBytes(18).toString("base64url");
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  user = data.user;
} else if (flag === "--reset") {
  password = randomBytes(18).toString("base64url");
  const { error } = await db.auth.admin.updateUserById(user.id, { password });
  if (error) throw error;
}
if (user.is_anonymous) {
  console.error("That account is a guest session, not a real user.");
  process.exit(1);
}

const { error } = await db.from("staff").upsert({ user_id: user.id }, { onConflict: "user_id" });
if (error) throw error;

console.log(`${email} is staff.`);
if (password) {
  console.log(`\nPassword (shown once): ${password}`);
  console.log("They sign in at /admin/login.");
} else {
  console.log("Their existing password is unchanged (use --reset to set a new one).");
}
