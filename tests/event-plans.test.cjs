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
const { parseWorkspace } = load("lib/workspace-input.ts");
const { eventWorkspace, eventBrief, daysToEvent, FIRST_EVENT_ID } =
  load("lib/event-plans.ts");
const brief = {
  venueId: "manor_orangery",
  styleId: "garden_romance",
  guestCount: 80,
  budget: 0,
  weddingDate: "2027-06-01",
  uploadedImages: [],
};
const secondId = "00000000-0000-4000-8000-000000000002";
const photoId = "00000000-0000-4000-8000-000000000003";
const renderId = "00000000-0000-4000-8000-000000000004";
const packed = () =>
  eventWorkspace(
    brief,
    [],
    [],
    FIRST_EVENT_ID,
    [{ itemId: "chairs", quantity: 80 }],
    null,
  );
test("legacy single plans upgrade without losing the original venue, dates or basket", () => {
  const data = packed();
  assert.equal(data.events.length, 1);
  assert.deepEqual(data.events[0].basket, [{ itemId: "chairs", quantity: 80 }]);
  assert.equal(data.events[0].brief.weddingDate, brief.weddingDate);
  assert.equal(data.activeEventId, FIRST_EVENT_ID);
});
test("saving a ceremony changes only that event; reception dates and hire overrides survive", () => {
  const data = packed();
  const reception = {
    ...data.events[0],
    id: secondId,
    name: "Reception",
    basket: [
      {
        itemId: "tables",
        quantity: 8,
        hireDates: { start: "2027-06-02", end: "2027-06-03" },
      },
    ],
  };
  const next = eventWorkspace(
    { ...brief, guestCount: 40 },
    [],
    [data.events[0], reception],
    FIRST_EVENT_ID,
    [{ itemId: "chairs", quantity: 40 }],
    renderId,
  );
  assert.deepEqual(next.events[1], reception);
  assert.equal(next.events[0].basket[0].quantity, 40);
  assert.equal(next.events[0].renderId, renderId);
  assert.equal(data.events[0].basket[0].quantity, 80);
  const parsed = parseWorkspace(next);
  assert.deepEqual(parsed.events[1].basket, reception.basket);
});
test("event photos persist as owned IDs without signed URLs and hydrate safely", () => {
  const data = eventWorkspace(
    {
      ...brief,
      uploadedImages: [{ id: photoId, url: "https://private.test/signed" }],
    },
    [],
    [],
    FIRST_EVENT_ID,
    [],
    "placeholder",
  );
  assert.deepEqual(data.events[0].brief.photoIds, [photoId]);
  assert.equal(data.events[0].renderId, null);
  assert.ok(!JSON.stringify(data).includes("signed"));
  assert.equal(
    eventBrief(data.events[0], { [photoId]: "fresh-url" }).uploadedImages[0]
      .url,
    "fresh-url",
  );
  assert.deepEqual(eventBrief(data.events[0], {}).uploadedImages, []);
});
test("event validation rejects duplicate IDs, foreign formats, excess events and invalid hire dates", () => {
  const valid = packed();
  const event = valid.events[0];
  for (const patch of [
    { events: [event, event] },
    { activeEventId: secondId },
    { events: Array(13).fill(event) },
    { events: [{ ...event, basket: [{ itemId: "chairs", quantity: -1 }] }] },
    {
      events: [{ ...event, brief: { ...event.brief, photoIds: ["invalid"] } }],
    },
    { events: [{ ...event, renderId: "bad" }] },
    {
      events: [
        {
          ...event,
          basket: [
            {
              itemId: "chairs",
              quantity: 3,
              hireDates: { start: "2027-06-03", end: "2027-06-01" },
            },
          ],
        },
      ],
    },
  ])
    assert.throws(() => parseWorkspace({ ...valid, ...patch }));
});
test("countdown follows London calendar dates across midnight and daylight saving", () => {
  assert.equal(daysToEvent("2026-10-25", new Date("2026-10-24T23:30:00Z")), 0);
  assert.equal(daysToEvent("2026-10-26", new Date("2026-10-25T23:30:00Z")), 1);
  assert.equal(daysToEvent("2026-10-25", new Date("2026-10-26T10:00:00Z")), -1);
  assert.equal(daysToEvent("", new Date()), null);
  assert.equal(daysToEvent("2027-02-30", new Date()), null);
});

function weddingRoute(ownedPhotos, ownedRenders) {
  const writes = [];
  const checks = [];
  const client = {
    from(table) {
      let filters = {};
      return {
        select() {
          return this;
        },
        eq(key, value) {
          filters[key] = value;
          return this;
        },
        async in(key, ids) {
          checks.push({ table, filters: { ...filters }, ids });
          return {
            data: ids
              .filter((id) =>
                (table === "venue_photos"
                  ? ownedPhotos
                  : ownedRenders
                ).includes(id),
              )
              .map((id) => ({ id })),
            error: null,
          };
        },
        insert(value) {
          writes.push(value);
          return this;
        },
        update(value) {
          writes.push(value);
          return this;
        },
        async maybeSingle() {
          return { data: { revision: 2 }, error: null };
        },
      };
    },
  };
  const file = path.resolve("app/api/wedding/route.ts"),
    m = new Module(file, module);
  m.paths = module.paths;
  m.require = (id) =>
    id === "next/server"
      ? {
          NextResponse: {
            json: (data, options) =>
              new Response(JSON.stringify(data), options),
          },
        }
      : id === "@/lib/server/session"
        ? {
            requireUser: async () => ({
              ok: true,
              user: { id: "owner" },
              supabase: client,
            }),
          }
        : id === "@/lib/workspace-input"
          ? { parseWorkspace }
          : id === "@/lib/server/photos"
            ? {}
            : require(id);
  m._compile(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    }).outputText,
    file,
  );
  return { put: m.exports.PUT, writes, checks };
}
const request = (data) =>
  new Request("https://styled.test/api/wedding", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ data, revision: 1 }),
  });
test("inactive event photo and render references must belong to the signed-in account", async () => {
  const data = packed();
  data.events.push({
    ...data.events[0],
    id: secondId,
    name: "Reception",
    brief: { ...data.brief, photoIds: [photoId] },
    renderId,
  });
  for (const [photos, renders] of [
    [[], [renderId]],
    [[photoId], []],
  ]) {
    const api = weddingRoute(photos, renders);
    assert.equal((await api.put(request(data))).status, 400);
    assert.equal(api.writes.length, 0);
    assert.ok(api.checks.every((c) => c.filters.owner_id === "owner"));
  }
  const api = weddingRoute([photoId], [renderId]);
  assert.equal((await api.put(request(data))).status, 200);
  assert.equal(api.writes[0].data.events.length, 2);
  assert.ok(api.checks.every((c) => c.filters.owner_id === "owner"));
});
