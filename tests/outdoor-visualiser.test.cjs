const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  path = require("node:path"),
  Module = require("node:module"),
  ts = require("typescript");
function load(file, stubs = {}, cache = new Map()) {
  const f = path.resolve(file);
  if (cache.has(f)) return cache.get(f).exports;
  const m = new Module(f, module);
  cache.set(f, m);
  m.paths = module.paths;
  m.require = (id) => {
    if (Object.hasOwn(stubs, id)) return stubs[id];
    if (id.startsWith("@/") || id.startsWith(".")) {
      const b = id.startsWith("@/")
        ? path.resolve(id.slice(2))
        : path.resolve(path.dirname(f), id);
      return b.endsWith(".json")
        ? JSON.parse(fs.readFileSync(b))
        : load(b + (fs.existsSync(b + ".tsx") ? ".tsx" : ".ts"), stubs, cache);
    }
    return require(id);
  };
  m._compile(
    ts.transpileModule(fs.readFileSync(f, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    }).outputText,
    f,
  );
  return m.exports;
}
const tentId = "earth-village-stretch-tent-10x15",
  bigId = "earth-village-stretch-tent-20x15";
test("environment and fabric selection persist with each event and reject invalid values", () => {
  const { parsePreviewSelection, togglePreviewItem } =
    load("lib/event-plans.ts");
  const raw = {
    mode: "manual",
    itemIds: [tentId],
    environment: "outdoor",
    tentColour: "sand",
  };
  assert.deepEqual(parsePreviewSelection(raw), raw);
  assert.equal(togglePreviewItem(raw, "other").environment, "outdoor");
  assert.throws(() =>
    parsePreviewSelection({ ...raw, environment: "made-up" }),
  );
  assert.throws(() => parsePreviewSelection({ ...raw, tentColour: "pink" }));
  assert.deepEqual(parsePreviewSelection({ mode: "manual", itemIds: [] }), {
    mode: "manual",
    itemIds: [],
  });
});
test("outdoor prompts preserve the site, distinguish package dimensions and never request a furnished reception", () => {
  const { buildOutdoorPrompt, outdoorSceneError } = load(
    "lib/outdoor-prompt.ts",
  );
  const tents = load("lib/earth-village-catalogue.ts")
    .earthVillageCatalogue()
    .filter((p) => p.category === "tents");
  for (const tent of tents) {
    const prompt = buildOutdoorPrompt({
      environment: "outdoor",
      setting: "reception",
      items: [tent],
      tent,
      colour: "sand",
      brief: "Keep the hedge",
      photoCount: 1,
      referenceNames: [tent.name],
      refining: false,
    });
    assert.match(prompt, /same site and viewpoint/);
    assert.match(prompt, /Do not add reception tables, chairs/);
    assert.match(prompt, new RegExp(tent.id));
    assert.match(prompt, /cannot prove exact scale/);
    assert.match(prompt, /Image 2:/);
    assert.match(prompt, tent.id === tentId ? /15 × 20/ : /25 × 20/);
  }
});
test("scene guard refuses rooms and outside views for tent interiors", () => {
  const { outdoorSceneError } = load("lib/outdoor-prompt.ts");
  assert.equal(outdoorSceneError("outdoor", "outdoor_open"), null);
  assert.equal(outdoorSceneError("outdoor", "outdoor_tent"), null);
  assert.ok(outdoorSceneError("outdoor", "indoor"));
  assert.ok(outdoorSceneError("outdoor", "tent_interior"));
  assert.ok(outdoorSceneError("tent-interior", "outdoor_open"));
  assert.equal(outdoorSceneError("tent-interior", "tent_interior"), null);
});
test("tent names resolve by explicit dimensions rather than guest counts or style", () => {
  const { namedProducts } = load("lib/product-matching.ts");
  const items = load("lib/earth-village-catalogue.ts")
    .earthVillageCatalogue()
    .filter((p) => p.category === "tents");
  for (const brief of ["10 x 15 m", "10 by 15 m", "10 × 15 m"])
    assert.equal(namedProducts(brief, items).items[0].id, tentId);
  assert.equal(namedProducts("20 x 15 m", items).items[0].id, bigId);
  assert.deepEqual(namedProducts("a tent for 150 guests", items).items, []);
});
function harness(change = {}) {
  const callbacks = [],
    rows = [],
    jobs = [],
    classifications = [],
    compositions = [];
  let rateCalls = 0;
  const base = {
    images: [Buffer.from("site")],
    width: 1536,
    height: 1024,
    dbVenueId: null,
    photoIds: [],
  };
  const report = {
    date: null,
    checked: false,
    guestCount: 80,
    items: [],
    excluded: [],
    leftPlain: [],
    supplierId: null,
    venueSlug: null,
  };
  const admin = {
    rpc: async () => ({ data: change.rateBlocked ? false : true, error: null }),
    from: () => ({
      insert: async (row) => {
        rows.push(row);
        return { error: change.saveError ? { code: "23505" } : null };
      },
    }),
  };
  const q = {
    select: () => q,
    order: () => q,
    limit: () => q,
    maybeSingle: async () => ({ data: { id: "brief" }, error: null }),
  };
  const stubs = {
    "next/server": {
      NextResponse: { json: (data, opts) => Response.json(data, opts) },
      after: (fn) => callbacks.push(fn),
    },
    "@/lib/server/development-request-catalogue": {
      developmentRequestsAllowed: () => change.allowed !== false,
    },
    "@/lib/supabase/admin": { createAdminClient: () => admin },
    "@/lib/server/env": {
      env: {
        openaiApiKeyIfSet: change.noKey ? undefined : "fixture-only",
        imageModel: "fixture-model",
        maxRefinements: 6,
      },
    },
    "@/lib/server/limits": {
      clientIpHash: () => "fixture-ip",
      checkRenderLimits: async () =>
        change.quotaBlocked ? { status: 429, error: "Quota reached" } : null,
    },
    "@/lib/server/render-source": {
      loadSampleVenue: async () => base,
      loadUploadedPhotos: async () => ({
        ...base,
        dbVenueId: "own-venue",
        photoIds: ["own-photo"],
      }),
      loadParentRender: async () => change.parent || null,
    },
    "@/lib/server/look": {
      composeOrderableLook: async (opts) => {
        compositions.push(opts);
        return { items: [], report: { ...report, items: [] } };
      },
    },
    "@/lib/server/alex-tent-references": {
      loadAlexTentReferences: async () => {
        if (change.missingReference) throw Error("missing");
        return {
          buffers: [Buffer.from("tent")],
          names: ["selected tent"],
          source: "Supplier package document",
        };
      },
    },
    "@/lib/server/product-references": {
      loadProductReferences: async () => ({ buffers: [], names: [] }),
    },
    "@/lib/server/outdoor-vision": {
      classifyOutdoorSource: async (image) => {
        classifications.push(image);
        return change.scene || "outdoor_open";
      },
    },
    "@/lib/server/image-model": { sizeFor: () => "1536x1024" },
    "@/lib/server/render-job": {
      runRenderJob: async (opts) => jobs.push(opts),
    },
  };
  const module = load("lib/server/outdoor-render.ts", stubs);
  const opts = {
    req: new Request("https://styledukprodprogress.vercel.app/api/generate"),
    user: { id: "owner" },
    supabase: { from: () => q },
    body: {
      environment: "outdoor",
      tentColour: "sand",
      venueId: "outdoor_garden",
    },
    itemIds: [tentId],
    selectionMode: "manual",
    brief: "",
    styleId: "garden_romance",
    setting: "reception",
    guestCount: 80,
    weddingDate: null,
    deliveryDate: null,
    photoIds: [],
    inspirationPhotoIds: [],
    supplierId: null,
  };
  return {
    run: (patch) => module.startOutdoorRender({ ...opts, ...patch }),
    rows,
    jobs,
    callbacks,
    classifications,
    compositions,
    base,
    report,
  };
}
test("outdoor generation sends actual site/reference bytes and saves stable IDs, source, dimensions and request-only status", async () => {
  const h = harness();
  const response = await h.run();
  assert.equal(response.status, 202, await response.clone().text());
  assert.equal(h.jobs.length, 0);
  assert.equal(h.rows.length, 1);
  const row = h.rows[0];
  assert.deepEqual(row.item_ids, [tentId]);
  assert.equal(row.look_report.environment, "outdoor");
  assert.equal(row.look_report.structureId, tentId);
  assert.equal(row.look_report.tentColour, "sand");
  assert.equal(row.look_report.checked, false);
  assert.equal(row.look_report.items[0].basis, "request");
  assert.match(row.prompt, /10 × 15/);
  assert.equal(row.look_report.referenceAudit[0].imageCount, 1);
  await h.callbacks[0]();
  assert.deepEqual(
    h.jobs[0].images.map((b) => b.toString()),
    ["site", "tent"],
  );
  assert.equal(h.jobs[0].quality, "high");
  assert.deepEqual(h.compositions[0].chosenIds, []);
});
test("invalid scenes, quota, permission boundaries, missing references and duplicate running jobs never start image generation", async () => {
  for (const [change, patch, status] of [
    [{ scene: "indoor" }, {}, 422],
    [{ quotaBlocked: true }, {}, 429],
    [{ noKey: true }, {}, 503],
    [{ allowed: false }, {}, 422],
    [{ missingReference: true }, {}, 422],
    [{ rateBlocked: true }, {}, 429],
    [{ saveError: true }, {}, 409],
    [{}, { supplierId: "11111111-1111-4111-8111-111111111111" }, 422],
    [
      {},
      { body: { environment: "outdoor", venueId: "listing:restricted" } },
      422,
    ],
    [{}, { itemIds: [tentId, bigId] }, 422],
    [{}, { itemIds: ["earth-village-furniture-75"] }, 422],
    [{}, { body: { environment: "indoor", venueId: "oak_barn" } }, 422],
  ]) {
    const h = harness(change);
    const r = await h.run(patch);
    assert.equal(r.status, status, await r.clone().text());
    assert.equal(h.callbacks.length, 0);
    assert.equal(h.jobs.length, 0);
  }
});
test("refinements inherit original source photos and keep the selected model without another classification call", async () => {
  const base = {
    images: [Buffer.from("previous preview")],
    width: 1536,
    height: 1024,
    dbVenueId: null,
    photoIds: [],
  };
  const parent = {
    id: "parent",
    briefId: "brief",
    depth: 1,
    styleId: "garden_romance",
    sampleVenueId: null,
    base,
    lookReport: {
      environment: "outdoor",
      tentColour: "sand",
      sourceScene: "outdoor_open",
      sourcePhotoIds: ["original-own-photo"],
      structureId: tentId,
      items: [],
      supplierId: null,
      venueSlug: null,
    },
  };
  const h = harness({ parent });
  const r = await h.run({
    body: { environment: "outdoor", parentRenderId: "parent" },
    selectionMode: "auto",
    itemIds: [],
  });
  assert.equal(r.status, 202, await r.clone().text());
  assert.equal(h.classifications.length, 0);
  assert.equal(h.rows[0].look_report.structureId, tentId);
  assert.equal(h.rows[0].look_report.tentColour, "sand");
  assert.deepEqual(h.rows[0].input_photo_ids, ["original-own-photo"]);
  assert.equal(h.rows[0].depth, 2);
  await h.callbacks[0]();
  assert.deepEqual(
    h.jobs[0].images.map((b) => b.toString()),
    ["previous preview", "tent"],
  );
});
test("tent changes are explicit, and conflicting descriptions cannot silently swap size", async () => {
  const h = harness();
  assert.equal((await h.run({ brief: "Use the 20 x 15 m" })).status, 422);
  assert.equal(h.callbacks.length, 0);
  const fresh = harness();
  const r = await fresh.run({ itemIds: [bigId], brief: "Use the 20 x 15 m" });
  assert.equal(r.status, 202);
  assert.equal(fresh.rows[0].look_report.structureId, bigId);
});

