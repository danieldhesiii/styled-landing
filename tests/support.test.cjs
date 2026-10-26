const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  Module = require("node:module"),
  ts = require("typescript");
function load(file, mocks = {}) {
  const f = path.resolve(file),
    m = new Module(f, module);
  m.paths = module.paths;
  m.require = (id) => (Object.hasOwn(mocks, id) ? mocks[id] : require(id));
  m._compile(
    ts.transpileModule(fs.readFileSync(f, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    f,
  );
  return m.exports;
}
const support = load("lib/support.ts");
const user = {
  id: "own-user",
  email: "own@example.com",
  email_confirmed_at: "2026-01-01",
  is_anonymous: false,
};
function route(auth = { ok: true, user }, failure = false) {
  const calls = [],
    reads = [];
  const db = {
    from: () => ({
      select: () => ({
        eq: (key, value) => {
          reads.push([key, value]);
          return {
            order: () => ({ limit: async () => ({ data: [], error: null }) }),
          };
        },
      }),
    }),
  };
  const m = load("app/api/support/route.ts", {
    "next/server": {
      NextResponse: {
        json: (data, options) => new Response(JSON.stringify(data), options),
      },
    },
    "@/lib/server/session": {
      requireUser: async () => ({ ...auth, supabase: db }),
    },
    "@/lib/supabase/admin": {
      createAdminClient: () => ({
        rpc: async (name, args) => {
          calls.push({ name, args });
          return failure
            ? {
                error: {
                  message:
                    failure === "limit"
                      ? "support_rate_limit"
                      : "private database details",
                },
              }
            : { data: "SUP-012345ABCDEF", error: null };
        },
      }),
    },
    "@/lib/support": support,
  });
  return { post: m.POST, get: m.GET, calls, reads };
}
const draft = {
  clientId: "11111111-1111-4111-8111-111111111111",
  topic: "request",
  reference: "STY-TEST",
  message: "Please help with my requested delivery date.",
};
function req(body = draft, headers = {}) {
  return new Request("https://styled.test/api/support", {
    method: "POST",
    headers: {
      origin: "https://styled.test",
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}
test("support rejects malformed fields, long bodies and header injection", async () => {
  for (const bad of [
    null,
    [],
    { ...draft, topic: "constructor" },
    { ...draft, message: "short" },
    { ...draft, message: "x".repeat(4001) },
    { ...draft, reference: "Bad\r\nheader" },
  ]) {
    const r = route();
    assert.equal((await r.post(req(bad))).status, 422);
    assert.equal(r.calls.length, 0);
  }
  const r = route();
  assert.equal(
    (await r.post(req({ ...draft, message: "x".repeat(21000) }))).status,
    413,
  );
  assert.equal(r.calls.length, 0);
});
test("support requires same-origin requests and a confirmed non-anonymous session", async () => {
  for (const auth of [
    { ok: false },
    { ok: true, user: { ...user, is_anonymous: true } },
    { ok: true, user: { ...user, email_confirmed_at: null } },
  ]) {
    const r = route(auth);
    assert.equal((await r.post(req())).status, 401);
    assert.equal(r.calls.length, 0);
  }
  const r = route();
  assert.equal(
    (await r.post(req(draft, { origin: "https://attacker.test" }))).status,
    403,
  );
  assert.equal(
    (await r.post(req(draft, { "content-type": "text/plain" }))).status,
    415,
  );
  assert.equal(r.calls.length, 0);
});
test("support saves with verified identity, ignoring forged destinations and owners", async () => {
  const r = route();
  const response = await r.post(
    req({
      ...draft,
      email: "forged@example.com",
      userId: "someone-else",
      to: "attacker@example.com",
    }),
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.match((await response.json()).reference, /^SUP-[A-F0-9]{12}$/);
  assert.deepEqual(r.calls, [
    {
      name: "submit_support_request",
      args: {
        p_user: user.id,
        p_email: user.email,
        p_client: draft.clientId,
        p_topic: draft.topic,
        p_related: draft.reference,
        p_message: draft.message,
      },
    },
  ]);
});
test("support refuses false success on database failure and reports persistent rate limits", async () => {
  const failed = await route(undefined, true).post(req());
  assert.equal(failed.status, 503);
  assert.ok(!(await failed.text()).includes("private database"));
  assert.equal((await route(undefined, "limit").post(req())).status, 429);
  for (const clientId of [undefined, "bad", null])
    assert.equal((await route().post(req({ ...draft, clientId }))).status, 422);
});
test("email fallback encodes user content and always targets the support mailbox", () => {
  const uri = support.supportMailto({
    ...draft,
    message: "Question & subject=bad\nLine two",
  });
  assert.ok(uri.startsWith("mailto:support@styleduk.com?"));
  const params = new URLSearchParams(uri.split("?")[1]);
  assert.equal(
    params.get("subject"),
    "Styled support: A supplier or venue request",
  );
  assert.match(params.get("body"), /Question & subject=bad\nLine two/);
  assert.equal([...params.keys()].length, 2);
});

test("support history is scoped to the authenticated owner and unavailable without sign-in", async () => {
  const r = route();
  const response = await r.get();
  assert.equal(response.status, 200);
  assert.deepEqual(r.reads, [["user_id", user.id]]);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const denied = route({ ok: false });
  assert.equal((await denied.get()).status, 401);
  assert.equal(denied.reads.length, 0);
});
function staffRoute(authorized = true, changed = true) {
  const writes = [];
  const admin = {
    from: () => ({
      update: (patch) => {
        writes.push(patch);
        const chain = {
          eq: (key, value) => {
            writes.push([key, value]);
            return chain;
          },
          select: () => ({
            maybeSingle: async () => ({
              data: changed ? { id: "test" } : null,
              error: null,
            }),
          }),
        };
        return chain;
      },
    }),
  };
  const m = load("app/api/admin/support/route.ts", {
    "next/server": {
      NextResponse: {
        json: (data, options) => new Response(JSON.stringify(data), options),
      },
    },
    "@/lib/server/staff": {
      requireStaff: async () =>
        authorized
          ? { ok: true, user, admin }
          : { ok: false, response: new Response("Forbidden", { status: 403 }) },
    },
  });
  return { patch: m.PATCH, get: m.GET, writes };
}
const update = {
  id: "11111111-1111-4111-8111-111111111111",
  reply: "Here is your answer.",
  status: "in_progress",
  updatedAt: "2026-01-01T00:00:00Z",
};
test("staff support requires staff and same-origin access before any writes", async () => {
  const denied = staffRoute(false);
  assert.equal((await denied.patch(req(update))).status, 403);
  assert.equal((await denied.get(req())).status, 403);
  assert.equal(denied.writes.length, 0);
  const r = staffRoute();
  assert.equal(
    (await r.patch(req(update, { origin: "https://bad.test" }))).status,
    403,
  );
  assert.equal(r.writes.length, 0);
});
test("staff replies validate status and length and guard against concurrent overwrites", async () => {
  for (const bad of [
    { ...update, status: "deleted" },
    { ...update, reply: "x".repeat(4001) },
    { ...update, updatedAt: "bad" },
  ]) {
    const r = staffRoute();
    assert.equal((await r.patch(req(bad))).status, 422);
    assert.equal(r.writes.length, 0);
  }
  const r = staffRoute();
  assert.equal(
    (await r.patch(req({ ...update, user_id: "forged" }))).status,
    200,
  );
  assert.equal(r.writes[0].replied_by, user.id);
  assert.equal(r.writes[0].user_id, undefined);
  assert.deepEqual(r.writes[2], ["updated_at", update.updatedAt]);
  assert.equal((await staffRoute(true, false).patch(req(update))).status, 409);
});
