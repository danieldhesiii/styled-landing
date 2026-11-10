const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function load(file, stubs = {}, cache = new Map()) {
  const absolute = path.resolve(file);
  if (cache.has(absolute)) return cache.get(absolute).exports;
  const m = new Module(absolute, module);
  cache.set(absolute, m);
  m.paths = module.paths;
  m.require = id => {
    if (Object.hasOwn(stubs, id)) return stubs[id];
    if (id.startsWith('@/') || id.startsWith('.')) {
      const base = id.startsWith('@/') ? path.resolve(id.slice(2)) : path.resolve(path.dirname(absolute), id);
      if (base.endsWith('.json')) return require(base);
      return load(base + (fs.existsSync(base + '.ts') ? '.ts' : '.tsx'), stubs, cache);
    }
    return require(id);
  };
  m._compile(ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, absolute);
  return m.exports;
}

const chair = { id: 'chair', name: 'Oak Crossback Chair', supplier: 'Fixture supplier', category: 'furniture', slot: 'chairs', styles: ['rustic_barn'], image: '/chair.jpg', dimensions: '90 cm high', material: 'Oak', capacity: 100, unitPrice: 5, qtyRule: 'fixed', stock: 'in_stock' };
const gold = { ...chair, id: 'gold', name: 'Gold Chiavari Chair', styles: ['classic_elegance'] };

test('explicit selections outrank styles and unavailable or withdrawn selections cannot be substituted', async () => {
  for (const mode of ['available', 'blocked', 'withdrawn', 'restricted']) {
    const server = load('lib/server/look.ts', {
      '@/lib/server/catalogue': { loadCatalogue: async () => mode === 'withdrawn' ? [gold] : [chair, gold], SCENE_CATEGORIES: { reception: ['furniture'] } },
      './venue-catalogue': { venueCatalogue: async () => ({ items: [gold] }) },
      '@/lib/supabase/admin': { createAdminClient: () => ({}) },
      '@/lib/server/availability': { loadAvailability: async () => new Map([chair, gold].map(item => [item.id, { effectiveCapacity: mode === 'blocked' && item.id === chair.id ? 0 : 100, available: 100 }])) },
    });
    const opts = { chosenIds: [chair.id, chair.id], brief: '', styleId: 'classic_elegance', setting: 'reception', weddingDate: '2099-01-01', guestCount: 1, venueSlug: mode === 'restricted' ? 'restricted' : undefined };
    if (mode === 'available') {
      const result = await server.composeOrderableLook(opts);
      assert.deepEqual(result.items.map(item => item.id), [chair.id]);
      assert.equal(result.report.items[0].source, 'chosen');
    } else await assert.rejects(server.composeOrderableLook(opts), /cannot be supplied/);
  }
});

test('new and refined prompt inventories retain product IDs, supplier and verified measurements', () => {
  const { buildRenderPrompt, buildRefinePrompt } = load('lib/server/render-prompt.ts');
  for (const prompt of [buildRenderPrompt({ style: null, brief: 'Use the oak chair, no flowers', guestCount: 80, items: [chair] }), buildRefinePrompt({ brief: 'Keep the oak chair', items: [chair] })]) {
    for (const value of [chair.id, chair.name, chair.supplier, chair.dimensions]) assert.ok(prompt.includes(value));
    assert.match(prompt, /priority over general style suggestions/);
    assert.match(prompt, /not proof of true scale/);
  }
});

