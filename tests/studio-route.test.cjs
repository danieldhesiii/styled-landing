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

test("explicit catalogue browse clears product handoff details while retaining useful filters and venue context", () => {
  const url = studioDestination("https://development.test/design?tab=visualiser&product=selected-chair&preview=selected-chair&supplier=florist&category=furniture&q=oak&styleFilter=rustic_barn&min=5&max=500&sort=price-asc&venue=restricted-venue&render=true#product", "catalogue");
  assert.equal(url.searchParams.get("tab"), "catalogue");
  for (const key of ["product", "preview", "render"]) assert.equal(url.searchParams.has(key), false);
  for (const [key, value] of Object.entries({ supplier: "florist", category: "furniture", q: "oak", styleFilter: "rustic_barn", min: "5", max: "500", sort: "price-asc", venue: "restricted-venue" })) assert.equal(url.searchParams.get(key), value);
  assert.equal(url.hash, "");
  const direct = new URL("https://development.test/design?tab=catalogue&product=chair&preview=chair");
  assert.equal(studioRoute(direct.searchParams).tab, "catalogue");
  assert.equal(direct.searchParams.get("product"), "chair");
});

test("visualiser browse callback and primary navigation both use the clean catalogue destination", () => {
  const page = fs.readFileSync("app/design/page.tsx", "utf8");
  const ast = ts.createSourceFile("page.tsx", page, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let switcher, browse;
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === "switchStudioTab") switcher = node.getText(ast);
    if (ts.isJsxAttribute(node) && node.name.getText(ast) === "onBrowseProducts") browse = node.initializer.expression.getText(ast);
    ts.forEachChild(node, visit);
  }
  visit(ast); assert.ok(switcher); assert.ok(browse);
  let destination, step;
  const vm = require("node:vm");
  const context = { studioDestination, setStep: value => { step = value; }, window: { location: { href: "https://development.test/design?tab=visualiser&product=chair&preview=chair&q=oak" }, history: { pushState(_data, _title, url) { destination = url; } }, scrollTo() {} } };
  vm.runInNewContext(ts.transpileModule(`${switcher}; (${browse})();`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, context);
  assert.equal(step, "studio");
  assert.equal(destination.searchParams.get("q"), "oak");
  assert.equal(destination.searchParams.has("product"), false);
  assert.equal(destination.searchParams.has("preview"), false);
});
