const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  ts = require("typescript"),
  Module = require("node:module"),
  path = require("node:path");
function load(file) {
  const m = new Module(path.resolve(file), module);
  m._compile(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    }).outputText,
    path.resolve(file),
  );
  return m.exports;
}
const { validReplyHours, replyTargetLabel, conversationStatus, receiptLabel } =
  load("lib/message-status.ts");
const { supplierDemoAvailable } = load("lib/supplier-demo.ts");
test("reply targets accept bounded calendar hours and remain unset until supplied", () => {
  for (const h of [null, 1, 24, 48, 168])
    assert.equal(validReplyHours(h), true);
  for (const h of [0, 169, 1.1, "48", true, {}, undefined])
    assert.equal(validReplyHours(h), false);
  assert.equal(replyTargetLabel(null), "Response time to be agreed");
  assert.equal(replyTargetLabel(24), "Reply target: within 1 day");
  assert.equal(replyTargetLabel(48), "Reply target: within 2 days");
});
test("both participants see whose reply is awaited; only supplier targets become overdue", () => {
  const start = Date.parse("2026-11-12T10:00:00Z"),
    t = {
      last_sender_role: "customer",
      awaiting_since: new Date(start).toISOString(),
      reply_target_hours: 48,
    };
  assert.equal(
    conversationStatus(t, false, start + 3600000).label,
    "Waiting for supplier to reply",
  );
  assert.equal(
    conversationStatus(t, true, start + 3600000).label,
    "Waiting for your reply",
  );
  assert.equal(
    conversationStatus(t, false, start + 49 * 3600000).overdue,
    true,
  );
  assert.equal(
    conversationStatus(
      { ...t, reply_target_hours: null },
      false,
      start + 99 * 3600000,
    ).overdue,
    false,
  );
  assert.equal(
    conversationStatus(
      { ...t, last_sender_role: "supplier" },
      true,
      start + 99 * 3600000,
    ).label,
    "Waiting for customer to reply",
  );
  assert.equal(
    conversationStatus({ ...t, last_sender_role: "supplier" }, false, start)
      .label,
    "Supplier replied",
  );
});
test("saved messages are Sent, never claimed delivered or read until acknowledgement", () => {
  assert.equal(receiptLabel(null, false), "Sent");
  assert.equal(receiptLabel("2026-11-12T10:00:00Z", false), "Seen by supplier");
  assert.equal(receiptLabel("2026-11-12T10:00:00Z", true), "Seen by customer");
});
test("demo homepage entry is restricted to the development host and database", () => {
  const dev = "https://qkyeitvwscrxbiwamxan.supabase.co";
  assert.equal(
    supplierDemoAvailable("styledukprodprogress.vercel.app", dev),
    true,
  );
  assert.equal(supplierDemoAvailable("styleduk.com", dev), false);
  assert.equal(
    supplierDemoAvailable(
      "styledukprodprogress.vercel.app",
      "https://yfwqcidkfjzpwbylgnug.supabase.co",
    ),
    false,
  );
});