// A small hook harness exercises the real component handlers with mocked IO.
function componentHarness(file, props, runEffects = false, catalogueItems = [chair, gold]) {
  const values = [], refs = [], cleanups = [], effectDependencies = [];
  let index = 0, refIndex = 0, effectIndex = 0, pendingEffects = [], stateChanged = false;
  const catalogue = { items: catalogueItems, getItem: id => catalogueItems.find(item => item.id === id), loading: false, error: null };
  const noComponent = () => null;
  const component = load(file, {
    react: { ...require('react'), useId: () => 'fixture', useEffect: (effect, deps) => {
      if (!runEffects) { if (deps?.length === 0) { const cleanup = effect(); if (cleanup) cleanups.push(cleanup); } return; }
      const i = effectIndex++, previous = effectDependencies[i];
      if (!previous || !deps || deps.length !== previous.length || deps.some((value, position) => !Object.is(value, previous[position]))) {
        effectDependencies[i] = deps;
        pendingEffects.push(effect);
      }
    }, useState: initial => { const i = index++; if (!(i in values)) values[i] = initial; return [values[i], value => { const next = typeof value === 'function' ? value(values[i]) : value; if (!Object.is(values[i], next)) stateChanged = true; values[i] = next; }]; }, useRef: initial => { const i = refIndex++; return refs[i] ||= { current: initial }; } },
    '@/components/catalogue/CatalogueProvider': { useCatalogue: () => catalogue },
    '@/components/ui/ContextHelp': { default: noComponent, __esModule: true },
    '@/components/design/LookReportPanel': { default: noComponent, __esModule: true },
    './ProductDetails': { default: noComponent, __esModule: true },
    './ProductPurchase': { default: noComponent, __esModule: true },
    '@/components/availability/AvailabilityBadge': { default: noComponent, __esModule: true },
  }).default;
  const render = () => {
    for (let pass = 0; pass < 10; pass++) {
      index = refIndex = effectIndex = 0; pendingEffects = []; stateChanged = false;
      const tree = component(props);
      for (const effect of pendingEffects) { const cleanup = effect(); if (cleanup) cleanups.push(cleanup); }
      if (!runEffects || !stateChanged) return tree;
    }
    throw Error('Component effects did not settle');
  };
  render.unmount = () => { for (const cleanup of cleanups) cleanup(); };
  return render;
}
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...nodes(tree.props?.children)];
}
function content(tree) {
  if (Array.isArray(tree)) return tree.map(content).join('');
  if (tree == null || typeof tree === 'boolean') return '';
  return typeof tree === 'object' ? content(tree.props?.children) : String(tree);
}
function button(tree, label) { return nodes(tree).find(node => node.type === 'button' && content(node).includes(label)); }
const renderProps = () => ({ venue: { id: 'oak_barn' }, uploadedImages: [{ id: 'photo', url: '/room.jpg' }], style: { id: 'rustic_barn' }, styleName: 'Rustic', renderUrl: null, renderId: null, versions: [], itemIds: [chair.id], guestCount: 80, weddingDate: '', isSaved: false, onRender() {}, onStyle() {}, onDeleteVersion() {}, onVenue() {}, onAddAngle() {}, onRemoveAngle() {}, onShopLook() {}, onToggleSave() {}, onWeddingDate() {} });

test('compact progress navigation reflects completion, reopens inputs and never starts generation', () => {
  const fetch = global.fetch;
  let requests = 0;
  global.fetch = () => { requests++; throw Error('Navigation must not generate'); };
  try {
    const props = { ...renderProps() };
    const render = componentHarness('components/design/RenderStage.tsx', props, true);
    const progress = tree => nodes(tree).find(node => node.type === 'ol' && node.props['aria-label'] === 'Visualise progress');
    const stages = tree => nodes(progress(tree)).filter(node => node.type === 'li');
    assert.deepEqual(stages(render()).map(node => node.props['data-state']), ['complete', 'active', 'upcoming']);
    assert.equal(button(progress(render()), 'Preview').props.disabled, true);
    props.renderUrl = '/finished.jpg'; props.renderId = 'finished';
    assert.deepEqual(stages(render()).map(node => node.props['data-state']), ['complete', 'complete', 'active']);
    button(progress(render()), 'Your selection').props.onClick();
    assert.ok(button(render(), 'Generate'));
    assert.ok(nodes(render()).some(node => node.type === 'img' && node.props.src === '/finished.jpg'));
    button(progress(render()), 'Preview').props.onClick();
    assert.ok(!button(render(), 'Generate'));
    assert.equal(requests, 0);
  } finally { global.fetch = fetch; }
});

