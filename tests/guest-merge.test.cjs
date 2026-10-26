const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
function load(relative, mocks = {}) {
  const file = path.resolve(relative), loaded = new Module(file, module);
  loaded.paths = module.paths;
  loaded.require = id => {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    if (id.startsWith("@/")) return load(`${id.slice(2)}.ts`, mocks);
    return require(id);
  };
  loaded._compile(ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, file);
  return loaded.exports;
}
const envMock = { env: { supabaseServiceRoleKey: "test-only-server-signing-secret-that-is-long-enough" } };
const proof = load("lib/server/guest-merge-proof.ts", { "@/lib/server/env": envMock });
const guestId = "11111111-1111-4111-8111-111111111111";
const destinationId = "22222222-2222-4222-8222-222222222222";
const strangerId = "33333333-3333-4333-8333-333333333333";
const account = { id: destinationId, email: "couple@example.invalid", email_confirmed_at: "2026-01-01", is_anonymous: false };
function request(route, body = {}, { origin = "https://styled.test", host, url = "https://styled.test", type = "application/json" } = {}) {
  const headers = { "content-type": type };
  if (origin !== null) headers.origin = origin;
  if (host) headers.host = host;
  return new Request(`${url}/api/session/${route}`, { method: "POST", headers, body: JSON.stringify(body) });
}
function harness({ user = account, token, sourceAnonymous = true, dbError = null, sourceError = null, noSession = false } = {}) {
  const events = [], cookieMap = new Map(), writtenCookies = [];
  if (token) cookieMap.set(proof.mergeCookieName, token);
  const NextResponse = { json: (body, options) => {
    const response = new Response(JSON.stringify(body), options);
    response.cookies = { set: (name, value, settings) => {
      cookieMap.set(name, value); writtenCookies.push({ name, value, settings }); events.push({ type: "cookie", maxAge: settings.maxAge });
    } };
    return response;
  } };
  const mocks = {
    "@/lib/server/env": envMock,
    "next/server": { NextResponse },
    "next/headers": { cookies: async () => ({ get: name => cookieMap.has(name) ? { value: cookieMap.get(name) } : undefined, set: (name, value, settings) => {
      cookieMap.set(name, value); events.push({ type: "cookie", maxAge: settings.maxAge });
    } }) },
    "@/lib/server/session": { requireUser: async () => {
      events.push({ type: "authenticate" });
      return noSession ? { ok: false, response: new Response(null, { status: 401 }) } : { ok: true, user };
    } },
    "@/lib/supabase/admin": { createAdminClient: () => {
      events.push({ type: "admin" });
      return {
        auth: { admin: { getUserById: async id => { events.push({ type: "source", id }); return { data: { user: { id, is_anonymous: sourceAnonymous } }, error: sourceError }; } } },
        from: table => {
          const op = { type: "query", table, action: "read", filters: [] };
          const query = {
            select: () => query,
            update: value => { op.action = "update"; op.value = value; return query; },
            delete: () => { op.action = "delete"; return query; },
            eq: (key, value) => { op.filters.push([key, value]); return query; },
            in: (key, value) => { op.filters.push([key, value]); return query; },
            not: () => query, like: () => query,
            then: (resolve, reject) => {
              events.push(op);
              return Promise.resolve({ data: [], count: 0, error: dbError }).then(resolve, reject);
            },
          };
          return query;
        },
        storage: { from: bucket => ({ list: async prefix => { events.push({ type: "storage", bucket, prefix }); return { data: [], error: dbError }; } }) },
      };
    } },
  };
  return { premerge: load("app/api/session/premerge/route.ts", mocks).POST, merge: load("app/api/session/merge/route.ts", mocks).POST, events, cookieMap, writtenCookies };
}
test("signed proof binds anonymous ID, intended email and a five-minute expiry", () => {
  const now = 1800000000000, token = proof.issueMergeProof(guestId, "Couple@Example.Invalid", now);
  const verified = proof.verifyMergeProof(token, account.email, now);
  assert.equal(verified.anonId, guestId);
  assert.equal(verified.expires - verified.issued, 300);
  assert.equal(proof.verifyMergeProof(token, "other@example.invalid", now), null);
  assert.equal(proof.verifyMergeProof(token, account.email, now + 300000), null);
  assert.equal(proof.verifyMergeProof(token, account.email, now - 1000), null);
  const [payload, signature] = token.split(".");
  const changed = JSON.parse(Buffer.from(payload, "base64url")); changed.anonId = strangerId;
  assert.equal(proof.verifyMergeProof(`${Buffer.from(JSON.stringify(changed)).toString("base64url")}.${signature}`, account.email, now), null);
  for (const malformed of [undefined, "", token + ".extra", "unsigned", "a.b", "x".repeat(2049)]) assert.equal(proof.verifyMergeProof(malformed, account.email, now), null);
});
test("same-site checks accept real Host behind internal URLs, but reject missing or external Origins", () => {
  assert.equal(proof.validMergeRequest(request("premerge")), true);
  assert.equal(proof.validMergeRequest(request("premerge", {}, { url: "http://localhost:3000", host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" })), true);
  assert.equal(proof.validMergeRequest(request("premerge", {}, { url: "http://internal:3000", host: "styled.test", origin: "https://styled.test" })), true);
  for (const origin of [null, "null", "not a url", "https://evil.test", "ftp://styled.test", "https://styled.test/path", "https://user@styled.test"]) assert.equal(proof.validMergeRequest(request("premerge", {}, { origin })), false, String(origin));
  assert.equal(proof.validMergeRequest(request("premerge", {}, { origin: "https://styled.test:1234" })), false);
  assert.equal(proof.validMergeRequest(request("premerge", {}, { type: "text/plain" })), false);
});
test("premerge issues proof only from the server-authenticated guest, never request IDs", async () => {
  const h = harness({ user: { id: guestId, is_anonymous: true } });
  const response = await h.premerge(request("premerge", { email: account.email }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(response.headers.get("cache-control"), "no-store");
  const cookie = h.writtenCookies[0];
  assert.equal(cookie.settings.httpOnly, true);
  assert.equal(cookie.settings.sameSite, "strict");
  assert.equal(cookie.settings.maxAge, 300);
  assert.equal(cookie.settings.secure, process.env.NODE_ENV === "production");
  assert.equal(proof.verifyMergeProof(cookie.value, account.email).anonId, guestId);
  assert.ok(!h.events.some(e => e.type === "admin"));
  assert.equal((await h.premerge(request("premerge", { email: account.email, anonUserId: strangerId }))).status, 400);
});
test("permanent or missing sessions cannot mint guest proofs", async () => {
  for (const options of [{}, { noSession: true }]) {
    const h = harness(options);
    assert.ok([401, 403].includes((await h.premerge(request("premerge", { email: account.email }))).status));
    assert.equal(h.writtenCookies.length, 0);
    assert.ok(!h.events.some(e => e.type === "admin"));
  }
});
test("legacy caller IDs, forged and expired proofs cannot reach privileged queries", async () => {
  for (const token of [undefined, "forged.cookie", proof.issueMergeProof(guestId, account.email, Date.now() - 301000), proof.issueMergeProof(guestId, "other@example.invalid")]) {
    const h = harness({ token });
    const response = await h.merge(request("merge", { anonUserId: strangerId }));
    assert.equal(response.status, 403);
    assert.match((await response.json()).error, /ownership could not be verified/);
    assert.ok(!h.events.some(e => e.type === "admin"));
  }
});
test("valid proof still rejects caller-selected source IDs and unconfirmed destination accounts", async () => {
  const token = proof.issueMergeProof(guestId, account.email);
  const supplied = harness({ token });
  assert.equal((await supplied.merge(request("merge", { anonUserId: strangerId }))).status, 400);
  assert.ok(!supplied.events.some(e => e.type === "admin"));
  for (const user of [{ ...account, is_anonymous: true }, { ...account, email_confirmed_at: null }, { ...account, email: null }]) {
    const h = harness({ token, user });
    assert.equal((await h.merge(request("merge"))).status, 403);
    assert.ok(!h.events.some(e => e.type === "admin"));
  }
});
test("both routes reject cross-site and missing Origins before authentication or mutation", async () => {
  for (const name of ["premerge", "merge"]) for (const origin of [null, "https://evil.test", "null"]) {
    const h = harness({ token: proof.issueMergeProof(guestId, account.email) });
    assert.equal((await h[name](request(name, {}, { origin }))).status, 403);
    assert.deepEqual(h.events, []);
  }
});
test("proven migration consumes cookie before privileged work and scopes all updates to proven source", async () => {
  const h = harness({ token: proof.issueMergeProof(guestId, account.email) });
  const response = await h.merge(request("merge"));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, merged: true });
  assert.equal(h.cookieMap.get(proof.mergeCookieName), "");
  assert.ok(h.events.findIndex(e => e.type === "cookie" && e.maxAge === 0) < h.events.findIndex(e => e.type === "admin"));
  assert.deepEqual(h.events.filter(e => e.type === "source").map(e => e.id), [guestId]);
  const writes = h.events.filter(e => e.type === "query" && e.action === "update");
  assert.ok(writes.length >= 6);
  for (const write of writes) {
    assert.deepEqual(write.value, { owner_id: destinationId });
    assert.ok(write.filters.some(([key, value]) => key === "owner_id" && value === guestId));
  }
  const before = h.events.filter(e => e.type === "admin").length;
  assert.equal((await h.merge(request("merge"))).status, 403);
  assert.equal(h.events.filter(e => e.type === "admin").length, before);
});
test("source-account and transfer failures fail clearly instead of reporting a successful merge", async () => {
  for (const options of [{ sourceAnonymous: false }, { sourceError: Error("private provider failure") }, { dbError: Error("private database failure") }]) {
    const h = harness({ token: proof.issueMergeProof(guestId, account.email), ...options });
    const response = await h.merge(request("merge"));
    assert.ok([409, 503].includes(response.status));
    const body = await response.json();
    assert.equal(body.ok, false);
    assert.ok(!body.error.includes("private"));
    assert.equal(h.cookieMap.get(proof.mergeCookieName), "");
  }
});