test('vision preflight sends bounded image bytes and treats provider/malformed replies as unavailable',async()=>{
 const image=fs.readFileSync('public/img/venues/outdoor_garden.jpg');const old=global.fetch;let sent;
 const vision=load('lib/server/outdoor-vision.ts',{'@/lib/server/env':{env:{openaiBaseUrl:'https://api.openai.com',openaiApiKey:'fixture-only',textModel:'fixture-vision'}}});
 try{global.fetch=async(_url,opts)=>{sent=JSON.parse(opts.body);return Response.json({choices:[{message:{content:'{"scene":"outdoor_open"}'}}]});};assert.equal(await vision.classifyOutdoorSource(image),'outdoor_open');assert.equal(sent.model,'gpt-4o-mini');assert.match(sent.messages[1].content[0].image_url.url,/^data:image\/jpeg;base64,/);assert.equal(sent.messages[1].content[0].image_url.detail,'low');
 for(const response of [new Response('private provider diagnostic',{status:403}),Response.json({choices:[{message:{content:'not JSON'}}]}),Response.json({choices:[{message:{content:'{"scene":"certified_safe_fit"}'}}]})]){global.fetch=async()=>response;await assert.rejects(vision.classifyOutdoorSource(image),/unavailable|could not be checked/);}
 }finally{global.fetch=old;}
});
test('public generate route routes outdoor input through the isolated owner-bound flow and rejects invalid environments',async()=>{
 let received;
 const stubs={
 'next/server':{NextResponse:{json:(data,opts)=>Response.json(data,opts)},after:()=>{}},
 '@/lib/server/session':{requireUser:async()=>({ok:true,user:{id:'current-owner'},supabase:{fixture:'owner-session'}})},
 '@/lib/server/outdoor-render':{startOutdoorRender:async opts=>{received=opts;return Response.json({ok:true},{status:202});}},
 '@/lib/server/crescent-moon-references':{},'@/lib/server/public-images':{},'@/lib/server/render-source':{},'@/lib/server/render-job':{},'@/lib/server/image-model':{},'@/lib/server/limits':{},'@/lib/server/look':{usableDate:()=>null},'@/lib/supabase/admin':{},
 };
 const route=load('app/api/generate/route.ts',stubs),request=environment=>new Request('https://styledukprodprogress.vercel.app/api/generate',{method:'POST',body:JSON.stringify({environment,itemIds:[tentId],selectionMode:'manual',venueId:'outdoor_garden'})});
 assert.equal((await route.POST(request('outdoor'))).status,202);assert.equal(received.user.id,'current-owner');assert.deepEqual(received.itemIds,[tentId]);assert.equal(received.body.environment,'outdoor');received=null;assert.equal((await route.POST(request('anything'))).status,400);assert.equal(received,null);
});
test('an unlisted explicitly requested tent size cannot silently render the selected smaller package',async()=>{const h=harness();assert.equal((await h.run({brief:'Use a 30 x 15 m stretch tent'})).status,422);assert.equal(h.callbacks.length,0);const {unknownTentSize}=load('lib/visualiser-environment.ts');assert.equal(unknownTentSize('Choose 30 x 15 m'),true);assert.equal(unknownTentSize('Use 30 x 15 m lawn'),false);assert.equal(unknownTentSize('Use 10 x 15 m'),false);assert.equal(unknownTentSize('Do not use 30 x 15 m but use 10 x 15 m'),false);});

