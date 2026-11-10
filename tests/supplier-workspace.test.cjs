const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  Module = require("node:module"),
  ts = require("typescript");
function load(file, mocks = {}) {
  const f = path.resolve(file),
    m = new Module(f, module);
  m.paths = module.paths;
  m.require = (id) => (Object.hasOwn(mocks, id) ? mocks[id] : require(id));
  m._compile(
    ts.transpileModule(fs.readFileSync(f, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    f,
  );
  return m.exports;
}
const categories = load("lib/vendor-categories.ts"),
  options = load("lib/product-options.ts"),
  styles = load("lib/styles.ts");
const lib = load("lib/supplier-workspace.ts", {
    "./vendor-categories": categories,
    "./product-options": options,
    "./styles": styles,
  }),
  body = load("lib/server/supplier-body.ts");
const draft = {
  ...lib.EMPTY_PRODUCT,
  name: "Oak chairs",
  unitPrice: "12.50",
  capacity: "120",
  leadTimeDays: "20",
  details: { ...lib.EMPTY_PRODUCT_DETAILS, dimensions: "90 cm high" },
};
const request = (data, origin = "https://styled.test") =>
  new Request("https://styled.test/api/vendor/products", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(data),
  });
test("supplier prices preserve pennies and reject ambiguous or coerced values", () => {
  assert.equal(lib.money("12.50"), 1250);
  for (const bad of ["", null, {}, "0x20", "1e3", "-1", "1.123", "1000001"])
    assert.equal(lib.money(bad), null);
});
test("supplier services strip extra fields, reject invalid policies and keep unset amounts blank", () => {
  const s = { ...lib.EMPTY_SERVICES, coverage: "Essex", delivery: true };
  assert.deepEqual(
    lib.servicesInput({ ...s, commission_rate: 0, user_id: "forged" }),
    s,
  );
  for (const bad of [
    { ...s, depositPercent: "101" },
    { ...s, minimumOrder: "-20" },
    { ...s, balanceDays: "366" },
    { ...s, delivery: "yes" },
    { ...s, coverage: "x".repeat(301) },
  ])
    assert.equal(lib.servicesInput(bad), null);
});
test("supplier product validation bounds details, prices, stock, category and style without accepting owner fields", () => {
  const p = lib.productInput({ ...draft, supplier_id: "forged", active: true });
  assert.equal(p.unit_price_pence, 1250);
  assert.equal(p.capacity, 120);
  assert.equal(p.supplier_id, undefined);
  assert.equal(p.active, undefined);
  assert.equal(p.details.dimensions, "90 cm high");
  for (const d of [
    { ...draft, capacity: "-1" },
    { ...draft, category: "bad" },
    { ...draft, styles: ["not-a-style"] },
    { ...draft, unitPrice: "" },
    { ...draft, details: { ...draft.details, damageTerms: "x".repeat(1501) } },
  ])
    assert.equal(lib.productInput(d), null);
});
test("supplier forms reject cross-site, arrays and oversized streamed JSON bodies", async () => {
  await assert.rejects(() =>
    body.supplierJson(request(draft, "https://attacker.test")),
  );
  await assert.rejects(() => body.supplierJson(request([])));
  await assert.rejects(() =>
    body.supplierJson(request({ x: "x".repeat(21000) })),
  );
  assert.equal((await body.supplierJson(request(draft))).name, draft.name);
});
const json = {
  NextResponse: { json: (d, o) => new Response(JSON.stringify(d), o) },
};
function createRoute(authenticated = true) {
  const calls = [];
  const admin = {
    rpc: async () => ({ data: true, error: null }),
    from: (table) => ({
      upsert: async (data, opts) => {
        calls.push({ table, data, opts });
        return { error: null };
      },
    }),
  };
  const m = load("app/api/vendor/products/route.ts", {
    "next/server": json,
    "@/lib/server/vendor": {
      requireVendor: async () =>
        authenticated
          ? {
              ok: true,
              user: { id: "own-user" },
              supplierId: "own-supplier",
              admin,
            }
          : { ok: false, response: new Response("", { status: 401 }) },
    },
    "@/lib/server/availability": {},
    "@/lib/server/look": {},
    "@/lib/supplier-workspace": lib,
    "@/lib/server/supplier-body": body,
  });
  return { ...m, calls };
}
test("new products are hidden, owned by the authenticated supplier and use stable deduplicated IDs", async () => {
  const r = createRoute();
  const d = {
    ...draft,
    clientId: "11111111-1111-4111-8111-111111111111",
    supplierId: "forged",
    active: true,
  };
  for (let i = 0; i < 2; i++) {
    const res = await r.POST(request(d));
    assert.equal(res.status, 200);
  }
  assert.equal(r.calls[0].data.supplier_id, "own-supplier");
  assert.equal(r.calls[0].data.active, false);
  assert.equal(r.calls[0].data.id, r.calls[1].data.id);
  assert.deepEqual(r.calls[0].opts, {
    onConflict: "id",
    ignoreDuplicates: true,
  });
  assert.equal((await createRoute(false).POST(request(d))).status, 401);
});
test("product creation does not write on invalid prices, missing retry IDs or cross-site requests", async () => {
  for (const d of [
    draft,
    { ...draft, clientId: "bad" },
    {
      ...draft,
      unitPrice: "-1",
      clientId: "11111111-1111-4111-8111-111111111111",
    },
  ]) {
    const r = createRoute();
    assert.equal((await r.POST(request(d))).status, 422);
    assert.equal(r.calls.length, 0);
  }
  const r = createRoute();
  assert.equal((await r.POST(request(draft, "https://bad.test"))).status, 403);
  assert.equal(r.calls.length, 0);
});
test("full product edits scope both supplier and revision and refuse stale saves", async () => {
  const scopes = [];
  let updated;
  const query = {
    eq: (k, v) => {
      scopes.push([k, v]);
      return query;
    },
    select: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
  };
  const m = load("app/api/vendor/products/[id]/route.ts", {
    "next/server": json,
    "@/lib/server/vendor": {
      requireVendor: async () => ({
        ok: true,
        supplierId: "own-supplier",
        admin: {
          from: () => ({
            update: (p) => {
              updated = p;
              return query;
            },
          }),
        },
      }),
    },
    "@/lib/supplier-workspace": lib,
    "@/lib/server/supplier-body": body,
  });
  const res = await m.PATCH(
    request({
      product: { ...draft, supplier_id: "forged" },
      updatedAt: "2026-01-01T00:00:00Z",
    }),
    { params: Promise.resolve({ id: "own-product" }) },
  );
  assert.equal(res.status, 409);
  assert.deepEqual(scopes, [
    ["id", "own-product"],
    ["supplier_id", "own-supplier"],
    ["updated_at", "2026-01-01T00:00:00Z"],
  ]);
  assert.equal(updated.supplier_id, undefined);
});
test('supplier form origin checks use the public host behind the app server',async()=>{const req=new Request('http://localhost:3011/api/vendor/products',{method:'POST',headers:{origin:'http://127.0.0.1:3011',host:'127.0.0.1:3011','content-type':'application/json'},body:JSON.stringify(draft)});assert.equal((await body.supplierJson(req)).name,draft.name);});
test('supplier line decisions require a reason for declines and cannot include another supplier line',async()=>{
 const workflow=load('lib/server/order-workflow.ts');const writes=[];
 const auth={ok:true,supplierId:'own-supplier',actor:{id:'own-user',label:'Test'},admin:{from:table=>{let update=false;const q={select:()=>q,eq:()=>q,in:()=>q,maybeSingle:async()=>({data:{id:'11111111-1111-4111-8111-111111111111',status:'requested'}}),update:p=>{update=true;writes.push(p);return q;},then:resolve=>resolve(update?{error:null}:{data:[{id:'22222222-2222-4222-8222-222222222222',product_name:'Own chair'}],error:null})};return q;}}};
 const m=load('app/api/vendor/orders/[id]/lines/route.ts',{'next/server':json,'@/lib/server/vendor':{requireVendor:async()=>auth},'@/lib/server/staff':{logOrderEvent:async()=>{}},'@/lib/server/admin-orders':{UUID:/^[a-f0-9-]{36}$/i,cleanText:v=>typeof v==='string'?v.trim():undefined},'@/lib/server/order-workflow':workflow});
 const params={params:Promise.resolve({id:'11111111-1111-4111-8111-111111111111'})};
 assert.equal((await m.PATCH(request({lineIds:['22222222-2222-4222-8222-222222222222'],supplierStatus:'declined'}),params)).status,422);
 assert.equal((await m.PATCH(request({lineIds:['22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333'],supplierStatus:'confirmed'}),params)).status,404);
 assert.equal(writes.length,0);
 assert.equal((await m.PATCH(request({lineIds:['22222222-2222-4222-8222-222222222222'],supplierStatus:'declined',note:'Not available; please suggest another date.'}),params)).status,200);
 assert.equal(writes.length,1);assert.equal(writes[0].supplier_status,'declined');
});