test('returning from a typed tweak through the selection rail starts with a clean brief and preserves versions', async () => {
  const fetch = global.fetch, requests = [], changedRenders = [];
  global.fetch = async (url, options) => {
    requests.push(JSON.parse(options.body));
    return Response.json({ ok: false, error: 'Fixture decline' }, { status: 503 });
  };
  try {
    const versions = [{ id: 'finished', url: '/finished.jpg', itemIds: [chair.id] }];
    const props = { ...renderProps(), renderUrl: '/finished.jpg', renderId: 'finished', versions, onRender: value => changedRenders.push(value) };
    const render = componentHarness('components/design/RenderStage.tsx', props, true);
    button(render(), 'Tweak this look').props.onClick();
    nodes(render()).find(node => node.type === 'textarea').props.onChange({ target: { value: 'Move the chair to the left' } });
    assert.equal(nodes(render()).find(node => node.type === 'textarea').props.value, 'Move the chair to the left');
    const rail = nodes(render()).find(node => node.type === 'ol' && node.props['aria-label'] === 'Visualise progress');
    button(rail, 'Your selection').props.onClick();
    const tree = render();
    assert.equal(nodes(tree).find(node => node.type === 'textarea').props.value, '');
    assert.ok(!button(tree, 'Apply changes'));
    assert.ok(nodes(tree).some(node => node.type === 'img' && node.props.src === '/finished.jpg'));
    assert.equal(requests.length, 0);
    assert.deepEqual(changedRenders, []);
    assert.equal(props.versions, versions);
    await button(tree, 'Generate').props.onClick();
    assert.equal(requests.length, 1);
    assert.equal(requests[0].prompt, '');
    assert.equal(requests[0].parentRenderId, undefined);
  } finally { global.fetch = fetch; }
});

test('price-on-request chandelier cards retain purchase controls and request callbacks', () => {
  const item = load('lib/crescent-moon-demo-catalogue.ts').crescentMoonDemoCatalogue().find(item => item.priceOnRequest);
  assert.ok(item);
  const added = [];
  const props = { itemIds: [item.id], ready: true, basket: [], onAdd: product => added.push(product.id), onRemove() {}, onQty() {}, onBrowse() {}, savedIds: [], onSave() {}, saving: new Set(), savesLoaded: true, availability: {} };
  const render = componentHarness('components/design/LookProducts.tsx', props, false, [item]);
  const tree = render();
  assert.ok(content(tree).includes(item.name));
  assert.ok(content(tree).includes('Price on request'));
  const purchase = nodes(tree).find(node => typeof node.type === 'function' && node.props.item?.id === item.id && node.props.compact === true);
  assert.ok(purchase, 'chandelier must reach ProductPurchase rather than being hidden by demoOnly');
  const controls = componentHarness('components/design/ProductPurchase.tsx', purchase.props, false, [item]);
  const add = button(controls(), 'Add to basket');
  assert.ok(add, 'request-only chandelier must have a basket action');
  assert.equal(add.props.disabled, false);
  add.props.onClick();
  assert.deepEqual(added, [item.id]);
});

test('brief choices keep accessible pressed state and labelled inputs', () => {
  const patches = [], starts = [];
  const props = { brief: { venueId: 'oak_barn', uploadedImages: [], styleId: 'rustic_barn', guestCount: 80, weddingDate: '2099-01-01', budget: 5000 }, onChange: patch => patches.push(patch), onStart: () => starts.push(true) };
  const render = componentHarness('components/design/BriefStep.tsx', props);
  const tree = render();
  assert.equal(button(tree, 'The Oak Barn').props['aria-pressed'], true);
  const labels = nodes(tree).filter(node => node.type === 'label');
  for (const label of labels) assert.ok(nodes(tree).some(node => node.type === 'input' && node.props.id === label.props.htmlFor));
  button(tree, 'Hedingham Manor Orangery').props.onClick();
  assert.deepEqual(patches, [{ venueId: 'manor_orangery', uploadedImages: [] }]);
  button(tree, 'Choose products').props.onClick();
  assert.deepEqual(starts, [true]);
});

