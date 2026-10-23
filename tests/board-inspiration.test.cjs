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
const {
  prepareBoard,
  pinterestLink,
  parsePhotoSelection,
  inspirationInstruction,
} = load("lib/board-inspiration.ts");
const { loadSelectedPhotoBuffers } = load("lib/server/selected-photos.ts");
const { buildRenderPrompt } = load("lib/server/render-prompt.ts");
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
test("board preparation copies only supported inspiration and bounds references", () => {
  const pins = [
    ...Array.from({ length: 5 }, (_, i) => ({
      id: uuid(i),
      kind: "photo",
      ref: uuid(i + 10),
      text: "photo",
    })),
    { id: uuid(20), kind: "product", ref: "arch", text: "" },
    { id: uuid(21), kind: "look", ref: uuid(40), text: "" },
    { id: uuid(22), kind: "note", text: "Soft flowers" },
    {
      id: uuid(23),
      kind: "note",
      text: "Pinterest: https://www.pinterest.com/example/board/",
    },
  ];
  const board = { id: uuid(99), name: "Ceremony", pins };
  const original = JSON.stringify(board);
  const ready = prepareBoard(board);
  assert.equal(ready.photoIds.length, 3);
  assert.deepEqual(ready.itemIds, ["arch"]);
  assert.equal(ready.notes, "Soft flowers");
  assert.equal(JSON.stringify(board), original);
});
test("Pinterest links refuse unsafe hosts, protocols and credentials", () => {
  assert.equal(
    pinterestLink("https://www.pinterest.com/example/ceremony/?tracking=1#pin"),
    "https://www.pinterest.com/example/ceremony/",
  );
  for (const input of [
    "javascript:alert(1)",
    "https://pinterest.com.evil.test/pin/1/",
    "https://user:pass@pinterest.com/pin/1/",
    "https://example.com/",
    "http://www.pinterest.com/pin/1/",
    "https://www.pinterest.com/",
  ])
    assert.equal(pinterestLink(input), null);
});
test("private image selection refuses URLs, invalid ids and excessive references", () => {
  assert.deepEqual(parsePhotoSelection([uuid(1), uuid(1)]), [uuid(1)]);
  assert.deepEqual(parsePhotoSelection(undefined), []);
  for (const ids of [
    ["https://example.com/photo.jpg"],
    ["not-an-id"],
    [uuid(1), uuid(2), uuid(3), uuid(4)],
    "bad",
  ])
    assert.throws(() => parsePhotoSelection(ids));
});
test("selected private photos enforce ownership and preserve explicit room order", async () => {
  const calls = [];
  const rows = [
    { id: uuid(2), storage_path: "owner/two.jpg", venue_id: "venue2" },
    { id: uuid(1), storage_path: "owner/one.jpg", venue_id: "venue1" },
  ];
  const query = {
    select: () => query,
    eq: (key, value) => {
      calls.push([key, value]);
      return query;
    },
    in: async () => ({ data: rows, error: null }),
  };
  const downloads = [];
  const sb = {
    from: () => query,
    storage: {
      from: () => ({
        download: async (path) => {
          downloads.push(path);
          return {
            data: { arrayBuffer: async () => Buffer.from(path) },
            error: null,
          };
        },
      }),
    },
  };
  const result = await loadSelectedPhotoBuffers(sb, "owner", [
    uuid(1),
    uuid(2),
  ]);
  assert.deepEqual(calls, [["owner_id", "owner"]]);
  assert.deepEqual(downloads, ["owner/one.jpg", "owner/two.jpg"]);
  assert.equal(result.rows[0].venue_id, "venue1");
  query.in = async () => ({ data: [rows[0]], error: null });
  await assert.rejects(() =>
    loadSelectedPhotoBuffers(sb, "owner", [uuid(1), uuid(2)]),
  );
  assert.equal(downloads.length, 2);
});
test("render instructions distinguish venue, catalogue and final mood photos", () => {
  const prompt = buildRenderPrompt({
    style: null,
    brief: "Soft colours",
    guestCount: 80,
    items: [],
    photoCount: 2,
    itemImageCount: 3,
  });
  assert.match(prompt, /Images 3 to 5/);
  assert.match(inspirationInstruction(2), /FINAL 2 images/);
  assert.match(inspirationInstruction(2), /NOT photographs of the venue/);
  assert.match(inspirationInstruction(2), /FIRST image/);
  assert.equal(inspirationInstruction(0), "");
});
