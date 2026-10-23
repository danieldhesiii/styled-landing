const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

function route(auth, memberships = {}, failure = false) {
  const queries = [];
  const file = path.resolve("app/api/workspaces/route.ts");
  const loaded = new Module(file, module);
  loaded.paths = module.paths;
  loaded.require = (id) => {
    if (id === "next/server")
      return {
        NextResponse: {
          json: (data, options) => new Response(JSON.stringify(data), options),
        },
      };
    if (id === "@/lib/server/session") return { requireUser: async () => auth };
    if (id === "@/lib/supabase/admin")
      return {
        createAdminClient: () => ({
          from: (table) => ({
            select: (fields) => ({
              eq: (key, user) => ({
                limit: async () => {
                  queries.push({ table, key, user, fields });
                  return {
                    data: memberships[`${table}:${user}`] || [],
                    error: failure ? Error("private database detail") : null,
                  };
                },
              }),
            }),
          }),
        }),
      };
    return require(id);
  };
  loaded._compile(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    }).outputText,
    file,
  );
  return { get: loaded.exports.GET, queries };
}

test("workspace links refuse missing sessions without querying memberships", async () => {
  const unauthorized = new Response("No session", { status: 401 });
  const r = route({ ok: false, response: unauthorized });
  assert.equal(await r.get(), unauthorized);
  assert.deepEqual(r.queries, []);
});
test("anonymous customers receive no business memberships", async () => {
  const r = route({ ok: true, user: { id: "guest", is_anonymous: true } });
  assert.deepEqual(await (await r.get()).json(), {
    venue: false,
    supplier: false,
  });
  assert.deepEqual(r.queries, []);
});
test("workspace links reflect only the session user's existing memberships", async () => {
  const r = route(
    { ok: true, user: { id: "customer", is_anonymous: false } },
    {
      "venue_users:someone-else": [{ venue_id: "private-other-venue" }],
      "supplier_users:customer": [{ supplier_id: "own-supplier" }],
    },
  );
  const response = await r.get(
    new Request("https://styled.test/api/workspaces?user_id=someone-else"),
  );
  assert.deepEqual(await response.json(), { venue: false, supplier: true });
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(r.queries.length, 2);
  assert.ok(
    r.queries.every((q) => q.key === "user_id" && q.user === "customer"),
  );
});
test("membership failures expose no private database details or cached capabilities", async () => {
  const r = route(
    { ok: true, user: { id: "customer", is_anonymous: false } },
    {},
    true,
  );
  const response = await r.get();
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), {
    error: "Could not load workspaces.",
  });
});
