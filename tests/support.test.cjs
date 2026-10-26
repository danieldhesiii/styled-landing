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
function route(auth = { ok: true, user }, sent = true) {
  const mails = [];
  const m = load("app/api/support/route.ts", {
    "next/server": {
      NextResponse: {
        json: (data, options) => new Response(JSON.stringify(data), options),
      },
    },
    "@/lib/server/session": { requireUser: async () => auth },
    "@/lib/server/notify": {
      sendEmail: async (mail) => {
        mails.push(mail);
        return sent;
      },
    },
    "@/lib/server/env": {
      env: { brevoApiKeyIfSet: undefined, resendApiKeyIfSet: undefined },
    },
    "@/lib/support": support,
  });
  return { post: m.POST, get: m.GET, mails };
}
const draft = {
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
    assert.equal(r.mails.length, 0);
  }
  const r = route();
  assert.equal(
    (await r.post(req({ ...draft, message: "x".repeat(21000) }))).status,
    413,
  );
  assert.equal(r.mails.length, 0);
});
test("support requires same-origin requests and a confirmed non-anonymous session", async () => {
  for (const auth of [
    { ok: false },
    { ok: true, user: { ...user, is_anonymous: true } },
    { ok: true, user: { ...user, email_confirmed_at: null } },
  ]) {
    const r = route(auth);
    assert.equal((await r.post(req())).status, 401);
    assert.equal(r.mails.length, 0);
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
  assert.equal(r.mails.length, 0);
});
test("support sends only to Styled and uses the verified account as reply-to", async () => {
  const r = route();
  const response = await r.post(
    req({
      ...draft,
      to: "attacker@example.com",
      email: "forged@example.com",
      userId: "someone-else",
      message: "Please check <script>alert(1)</script> & my quote.",
    }),
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const data = await response.json();
  assert.match(data.reference, /^SUP-[A-F0-9]{12}$/);
  assert.deepEqual(r.mails[0].to, ["support@styleduk.com"]);
  assert.equal(r.mails[0].replyTo, "own@example.com");
  assert.ok(r.mails[0].subject.includes(data.reference));
  assert.ok(!r.mails[0].html.includes("<script>"));
  assert.match(r.mails[0].html, /&lt;script&gt;/);
  assert.ok(!r.mails[0].text.includes("forged@example.com"));
});
test("mail failure never reports success and support attempts are bounded", async () => {
  const r = route(undefined, false);
  assert.equal((await r.post(req())).status, 503);
  const s = route();
  for (let i = 0; i < 3; i++) assert.equal((await s.post(req())).status, 200);
  assert.equal((await s.post(req())).status, 429);
  assert.equal(s.mails.length, 3);
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

test("support contact capabilities do not claim website email is enabled without a provider", async () => {
  const r = route();
  assert.deepEqual(await r.get().json(), { emailEnabled: false });
  assert.equal(r.mails.length, 0);
});
