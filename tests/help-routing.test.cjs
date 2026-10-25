const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  Module = require("node:module"),
  ts = require("typescript");
const file = path.resolve("lib/help.ts"),
  loaded = new Module(file, module);
loaded._compile(
  ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
  file,
);
const { helpTopicForPage, helpTopicsFor, HELP_GUIDES } = loaded.exports;
test("customer help follows the current task and unifies the Saved collections", () => {
  for (const [section, topic] of [
    ["wedding", "wedding"],
    ["boards", "boards"],
    ["saved", "saved"],
    ["looks", "saved"],
    ["visualiser", "visualiser"],
    ["venues", "venues"],
    ["orders", "orders"],
    ["checkout", "basket"],
    ["catalogue", "catalogue"],
  ])
    assert.equal(helpTopicForPage("/design", section), topic);
  assert.equal(helpTopicForPage("/order"), "orders");
});
test("public supplier discovery and business onboarding receive different guides", () => {
  assert.equal(helpTopicForPage("/suppliers"), "suppliers");
  assert.equal(helpTopicForPage("/suppliers/example"), "suppliers");
  for (const route of [
    "/vendors",
    "/suppliers/join",
    "/portal",
    "/portal/products",
    "/portal/login",
  ])
    assert.equal(helpTopicForPage(route), "supplier_partners");
  for (const route of [
    "/venues/partner",
    "/venue-portal",
    "/admin/venues/example/enquiries",
  ])
    assert.equal(helpTopicForPage(route), "venue_partners");
  for (const route of ["/venues", "/venues/example", "/venues/requests"])
    assert.equal(helpTopicForPage(route), "venues");
});
test("customer guides stay separate from business workspaces", () => {
  const topics = helpTopicsFor("wedding");
  assert.ok(
    topics.includes("overview") &&
      topics.includes("saved") &&
      topics.includes("basket"),
  );
  assert.ok(
    !topics.includes("supplier_partners") && !topics.includes("venue_partners"),
  );
  assert.deepEqual(helpTopicsFor("supplier_partners"), [
    "business",
    "supplier_partners",
  ]);
  assert.deepEqual(helpTopicsFor("venue_partners"), [
    "business",
    "venue_partners",
  ]);
  assert.equal(helpTopicForPage("/business"), "business");
  assert.deepEqual(helpTopicsFor("business"), [
    "business",
    "venue_partners",
    "supplier_partners",
  ]);
  for (const topic of topics) assert.ok(HELP_GUIDES[topic]);
});