test('selection and mode changes reopen generation with the old image, while render arrivals and stable selections stay collapsed', () => {
  const fetch = global.fetch;
  let requests = 0;
  global.fetch = () => { requests++; throw Error('Selection changes must not generate'); };
  try {
    const props = { ...renderProps(), selectionMode: 'manual', renderUrl: '/old.jpg', renderId: 'old' };
    const render = componentHarness('components/design/RenderStage.tsx', props, true);
    assert.ok(!button(render(), 'Generate'));
    button(render(), 'Tweak this look').props.onClick();
    assert.ok(button(render(), 'Apply changes'));
    props.itemIds = [chair.id, gold.id];
    let tree = render();
    assert.ok(button(tree, 'Generate'));
    assert.ok(!button(tree, 'Apply changes'));
    assert.ok(nodes(tree).some(node => node.type === 'img' && node.props.src === '/old.jpg'));
    button(tree, 'Cancel').props.onClick();
    props.itemIds = [gold.id, chair.id, chair.id];
    assert.ok(!button(render(), 'Generate'));
    props.selectionMode = 'auto';
    assert.ok(button(render(), 'Generate'));
    props.renderUrl = '/new.jpg'; props.renderId = 'new';
    assert.ok(!button(render(), 'Generate'));
    props.itemIds = [...props.itemIds];
    props.onRender = () => {};
    props.versions = [{ id: 'new', url: '/new.jpg' }];
    assert.ok(!button(render(), 'Generate'));
    props.renderUrl = '/saved.jpg'; props.renderId = 'saved';
    assert.ok(!button(render(), 'Generate'));
    assert.equal(requests, 0);
  } finally { global.fetch = fetch; }
});

test('selection summary supports browse/remove; failure preserves the current look and IDs', async () => {
  const fetch = global.fetch, calls = [], changes = [];
  global.fetch = async (url, opts) => { calls.push(JSON.parse(opts.body)); return Response.json({ ok: false, error: 'Try again' }, { status: 503 }); };
  try {
    const props = { ...renderProps(), renderUrl: '/existing.jpg', renderId: 'existing', onStyle: () => changes.push('style'), onRender: () => changes.push('render'), onBrowseProducts: () => changes.push('browse'), onRemoveItem: id => changes.push(id) };
    const render = componentHarness('components/design/RenderStage.tsx', props);
    let tree = render();
    assert.ok(content(tree).includes(chair.name));
    button(tree, 'Browse products').props.onClick();
    button(tree, 'Remove').props.onClick();
    assert.deepEqual(changes, ['browse', chair.id]);
    button(tree, 'New style').props.onClick();
    tree = render();
    await button(tree, 'Generate').props.onClick();
    assert.deepEqual(calls[0].itemIds, [chair.id]);
    assert.deepEqual(changes, ['browse', chair.id]);
    assert.ok(content(render()).includes('Try again'));
    assert.ok(content(render()).includes(chair.name));
  } finally { global.fetch = fetch; }
});

test('Improve uses actual prefilled text, supports undo and does not overwrite newer typing', async () => {
  const fetch = global.fetch;
  try {
    let resolve;
    const requests = [];
    global.fetch = (url, opts) => { requests.push(JSON.parse(opts.body)); return new Promise(done => { resolve = done; }); };
    const render = componentHarness('components/design/RenderStage.tsx', { ...renderProps(), uploadedImages: [] });
    button(render(), 'Manor Orangery').props.onClick();
    let tree = render();
    const original = nodes(tree).find(node => node.type === 'textarea').props.value;
    const work = button(tree, 'Improve my description').props.onClick();
    assert.equal(requests[0].prompt, original);
    resolve(Response.json({ ok: true, prompt: 'Clearer ivory florals and warm candlelight.', changed: true }));
    await work;
    tree = render();
    assert.equal(nodes(tree).find(node => node.type === 'textarea').props.value, 'Clearer ivory florals and warm candlelight.');
    button(tree, 'Undo improvement').props.onClick();
    tree = render();
    assert.equal(nodes(tree).find(node => node.type === 'textarea').props.value, original);
    const delayed = button(tree, 'Improve my description').props.onClick();
    nodes(render()).find(node => node.type === 'textarea').props.onChange({ target: { value: 'My newer edit' } });
    render();
    resolve(Response.json({ ok: true, prompt: 'Stale improvement', changed: true }));
    await delayed;
    assert.equal(nodes(render()).find(node => node.type === 'textarea').props.value, 'My newer edit');
  } finally { global.fetch = fetch; }
});

