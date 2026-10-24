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
const { productsForLook } = load("lib/look-products.ts");
const chair = {id:"chair", slot:"chairs", styles:["garden_romance"]};
const otherChair = {id:"other-chair", slot:"chairs", styles:["garden_romance"]};
const linen = {id:"linen", slot:"tables_linen", styles:["garden_romance"]};
const modern = {id:"modern", slot:"lighting", styles:["modern_minimal"]};
const catalogue = [chair, otherChair, linen, modern];
const resolve = (extra = {}) => productsForLook({catalogue, itemIds:[], illustrative:false, ...extra});
test("demo looks show style matches, one per visual slot, explicitly as suggestions", () => {
  const result = resolve({illustrative:true, styleId:"garden_romance"});
  assert.equal(result.suggested, true);
  assert.deepEqual(result.items, [chair, linen]);
  assert.deepEqual(resolve({illustrative:true, styleId:"unknown"}).items, []);
});
test("real renders never invent matches when references are missing", () => {
  assert.deepEqual(resolve({styleId:"garden_romance"}).items, []);
  assert.equal(resolve().suggested, false);
});
test("recorded references survive missing itemIds using the render report", () => {
  const result = resolve({report:{items:[{id:"linen"}, {id:"chair"}]}});
  assert.deepEqual(result.items, [linen, chair]);
});
test("version references are deduplicated and withdrawn pieces stay unpurchasable", () => {
  const result = resolve({itemIds:["chair", "chair", "withdrawn"], report:{items:[{id:"chair"}]}});
  assert.deepEqual(result.items, [chair]);
  assert.equal(result.missing, 1);
  assert.deepEqual(resolve({itemIds:["modern"]}).items, [modern]);
});
