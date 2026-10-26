const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  Module = require("node:module"),
  ts = require("typescript");
const file = path.resolve("lib/studio-route.ts"),
  loaded = new Module(file, module);
loaded._compile(
  ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
  file,
);
const { studioRoute, studioDestination } = loaded.exports;
test("normal login starts at the plan while shopping and render links keep their intent", () => {
  assert.equal(studioRoute(new URLSearchParams()).tab, "wedding");
  assert.equal(
    studioRoute(new URLSearchParams("supplier=flowers&add=piece")).tab,
    "catalogue",
  );
  assert.equal(
    studioRoute(new URLSearchParams("render=true")).tab,
    "visualiser",
  );
  assert.equal(
    studioRoute(new URLSearchParams("tab=boards&supplier=flowers")).tab,
    "boards",
  );
  assert.equal(studioRoute(new URLSearchParams("tab=invalid")).tab, "wedding");
});
test("bookmarkable booking views preserve context and remove stale render intent", () => {
  const destination = studioDestination(
    "https://styled.test/design?tab=visualiser&render=true&supplier=flowers#old",
    "orders",
    "venues",
  );
  assert.equal(destination.searchParams.get("bookings"), "venues");
  assert.equal(destination.searchParams.has("render"), false);
  assert.equal(destination.searchParams.get("supplier"), "flowers");
  assert.equal(destination.hash, "");
  assert.deepEqual(studioRoute(destination.searchParams), {
    tab: "orders",
    bookings: "venues",
  });
  assert.equal(
    studioDestination(destination.href, "boards").searchParams.has("bookings"),
    false,
  );
});
