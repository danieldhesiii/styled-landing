const { test } = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs"), ts = require("typescript"), Module = require("node:module"), path = require("node:path");
function load(file) {
  const m = new Module(path.resolve(file), module);
  m._compile(ts.transpileModule(fs.readFileSync(file,"utf8"), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText, path.resolve(file));
  return m.exports;
}
const {newSupplierReplies, customerAlertsEnabled} = load("lib/customer-message-alerts.ts");
const since="2026-11-12T22:00:00Z", reply={id:"thread",supplier_id:"supplier",last_message_id:"reply-1",last_sender_role:"supplier",updated_at:"2026-11-12T22:01:00Z",suppliers:{name:"Demo"}};
test("new supplier replies trigger once; customer sends and earlier unread conversations do not",()=>{
  const seen = new Set();
  assert.equal(newSupplierReplies([reply],seen,since).length,1);
  seen.add(reply.last_message_id);
  assert.equal(newSupplierReplies([reply],seen,since).length,0);
  assert.equal(newSupplierReplies([{...reply,last_message_id:"customer-send",last_sender_role:"customer"}],seen,since).length,0);
  assert.equal(newSupplierReplies([{...reply,last_message_id:"older-unread",updated_at:"2026-11-12T21:00:00Z"}],seen,since).length,0);
  assert.equal(newSupplierReplies([{...reply,last_message_id:"reply-2"}],seen,since).length,1);
});
test("customer notifications do not poll supplier, staff or authentication workspaces",()=>{
  for(const p of ["/portal","/portal/inbox","/admin/vendors","/login","/auth/invite","/venue-portal","/business"]) assert.equal(customerAlertsEnabled(p),false);
  for(const p of ["/","/design","/messages","/suppliers/example","/products/example","/support"]) assert.equal(customerAlertsEnabled(p),true);
});
test("messages guide is discoverable from customer help and explains receipts and limits",()=>{
  const help=load("lib/help.ts");
  assert.equal(help.helpTopicForPage("/messages"),"messages");
  assert.ok(help.helpTopicsFor("wedding").includes("messages"));
  assert.match(help.HELP_GUIDES.messages.steps.map(s=>s.body).join(" "),/envelope.*Sent.*Seen.*Read message/s);
  assert.match(help.HELP_GUIDES.messages.note,/not phone push or email/);
});
