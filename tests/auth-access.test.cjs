const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

// Run the real helpers/routes with in-memory auth and cookies. No network,
// emails, password updates, user provisioning or production credentials.
function load(relative, mocks = {}) {
  const file = path.resolve(relative);
  const loaded = new Module(file, module);
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
const navigation = load("lib/auth/navigation.ts");
const NextResponse = {
  redirect: (url, status = 307) => new Response(null, { status, headers: { location: String(url) } }),
  json: (data, options) => new Response(JSON.stringify(data), options),
};

test("local destinations preserve catalogue, supplier, add and bookings context", () => {
  for (const next of ["/design?tab=catalogue&supplier=a&add=b", "/design?tab=orders", "/portal", "/venue-portal", "/venues/requests#latest"]) {
    assert.equal(navigation.safeLocalRedirect(next), next);
  }
});
test("redirects reject external, encoded, control, backslash and auth-loop destinations", () => {
  for (const next of [undefined, "", "https://evil.test", "//evil.test", "///evil.test", "\\evil.test", "/\\evil.test", " /design", "/\nevil", "/%2fevil.test", "/%252fevil.test", "/%5cevil.test", "/%255cevil.test", "/%09/evil.test", "/%", "/login", "/auth/callback?code=x", "/auth/reset", "/a/../auth/callback", "/%61uth/callback", "/portal/login"]) {
    assert.equal(navigation.safeLocalRedirect(next), "/design", String(next));
  }
  assert.equal(navigation.safeLocalRedirect("//evil.test", "/portal"), "/portal");
});
test("callback construction validates nested destinations and encodes query context", () => {
  const next = "/design?tab=catalogue&supplier=one&add=two";
  const url = new URL(navigation.authCallbackPath(next, true), "https://styled.test");
  assert.equal(url.pathname, "/auth/callback");
  assert.equal(url.searchParams.get("next"), next);
  assert.equal(url.searchParams.get("flow"), "recovery");
  assert.equal(new URL(navigation.authCallbackPath("//evil.test"), url).searchParams.get("next"), "/design");
});
test("supplier status separates missing session, denied access and temporary failures", () => {
  assert.equal(navigation.supplierAccessStatus(200), "allowed");
  assert.equal(navigation.supplierAccessStatus(401), "signed-out");
  assert.equal(navigation.supplierAccessStatus(403), "denied");
  for (const status of [0, 404, 429, 500, 503]) assert.equal(navigation.supplierAccessStatus(status), "temporary");
});

function callback({ fail = false, throws = false, anonymous = false } = {}) {
  const cookies = new Map([["pkce", "browser-verifier"]]);
  const codes = [];
  const route = load("app/auth/callback/route.ts", {
    "next/server": { NextResponse },
    "next/headers": { cookies: async () => ({ getAll: () => [...cookies].map(([name, value]) => ({ name, value })), set: (name, value) => cookies.set(name, value) }) },
    "@/lib/server/env": { env: { supabaseUrl: "https://example.invalid", supabaseAnonKey: "public-test-key" } },
    "@supabase/ssr": { createServerClient: (_url, _key, options) => ({ auth: {
      exchangeCodeForSession: async code => {
        codes.push(code);
        assert.ok(options.cookies.getAll().some(c => c.name === "pkce" && c.value === "browser-verifier"));
        if (throws) throw Error("private provider diagnostic");
        if (fail) return { data: {}, error: Error("invalid code") };
        options.cookies.setAll([{ name: "session", value: "cookie-session", options: { httpOnly: true } }]);
        return { data: { session: {}, user: { is_anonymous: anonymous } }, error: null };
      },
    } }) },
  });
  return { get: route.GET, cookies, codes };
}
test("callback exchanges code with browser verifier and writes session cookies before local redirect", async () => {
  const route = callback();
  const res = await route.get(new Request("https://styled.test/auth/callback?code=one-use&next=%2Fdesign%3Ftab%3Dorders"));
  assert.equal(res.status, 303);
  assert.equal(res.headers.get("location"), "https://styled.test/design?tab=orders");
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.equal(res.headers.get("referrer-policy"), "no-referrer");
  assert.equal(route.cookies.get("session"), "cookie-session");
  assert.deepEqual(route.codes, ["one-use"]);
});
test("recovery callback opens authenticated password form with safe continuation", async () => {
  const res = await callback().get(new Request("https://styled.test/auth/callback?code=valid&flow=recovery&next=%2Fportal"));
  const target = new URL(res.headers.get("location"));
  assert.equal(target.pathname, "/auth/reset");
  assert.equal(target.searchParams.get("next"), "/portal");
});
test("missing, expired or provider-error links fail safely without reflecting codes or diagnostics", async () => {
  for (const [options, query] of [[{}, ""], [{ fail: true }, "?code=expired"], [{ throws: true }, "?code=secret"], [{ anonymous: true }, "?code=guest"], [{}, "?code=unused&error=denied"]]) {
    const route = callback(options);
    const res = await route.get(new Request(`https://styled.test/auth/callback${query}`));
    const target = new URL(res.headers.get("location"));
    assert.equal(target.pathname, "/auth/recovery");
    assert.equal(target.searchParams.get("error"), "link");
    assert.ok(!res.headers.get("location").includes("code="));
    if (!query || query.includes("error=")) assert.deepEqual(route.codes, []);
  }
});
test("successful code exchange never follows an external next URL", async () => {
  const res = await callback().get(new Request("https://styled.test/auth/callback?code=valid&next=%2F%2Fevil.test"));
  assert.equal(res.headers.get("location"), "https://styled.test/design");
});

function supplierRoute({ user = { id: "current-user", is_anonymous: false }, authError = null, membership = { supplier_id: "linked-supplier" }, membershipError = null, supplier = { id: "linked-supplier" }, supplierError = null, throws = false } = {}) {
  const queries = [];
  const route = load("app/auth/supplier-access/route.ts", {
    "next/server": { NextResponse },
    "@/lib/supabase/server": { createClient: async () => ({ auth: { getUser: async () => ({ data: { user }, error: authError }) } }) },
    "@/lib/supabase/admin": { createAdminClient: () => {
      if (throws) throw Error("private connection error");
      return { from: table => ({ select: () => ({ eq: (key, value) => ({ maybeSingle: async () => {
        queries.push({ table, key, value });
        return table === "supplier_users" ? { data: membership, error: membershipError } : { data: supplier, error: supplierError };
      } }) }) }) };
    } },
  });
  return { get: route.GET, queries };
}
test("supplier checks use only authenticated identity and existing linked supplier", async () => {
  const route = supplierRoute();
  const res = await route.get(new Request("https://styled.test/auth/supplier-access?user_id=other"));
  assert.equal(res.status, 200);
  assert.deepEqual(route.queries, [
    { table: "supplier_users", key: "user_id", value: "current-user" },
    { table: "suppliers", key: "id", value: "linked-supplier" },
  ]);
  assert.equal(res.headers.get("cache-control"), "no-store");
});
test("missing or anonymous sessions do not query supplier records", async () => {
  for (const user of [null, { id: "guest", is_anonymous: true }]) {
    const route = supplierRoute({ user });
    assert.equal((await route.get()).status, 401);
    assert.deepEqual(route.queries, []);
  }
});
test("supplier denial differs from database, auth-service and network failures", async () => {
  for (const options of [{ membership: null }, { supplier: null }]) assert.equal((await supplierRoute(options).get()).status, 403);
  for (const options of [{ membershipError: Error("db") }, { supplierError: Error("db") }, { throws: true }, { authError: { status: 503 } }, { authError: { status: 0 } }, { authError: { status: 429 } }]) {
    const res = await supplierRoute(options).get();
    assert.equal(res.status, 503);
    assert.deepEqual(await res.json(), { ok: false });
  }
});