test('a completed request from an unmounted event cannot replace the next event look', async () => {
  const fetch = global.fetch, changes = [];
  let resolve;
  global.fetch = () => new Promise(done => { resolve = done; });
  try {
    const render = componentHarness('components/design/RenderStage.tsx', { ...renderProps(), renderUrl: '/existing.jpg', onStyle: () => changes.push('style'), onRender: () => changes.push('render') });
    button(render(), 'New style').props.onClick();
    const work = button(render(), 'Generate').props.onClick();
    render.unmount();
    resolve(Response.json({ ok: true, renderId: 'late', imageUrl: '/late.jpg' }));
    await work;
    assert.deepEqual(changes, []);
  } finally { global.fetch = fetch; }
});

test('products display before generation and saved hearts remain while board UI is absent', () => {
  const saved = [];
  const render = componentHarness('components/design/LookProducts.tsx', { itemIds: [], selectedIds: [chair.id], ready: false, basket: [{ itemId: gold.id, qty: 1 }], onAdd() {}, onRemove() {}, onQty() {}, onBrowse() {}, savedIds: [], onSave: id => saved.push(id), saving: new Set(), savesLoaded: true, availability: {}, onAddToBoard: async () => true });
  const tree = render();
  assert.ok(content(tree).includes(chair.name));
  assert.doesNotMatch(content(tree), /Add to board|terms and boards/);
  nodes(tree).find(node => node.props?.['aria-label'] === `Save ${chair.name}`).props.onClick();
  assert.deepEqual(saved, [chair.id]);
  button(tree, 'Details and terms').props.onClick();
  const details = nodes(render()).find(node => typeof node.type === 'function' && node.props.item?.id === chair.id && typeof node.props.onClose === 'function');
  assert.ok(details);
  assert.equal(details.props.onAddToBoard, undefined);
});

test('preview modes are controlled, auto payloads ignore manual IDs, and preview removal never touches basket callbacks', async () => {
  const fetch = global.fetch, modes = [], removed = [], requests = [];
  global.fetch = async (url, opts) => { requests.push(JSON.parse(opts.body)); return Response.json({ ok: false, error: 'Fixture failure' }, { status: 503 }); };
  try {
    const props = { ...renderProps(), renderUrl: '/old.jpg', selectionMode: 'manual', onSelectionMode: mode => modes.push(mode), onRemoveItem: id => removed.push(id) };
    const render = componentHarness('components/design/RenderStage.tsx', props);
    button(render(), 'Choose for me').props.onClick();
    assert.deepEqual(modes, ['auto']);
    button(render(), 'Remove').props.onClick();
    assert.deepEqual(removed, [chair.id]);
    props.selectionMode = 'auto';
    button(render(), 'New style').props.onClick();
    await button(render(), 'Generate').props.onClick();
    assert.equal(requests[0].selectionMode, 'auto');
    assert.deepEqual(requests[0].itemIds, []);
    assert.doesNotMatch(content(render()), /eligible products/);
    assert.equal(nodes(render()).filter(node => node.type === 'p' && content(node) === 'AI preview').length, 1);
  } finally { global.fetch = fetch; }
});

test('LookProducts forwards dedicated preview selection to details and does not infer it from basket', () => {
  const toggled = [], basketChanges = [];
  const props = { itemIds: [], selectedVisualiserIds: [chair.id], ready: false, basket: [{ itemId: gold.id, quantity: 1 }], onAdd: () => basketChanges.push('add'), onRemove: () => basketChanges.push('remove'), onQty() {}, onBrowse() {}, onVisualise: item => toggled.push(item.id), savedIds: [], onSave() {}, saving: new Set(), savesLoaded: true, availability: {} };
  const render = componentHarness('components/design/LookProducts.tsx', props);
  assert.ok(content(render()).includes(chair.name));
  assert.ok(!content(render()).includes(gold.name));
  button(render(), 'Details and terms').props.onClick();
  const details = nodes(render()).find(node => typeof node.type === 'function' && node.props.item?.id === chair.id && typeof node.props.onClose === 'function');
  assert.deepEqual(details.props.selectedVisualiserIds, [chair.id]);
  details.props.onVisualise(chair);
  assert.deepEqual(toggled, [chair.id]);
  assert.deepEqual(basketChanges, []);
  const empty = componentHarness('components/design/LookProducts.tsx', { ...props, selectedVisualiserIds: [] });
  assert.ok(!content(empty()).includes(gold.name));
});

