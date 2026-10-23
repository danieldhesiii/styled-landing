const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  path = require("node:path"),
  Module = require("node:module"),
  ts = require("typescript");
const cache = new Map();
function load(relative) {
  const file = path.resolve(relative);
  if (cache.has(file)) return cache.get(file).exports;
  const m = new Module(file, module);
  m.paths = module.paths;
  cache.set(file, m);
  m.require = (id) => {
    if (id.startsWith("@/")) return load(id.slice(2) + ".ts");
    if (id.startsWith("."))
      return load(path.join(path.dirname(file), id) + ".ts");
    return require(id);
  };
  m._compile(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    }).outputText,
    file,
  );
  return m.exports;
}
const { deliveryError, deliveryDay, workspaceFingerprint } =
    load("lib/wedding.ts"),
  { parseWorkspace } = load("lib/workspace-input.ts"),
  { milesBetween, validPostcode, validPoint } = load("lib/location.ts");
const day = (n) =>
  new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
test("same-day delivery follows a changed wedding date and ignores stale custom date", () => {
  assert.equal(
    deliveryDay({
      weddingDate: day(60),
      deliveryDate: day(30),
      deliverySameDay: true,
    }),
    day(60),
  );
  assert.equal(
    deliveryDay({
      weddingDate: day(60),
      deliveryDate: day(59),
      deliverySameDay: false,
    }),
    day(59),
  );
  assert.equal(
    deliveryDay({ weddingDate: day(60), deliverySameDay: false }),
    "",
  );
});
test("allows earlier setup delivery, refuses missing, past, later and excessive ranges", () => {
  assert.equal(deliveryError(day(60), day(59)), null);
  for (const d of ["", day(-1), day(61), day(28), "2027-02-30"])
    assert.ok(deliveryError(day(60), d));
  assert.equal(deliveryError(day(60), day(29)), null);
});
const valid = {
  brief: {
    venueId: "manor_orangery",
    styleId: "none",
    guestCount: 80,
    budget: 6000,
    weddingDate: day(60),
    photoIds: [],
  },
  boards: [],
};
test("workspace strips injected URLs, owner fields and unsupported data", () => {
  const d = parseWorkspace({
    ...valid,
    owner_id: "someone",
    brief: {
      ...valid.brief,
      uploadedImages: [{ url: "https://bad.example" }],
      venueName: "A venue",
    },
  });
  assert.equal(d.owner_id, undefined);
  assert.equal(d.brief.uploadedImages, undefined);
  assert.equal(d.brief.venueName, "A venue");
  assert.deepEqual(d.brief.photoIds, []);
});
test("workspace refuses invalid dates, oversized boards and forged photo identifiers", () => {
  for (const d of [
    { ...valid, brief: { ...valid.brief, weddingDate: "2027-02-30" } },
    { ...valid, boards: Array(21).fill({}) },
    { ...valid, brief: { ...valid.brief, photoIds: ["not-a-uuid"] } },
    { ...valid, brief: { ...valid.brief, guestCount: NaN } },
  ])
    assert.throws(() => parseWorkspace(d));
});
test("location calculates symmetric approximate miles and validates UK input", () => {
  const a = { latitude: 51.5, longitude: -0.12 },
    b = { latitude: 52.48, longitude: -1.9 };
  assert.equal(milesBetween(a, a), 0);
  assert.ok(Math.abs(milesBetween(a, b) - milesBetween(b, a)) < 0.001);
  assert.ok(milesBetween(a, b) > 95 && milesBetween(a, b) < 110);
  assert.ok(validPostcode("CM1 1AA"));
  assert.ok(!validPostcode("not a postcode"));
  assert.ok(!validPoint({ latitude: NaN, longitude: 0 }));
  assert.ok(!validPoint({ latitude: 91, longitude: 0 }));
});

test("saved-state fingerprints ignore object key insertion order", () => {
  assert.equal(
    workspaceFingerprint({ a: 1, b: { c: 2, d: 3 } }),
    workspaceFingerprint({ b: { d: 3, c: 2 }, a: 1 }),
  );
});
