const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
function load(relative, mocks = {}) {
  const file = path.resolve(relative);
  const m = new Module(file, module);
  m.paths = module.paths;
  m.require = (id) => {
    if (id in mocks) return mocks[id];
    if (id.startsWith("@/")) return load(id.slice(2) + ".ts", mocks);
    if (id.startsWith("."))
      return load(
        path.relative(process.cwd(), path.resolve(path.dirname(file), id)) +
          ".ts",
        mocks,
      );
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
const { supplierReadiness } = load("lib/vendor-readiness.ts");
const { calendarHealth, CALENDAR_STALE_MS } = load("lib/calendar-health.ts");
const { buildStaffAttention, SUPPLIER_REPLY_OVERDUE_MS } = load(
  "lib/staff-attention.ts",
);
const now = Date.parse("2026-10-23T12:00:00Z");
const iso = (ms) => new Date(ms).toISOString();
const empty = () => ({
  applications: [],
  drafts: [],
  replies: [],
  calendars: [],
});

test("completed setup never implies publication; only public live count enables profile", () => {
  const input = {
    logoUrl: "logo",
    availabilityReviewedAt: iso(now),
    total: 5,
    draft: 5,
    live: 0,
    supplierId: "supplier",
  };
  const hidden = supplierReadiness(input);
  assert.equal(hidden.completed, 3);
  assert.equal(hidden.publicProfileHref, null);
  assert.equal(hidden.draft, 5);
  assert.equal(
    supplierReadiness({ ...input, draft: 3, live: 2 }).publicProfileHref,
    "/suppliers/supplier",
  );
  assert.equal(
    supplierReadiness({ ...input, logoUrl: null, total: 0 }).completed,
    1,
  );
});

test("calendar freshness handles disconnection, missing/invalid/future times and exact stale boundary", () => {
  assert.equal(calendarHealth(false, iso(now), now), "disconnected");
  for (const value of [null, "invalid", iso(now + 1)])
    assert.equal(calendarHealth(true, value, now), "never_synced");
  assert.equal(
    calendarHealth(true, iso(now - CALENDAR_STALE_MS + 1), now),
    "current",
  );
  assert.equal(
    calendarHealth(true, iso(now - CALENDAR_STALE_MS), now),
    "stale",
  );
});

test("attention distinguishes draft owner work from submitted review and excludes resolved applications", () => {
  const source = empty();
  source.applications = ["new", "reviewing", "accepted", "declined"].map(
    (status) => ({
      id: status,
      business_name: status,
      status,
      created_at: iso(now),
    }),
  );
  source.drafts = ["draft", "submitted"].map((status) => ({
    venue_id: status,
    status,
    updated_at: iso(now),
    venue_listings: { name: "Venue" },
  }));
  const items = buildStaffAttention(source, now);
  assert.equal(items.length, 4);
  assert.equal(
    items.find((i) => i.id === "venue:draft").nextActor,
    "Venue owner",
  );
  assert.equal(
    items.find((i) => i.id === "venue:submitted").nextActor,
    "Styled staff",
  );
});

test("overdue replies group by supplier/order, respect request state and 48-hour boundary", () => {
  const source = empty();
  const line = {
    id: "1",
    order_id: "order",
    supplier_id: "supplier",
    supplier_name: "Supplier",
    supplier_status: "pending",
    created_at: iso(now - SUPPLIER_REPLY_OVERDUE_MS),
    orders: { reference: "STY-1", status: "requested", updated_at: iso(now) },
  };
  source.replies = [
    line,
    { ...line, id: "2" },
    { ...line, supplier_status: "confirmed" },
    { ...line, created_at: iso(now - SUPPLIER_REPLY_OVERDUE_MS + 1) },
    ...["cancelled", "declined", "confirmed", "deposit_paid"].map((status) => ({
      ...line,
      orders: { ...line.orders, status },
    })),
  ];
  const items = buildStaffAttention(source, now);
  assert.equal(items.length, 1);
  assert.match(items[0].detail, /^2 pending items/);
  assert.equal(items[0].href, "/admin/orders/order");
});

test("calendar queue covers active stale/never synced feeds without disclosing feed secrets", () => {
  const source = empty();
  const supplier = {
    id: "supplier",
    name: "Supplier",
    active: true,
    ical_url: "https://private-feed.example/secret",
    ical_synced_at: null,
  };
  source.calendars = [
    supplier,
    { ...supplier, id: "old", ical_synced_at: iso(now - CALENDAR_STALE_MS) },
    { ...supplier, id: "fresh", ical_synced_at: iso(now) },
    { ...supplier, active: false },
    { ...supplier, ical_url: null },
  ];
  const items = buildStaffAttention(source, now);
  assert.equal(items.length, 2);
  assert.equal(items[0].timestamp, null);
  assert.doesNotMatch(JSON.stringify(items), /private-feed|secret|ical_url/);
  assert.deepEqual(buildStaffAttention(empty(), now), []);
});

function queryMock(result, calls) {
  return new Proxy(
    {},
    {
      get: (_, method) =>
        method === "then"
          ? (resolve) => Promise.resolve(result).then(resolve)
          : (...args) => {
              calls.push([method, ...args]);
              return queryMock(result, calls);
            },
    },
  );
}
test("attention loader uses only reads, reports truncation, and fails closed on query errors", async () => {
  const { loadStaffAttention } = load("lib/server/staff-attention.ts");
  const calls = [];
  const admin = {
    from: (table) => {
      calls.push(["from", table]);
      return queryMock(
        {
          data:
            table === "vendor_applications"
              ? Array.from({ length: 101 }, (_, n) => ({
                  id: String(n),
                  business_name: "Business",
                  status: "new",
                  created_at: iso(now),
                }))
              : [],
          error: null,
        },
        calls,
      );
    },
  };
  const result = await loadStaffAttention(admin, now);
  assert.equal(result.items.length, 100);
  assert.deepEqual(result.truncatedSources, ["applications"]);
  assert.equal(result.checkedAt, iso(now));
  assert.equal(calls.filter((c) => c[0] === "limit").length, 6);
  assert.ok(
    calls.every((c) =>
      [
        "from",
        "select",
        "in",
        "order",
        "limit",
        "eq",
        "lte",
        "not",
        "or",
      ].includes(c[0]),
    ),
  );
  await assert.rejects(
    loadStaffAttention(
      {
        from: () =>
          queryMock({ data: null, error: { message: "unavailable" } }, []),
      },
      now,
    ),
    /Could not load/,
  );
});

test("staff attention route gates reads and uses private uncached responses", async () => {
  let reads = 0;
  let authorized = false;
  const route = load("app/api/admin/attention/route.ts", {
    "next/server": {
      NextResponse: { json: (body, options) => ({ body, ...options }) },
    },
    "@/lib/server/staff": {
      requireStaff: async () =>
        authorized
          ? { ok: true, admin: {} }
          : { ok: false, response: { status: 403 } },
    },
    "@/lib/server/staff-attention": {
      loadStaffAttention: async () => {
        reads++;
        return { items: [] };
      },
    },
  });
  assert.equal((await route.GET({})).status, 403);
  assert.equal(reads, 0);
  authorized = true;
  const response = await route.GET({});
  assert.equal(reads, 1);
  assert.equal(response.headers["Cache-Control"], "private, no-store");
  assert.deepEqual(Object.keys(route).sort(), ["GET", "dynamic"]);
});

test("profile counts remain vendor scoped and public visibility is checked through the anon client", async () => {
  const adminCalls = [],
    publicCalls = [];
  const route = load("app/api/vendor/profile/route.ts", {
    "next/server": {
      NextResponse: { json: (body, options) => ({ body, ...options }) },
    },
    "@/lib/server/vendor": {
      requireVendor: async () => ({
        ok: true,
        supplierId: "own-supplier",
        admin: {
          from: (table) =>
            queryMock(
              table === "suppliers"
                ? {
                    data: {
                      active: true,
                      logo_url: "logo",
                      onboarding_availability_confirmed_at: iso(now),
                    },
                  }
                : { count: 4 },
              adminCalls,
            ),
        },
      }),
    },
    "@/lib/supabase/anon": {
      createAnonClient: () => ({
        from: () => queryMock({ count: 0 }, publicCalls),
      }),
    },
  });
  const response = await route.GET({});
  assert.equal(response.body.readiness.total, 4);
  assert.equal(response.body.readiness.publicProfileHref, null);
  assert.ok(
    publicCalls.some(
      (c) => c[0] === "select" && c[1].includes("suppliers!inner"),
    ),
  );
  assert.ok(
    publicCalls.some(
      (c) => c[0] === "eq" && c[1] === "supplier_id" && c[2] === "own-supplier",
    ),
  );
  assert.equal(
    adminCalls.filter((c) => c[0] === "eq" && c[2] === "own-supplier").length,
    3,
  );
});

test("calendar sync never stamps success after block-read, removal, or timestamp-write failures", async () => {
  const { syncSupplierCalendar } = load("lib/server/ical.ts", {
    "@/lib/availability": { todayUtc: () => "2026-10-23" },
  });
  const original = global.fetch;
  global.fetch = async () => ({
    ok: true,
    arrayBuffer: async () =>
      new TextEncoder().encode("BEGIN:VCALENDAR\nEND:VCALENDAR").buffer,
  });
  try {
    for (const failure of ["read", "delete", "stamp", null]) {
      const calls = [];
      const admin = {
        from: (table) => {
          if (table === "suppliers")
            return queryMock({ error: failure === "stamp" ? {} : null }, calls);
          let operation = "read";
          const builder = new Proxy(
            {},
            {
              get: (_, method) => {
                if (method === "then")
                  return (resolve) =>
                    Promise.resolve({
                      data:
                        operation === "read"
                          ? [
                              { id: "old", day: "2026-10-24", source: "ical" },
                              {
                                id: "manual",
                                day: "2026-10-25",
                                source: "manual",
                              },
                            ]
                          : null,
                      error: failure === operation ? {} : null,
                    }).then(resolve);
                return (...args) => {
                  if (method === "delete") operation = "delete";
                  calls.push([method, ...args]);
                  return builder;
                };
              },
            },
          );
          return builder;
        },
      };
      const result = await syncSupplierCalendar(
        admin,
        "supplier",
        "https://feed.example/calendar.ics",
      );
      assert.equal(result.ok, failure === null);
      if (["read", "delete"].includes(failure))
        assert.ok(!calls.some((c) => c[0] === "update"));
      if (failure !== "read") {
        assert.ok(
          calls.some(
            (c) => c[0] === "eq" && c[1] === "source" && c[2] === "ical",
          ),
        );
        assert.deepEqual(calls.find((c) => c[0] === "in")[2], ["old"]);
      }
    }
  } finally {
    global.fetch = original;
  }
});

test("customer questions show the latest activity and next actor without message bodies", () => {
  const source = empty();
  const base = {
    id: "r1",
    venue_id: "venue",
    request_kind: "viewing",
    status: "contacted",
    next_actor: "venue",
    created_at: iso(now - 10000),
    venue_listings: { name: "Orchard" },
    venue_request_messages: [{ created_at: iso(now) }],
  };
  source.questions = [
    base,
    { ...base, id: "cancelled", status: "cancelled" },
    { ...base, id: "waiting", next_actor: "customer" },
  ];
  const items = buildStaffAttention(source, now);
  assert.equal(items.length, 1);
  assert.equal(items[0].timestamp, iso(now));
  assert.equal(items[0].kind, "venue_request");
  assert.match(items[0].detail, /viewing/);
  assert.equal(items[0].href, "/admin/venues/venue/enquiries");
  assert.doesNotMatch(JSON.stringify(items), /body|email|owner_user_id/);
});