test('product-only generation deduplicates IDs, prioritises references and returns deterministic metadata', async () => {
  let row, composition, job;
  const after = [];
  const query = { select() { return this; }, order() { return this; }, limit() { return this; }, maybeSingle: async () => ({ data: { id: 'brief' } }), update() { return this; }, eq: async () => ({ error: null }) };
  const stubs = {
    'next/server': { NextResponse: { json: (data, opts) => Response.json(data, opts) }, after: fn => after.push(fn) },
    '@/lib/server/session': { requireUser: async () => ({ ok: true, user: { id: 'fixture-user' }, supabase: { from: () => query } }) },
    '@/lib/server/env': { env: { openaiApiKeyIfSet: 'test-only', imageModel: 'mock' } },
    '@/lib/server/look': { usableDate: () => null, composeOrderableLook: async opts => { composition = opts; return { items: [chair], report: { items: [chair], leftPlain: [] } }; } },
    '@/lib/server/limits': { clientIpHash: () => '', checkRenderLimits: async () => null },
    '@/lib/server/crescent-moon-references': {},
    '@/lib/wedding': {},
    '@/lib/categories': { categoryMeta: category => ({ label: category }) },
    '@/lib/server/render-source': { loadSampleVenue: async () => ({ images: [Buffer.from('room')], photoIds: [], width: 1024, height: 1024 }) },
    '@/lib/server/selected-photos': { loadSelectedPhotoBuffers: async () => ({ buffers: [] }) },
    '@/lib/crescent-moon-demo-catalogue': { crescentMoonDemoCatalogue: () => [] },
    '@/lib/supabase/admin': { createAdminClient: () => ({ from: () => ({ insert: async data => { row = data; return { error: null }; } }) }) },
    '@/lib/server/public-images': { readPublicImage: async image => Buffer.from(image) },
    '@/lib/server/render-job': { runRenderJob: async opts => { job = opts; } },
    '@/lib/server/image-model': { sizeFor: () => '1024x1024' },
  };
  const route = load('app/api/generate/route.ts', stubs);
  const request = itemIds => new Request('https://styledukprodprogress.vercel.app/api/generate', { method: 'POST', body: JSON.stringify({ styleId: 'none', venueId: 'oak_barn', itemIds }) });
  const response = await route.POST(request([chair.id, chair.id]));
  assert.equal(response.status, 202, await response.clone().text());
  const data = await response.json();
  assert.deepEqual(composition.chosenIds, [chair.id]);
  assert.deepEqual(data.itemIds, [chair.id]);
  assert.deepEqual(row.item_ids, [chair.id]);
  for (const callback of after) await callback();
  assert.ok(job.images.some(buffer => buffer.toString() === chair.image));
  assert.ok(job.prompt.includes(chair.id));
  assert.equal((await route.POST(request([42]))).status, 400);
  assert.equal((await route.POST(request(Array.from({ length: 13 }, (_, i) => `product-${i}`)))).status, 422);
});

test('unsupported multiple lighting references are visible and blocked before any request', async () => {
  const fetch = global.fetch;
  let calls = 0;
  global.fetch = () => { calls++; throw Error('No request allowed'); };
  try {
    const render = componentHarness('components/design/RenderStage.tsx', { ...renderProps(), renderUrl: '/old.jpg', itemIds: ['demo-crescent-moon-empire-90', 'demo-crescent-moon-empire-200'] });
    assert.match(content(render()), /Use one reference lighting design per preview/);
    button(render(), 'New style').props.onClick();
    const generate = button(render(), 'Generate');
    assert.equal(generate.props.disabled, true);
    await generate.props.onClick();
    assert.equal(calls, 0);
  } finally { global.fetch = fetch; }
});