test('the full supplier package names keep their explicit dimensions without an ambiguous-family error',()=>{const {namedProducts}=load('lib/product-matching.ts');const tents=load('lib/earth-village-catalogue.ts').earthVillageCatalogue().filter(p=>p.category==='tents');for(const tent of tents)assert.deepEqual(namedProducts('Use the '+tent.name,tents).items.map(p=>p.id),[tent.id]);});


test('provider diagnostics expose scope names without provider messages or credentials', async () => {
 const oldFetch=global.fetch, oldLog=console.error, logs=[];
 const vision=load('lib/server/outdoor-vision.ts',{'@/lib/server/env':{env:{openaiBaseUrl:'https://api.openai.com',openaiApiKey:'fixture-private-key'}}});
 try {
  console.error=(...args)=>logs.push(args);
  global.fetch=async()=>Response.json({error:{code:'missing_scope',type:'invalid_request_error',message:'Private photo and fixture-private-key must never be logged. Missing scopes: api.model.read'}},{status:401});
  await assert.rejects(vision.classifyOutdoorSource(fs.readFileSync('public/img/venues/outdoor_garden.jpg')),/unavailable/);
  assert.deepEqual(logs[0][1].missingScopes,['api.model.read']);
  assert.doesNotMatch(JSON.stringify(logs),/Private photo|fixture-private-key/);
 } finally {global.fetch=oldFetch;console.error=oldLog;}
});