test('saved sample venues restore after remount and event return without overriding uploads or partner rooms', () => {
  const venueChanges = [];
  const props = { ...renderProps(), uploadedImages: [], venue: { id: 'oak_barn' }, onVenue: id => venueChanges.push(id) };
  const render = componentHarness('components/design/RenderStage.tsx', props);
  const displayed = tree => nodes(tree).find(node => node.type === 'img' && node.props.alt === 'Original venue photo')?.props.src;
  assert.equal(displayed(render()), '/img/venues/oak_barn.png');
  props.venue = { id: 'county_hall' };
  assert.equal(displayed(render()), '/img/venues/county_hall.jpg');
  props.venue = { id: 'oak_barn' };
  assert.equal(displayed(render()), '/img/venues/oak_barn.png');
  const remount = componentHarness('components/design/RenderStage.tsx', props);
  assert.equal(displayed(remount()), '/img/venues/oak_barn.png');
  props.uploadedImages = [{ id: 'own', url: '/own-room.jpg' }];
  assert.equal(displayed(render()), '/own-room.jpg');
  props.uploadedImages = [];
  props.venue = { id: 'listing:partner', name: 'Partner room', image: '/partner-room.jpg' };
  assert.equal(displayed(render()), '/partner-room.jpg');
  props.venue = { id: 'unrecognised-private-room' };
  assert.equal(displayed(render()), undefined);
  assert.deepEqual(venueChanges, []);
});

function modeRoute({ missingPhoto = false, missingPreview = false, key = 'test-only', parent = null } = {}) {
  const previews = load('lib/crescent-moon-demo-catalogue.ts').crescentMoonDemoCatalogue();
  const light = { ...chair, id: 'festoon', name: 'Festoon Canopy Package', category: 'lighting', slot: 'lighting', styles: ['classic_elegance'], image: '/festoon.jpg' };
  const rows = [], callbacks = [], jobs = [], photoReads = [], stockChecks = [];
  const query = { select() { return this; }, order() { return this; }, limit() { return this; }, maybeSingle: async () => ({ data: { id: 'brief' } }), update() { return this; }, eq: async () => ({ error: null }) };
  const stubs = {
    'next/server': { NextResponse: { json: (data, opts) => Response.json(data, opts) }, after: fn => callbacks.push(fn) },
    '@/lib/server/session': { requireUser: async () => ({ ok: true, user: { id: 'fixture-user' }, supabase: { from: () => query } }) },
    '@/lib/server/env': { env: { openaiApiKeyIfSet: key, imageModel: 'mock', maxRefinements: 6 } },
    '@/lib/server/catalogue': { loadCatalogue: async () => [chair, gold, light], SCENE_CATEGORIES: { reception: ['furniture', 'lighting'] } },
    './venue-catalogue': { venueCatalogue: async () => ({ items: [chair, gold, light] }) },
    '@/lib/server/availability': { loadAvailability: async (_, ids) => { stockChecks.push(ids); return new Map(ids.map(id => [id, { effectiveCapacity: 100, available: 100 }])); } },
    '@/lib/server/limits': { clientIpHash: () => '', checkRenderLimits: async () => null },
    '@/lib/server/crescent-moon-references': { loadCrescentMoonReferences: async id => { photoReads.push(id); if (missingPreview) throw Error('Unavailable reference'); return { buffers: [Buffer.from(id)], names: [id] }; }, chandelierIdentityInstruction: id => 'Match ' + id, orderChandelierInputs: (room, products) => [room[0], ...products] },
    '@/lib/wedding': { deliveryError: () => null },
    '@/lib/categories': { categoryMeta: category => ({ label: category }) },
    '@/lib/server/render-source': { loadSampleVenue: async () => ({ images: [Buffer.from('room')], photoIds: [], width: 1024, height: 1024 }), loadParentRender: async () => parent },
    '@/lib/server/selected-photos': { loadSelectedPhotoBuffers: async () => ({ buffers: [] }) },
    '@/lib/supabase/admin': { createAdminClient: () => ({ from: () => ({ insert: async data => { rows.push(data); return { error: null }; } }) }) },
    '@/lib/server/public-images': { readPublicImage: async image => { photoReads.push(image); if (missingPhoto) throw Error('Unavailable product photo'); return Buffer.from(image); } },
    '@/lib/server/render-job': { runRenderJob: async opts => { jobs.push(opts); } },
    '@/lib/server/image-model': { sizeFor: () => '1024x1024' },
  };
  const route = load('app/api/generate/route.ts', stubs);
  return { previews, rows, jobs, callbacks, photoReads, stockChecks, async post(body, host = 'styledukprodprogress.vercel.app') { return route.POST(new Request(`https://${host}/api/generate`, { method: 'POST', body: JSON.stringify({ styleId: 'classic_elegance', venueId: 'oak_barn', weddingDate: '2099-01-01', ...body }) })); }, async run() { for (const fn of callbacks) await fn(); } };
}

test('manual mode is exact, auto uses prompt-guided eligible catalogue, and conflicts are explicit', async () => {
  const manual = modeRoute();
  let response = await manual.post({ selectionMode: 'manual', itemIds: [chair.id] });
  assert.equal(response.status, 202, await response.clone().text());
  assert.deepEqual((await response.json()).itemIds, [chair.id]);
  assert.deepEqual(manual.rows[0].item_ids, [chair.id]);
  assert.deepEqual(manual.stockChecks, [[chair.id]]);
  assert.deepEqual(manual.photoReads, [chair.image]);
  const auto = modeRoute();
  response = await auto.post({ selectionMode: 'auto', itemIds: [chair.id], prompt: 'Use Gold Chiavari Chair and Festoon Canopy Package' });
  assert.equal(response.status, 202, await response.clone().text());
  assert.deepEqual((await response.json()).itemIds, [gold.id, 'festoon']);
  assert.ok(auto.stockChecks[0].includes(chair.id));
  for (const prompt of ['Use Gold Chiavari Chair', 'Remove Oak Crossback Chair']) {
    const conflict = modeRoute();
    assert.equal((await conflict.post({ selectionMode: 'manual', itemIds: [chair.id], prompt })).status, 422);
    assert.equal(conflict.callbacks.length, 0);
  }
});

test('preview-only selection loads required images without stock and persists complete IDs', async () => {
  const h = modeRoute(), preview = h.previews[0];
  const response = await h.post({ selectionMode: 'manual', itemIds: [preview.id] });
  assert.equal(response.status, 202, await response.clone().text());
  assert.deepEqual((await response.json()).itemIds, [preview.id]);
  assert.deepEqual(h.rows[0].item_ids, [preview.id]);
  assert.equal(h.rows[0].look_report.demoReference.id, preview.id);
  assert.deepEqual(h.rows[0].look_report.items, []);
  assert.deepEqual(h.stockChecks, []);
  assert.deepEqual(h.photoReads, [preview.id]);
  await h.run();
  assert.deepEqual(h.jobs[0].images.map(buffer => buffer.toString()), ['room', preview.id]);
  const mixed = modeRoute();
  const mixedResponse = await mixed.post({ selectionMode: 'manual', itemIds: [preview.id, 'festoon'] });
  assert.equal(mixedResponse.status, 202, await mixedResponse.clone().text());
  assert.deepEqual((await mixedResponse.json()).itemIds, ['festoon', preview.id]);
  assert.deepEqual(mixed.photoReads, [preview.id, '/festoon.jpg']);
});

test('missing required photos, unavailable engine and preview guard failures schedule no model job', async () => {
  for (const options of [{ missingPhoto: true }, { missingPreview: true }, { key: null }]) {
    const h = modeRoute(options), id = options.missingPhoto ? chair.id : h.previews[0].id;
    const response = await h.post({ selectionMode: 'manual', itemIds: [id] });
    assert.ok([422, 503].includes(response.status), await response.clone().text());
    assert.deepEqual(h.callbacks, []);
    assert.deepEqual(h.jobs, []);
    assert.deepEqual(h.rows, []);
  }
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    for (const mode of ['host', 'venue', 'supplier', 'multiple']) {
      const h = modeRoute(), preview = h.previews[0];
      const body = { selectionMode: 'manual', itemIds: [preview.id] };
      if (mode === 'venue') body.venueId = 'listing:restricted';
      if (mode === 'supplier') body.supplierId = '11111111-1111-4111-8111-111111111111';
      if (mode === 'multiple') body.itemIds.push(h.previews[1].id);
      assert.equal((await h.post(body, mode === 'host' ? 'public.test' : undefined)).status, 422);
      assert.deepEqual(h.callbacks, []);
      assert.deepEqual(h.photoReads, []);
    }
  } finally { if (previousNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousNodeEnv; }
});
