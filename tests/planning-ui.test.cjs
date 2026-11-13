const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module'), ts = require('typescript');

function harness() {
  const states = [], effects = [], cache = new Map();
  let cursor = 0;
  const react = {
    ...require('react'),
    useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
      return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
    },
    useRef: value => ({ current: value }),
    useId: () => `test-${cursor++}`,
    useEffect: effect => effects.push(effect),
  };
  function load(relative) {
    let file = path.resolve(relative);
    if (!path.extname(file)) file += fs.existsSync(file + '.ts') ? '.ts' : '.tsx';
    if (cache.has(file)) return cache.get(file).exports;
    const m = new Module(file, module); m.paths = module.paths; cache.set(file, m);
    m.require = id => id === 'react' ? react : id.startsWith('@/') ? load(id.slice(2)) : id.startsWith('.') ? load(path.resolve(path.dirname(file), id)) : require(id);
    m._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, file);
    return m.exports;
  }
  return { load, effects, render(Component, props) { cursor = 0; return Component(props); } };
}
function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)];
}
function text(tree) { return typeof tree === 'string' || typeof tree === 'number' ? String(tree) : !tree ? '' : Array.isArray(tree) ? tree.map(text).join(' ') : text(tree.props?.children); }
const future = '2099-06-12', before = '2099-06-11';

test('compact item hire dates edit and reset overrides without hiding validation errors', () => {
  const h = harness(), Component = h.load('components/wedding/ItemHireDates').default;
  const changes = [], props = { line: { itemId: 'chair', quantity: 2 }, name: 'Chair', defaults: { start: before, end: future }, id: 'chair', compact: true, onChange: (...args) => changes.push(args) };
  let tree = h.render(Component, props);
  assert.equal(nodes(tree).filter(n => n.type === 'input').length, 0);
  assert.match(text(tree), /Change dates/);
  assert.doesNotMatch(text(tree), /Different dates|Default hire/);
  nodes(tree).find(n => n.type === 'button').props.onClick();
  tree = h.render(Component, props);
  nodes(tree).find(n => n.props?.id === 'chair-start').props.onChange({ target: { value: '2099-06-10' } });
  assert.deepEqual(changes.pop(), ['chair', { start: '2099-06-10', end: future }]);
  props.line.hireDates = { start: future, end: before };
  tree = h.render(Component, props);
  nodes(tree).find(n => n.type === 'button' && text(n) === 'Done').props.onClick();
  tree = h.render(Component, props);
  assert.equal(nodes(tree).filter(n => n.type === 'input').length, 0);
  assert.ok(nodes(tree).some(n => n.props?.role === 'alert'));
  nodes(tree).find(n => n.type === 'button').props.onClick();
  tree = h.render(Component, props);
  nodes(tree).find(n => n.type === 'button' && text(n) === 'Use event dates').props.onClick();
  assert.deepEqual(changes.pop(), ['chair', undefined]);
});

test('delivery defaults offer event day, day before and custom dates, and follow event changes', () => {
  const h = harness(), Component = h.load('components/wedding/DeliveryDates').default, changes = [];
  let props = { weddingDate: future, deliverySameDay: true, id: 'event', onChange: patch => changes.push(patch) };
  let tree = h.render(Component, props);
  const select = nodes(tree).find(n => n.type === 'select');
  select.props.onChange({ target: { value: 'before' } });
  assert.deepEqual(changes.pop(), { deliverySameDay: false, deliveryDate: before });
  props = { ...props, deliverySameDay: false, deliveryDate: before, returnDate: future };
  tree = h.render(Component, props);
  nodes(tree).find(n => n.props?.id === 'event-event').props.onChange({ target: { value: '2099-06-20' } });
  assert.deepEqual(changes.pop(), { weddingDate: '2099-06-20', deliveryDate: '2099-06-19', returnDate: '2099-06-20' });
  tree = h.render(Component, { ...props, deliveryDate: '2099-06-09', returnDate: '2099-06-13' });
  nodes(tree).find(n => n.props?.id === 'event-event').props.onChange({ target: { value: '2099-06-20' } });
  assert.deepEqual(changes.pop(), { weddingDate: '2099-06-20' });
  nodes(tree).find(n => n.type === 'select').props.onChange({ target: { value: 'same' } });
  assert.deepEqual(changes.pop(), { deliverySameDay: true });
});

test('planning fingerprint ignores read-only preview and venue metadata but detects editable changes', () => {
  const h = harness(), { planningFingerprint, newEventBrief } = h.load('components/wedding/planning-state');
  const { eventWorkspace, FIRST_EVENT_ID } = h.load('lib/event-plans');
  const boards = [{ id: 'legacy-board', name: 'Existing ideas', pins: [] }];
  const original = eventWorkspace({ ...newEventBrief(), venueId: 'listing:venue', venueName: 'Old name' }, boards, [], FIRST_EVENT_ID, [], null);
  const updated = structuredClone(original);
  updated.brief.venueName = updated.events[0].brief.venueName = 'Updated public name';
  updated.events[0].renderId = 'opened-look';
  assert.equal(planningFingerprint(updated), planningFingerprint(original));
  updated.events[0].basket.push({ itemId: 'chair', quantity: 80, hireDates: { start: before, end: future } });
  assert.notEqual(planningFingerprint(updated), planningFingerprint(original));
  assert.deepEqual(original.boards, boards);
  const fresh = newEventBrief();
  assert.equal(fresh.weddingDate, ''); assert.equal(fresh.returnDate, ''); assert.equal(fresh.deliveryDate, ''); assert.equal(fresh.venueName, ''); assert.equal(fresh.budget, 0);
  fresh.uploadedImages.push({ id: 'one', url: 'photo' });
  assert.deepEqual(newEventBrief().uploadedImages, []);
});

test('event setup exposes venue discovery without implying a booking', () => {
  const h = harness(), Component = h.load('components/wedding/MyWedding').default;
  const { newEventBrief } = h.load('components/wedding/planning-state');
  let finds = 0;
  const tree = h.render(Component, { brief: newEventBrief(), photos: {}, loaded: true, saving: false, status: 'Saved', onChange() {}, onSave: async () => true, onFindVenue() { finds++; } });
  const button = nodes(tree).find(n => n.type === 'button' && text(n) === 'Find venues →');
  assert.ok(button); button.props.onClick(); assert.equal(finds, 1);
  assert.match(text(tree), /does not publish a listing or reserve a date/);
  assert.doesNotMatch(text(tree), /supplier budget|Supplier basket budget/);
});

test('switching events restores only that event’s product IDs, venue and hire overrides while retaining legacy boards', () => {
  const h = harness(), { newEventBrief } = h.load('components/wedding/planning-state');
  const { eventWorkspace, eventBrief, FIRST_EVENT_ID } = h.load('lib/event-plans');
  const boards = [{ id: 'legacy', name: 'Keep me', pins: [{ id: 'pin', kind: 'note', text: 'Existing saved data' }] }];
  const firstBrief = { ...newEventBrief(), venueId: 'listing:first-venue', venueName: 'First venue', weddingDate: future, deliverySameDay: false, deliveryDate: before };
  const firstBasket = [{ itemId: 'chairs', quantity: 80, hireDates: { start: '2099-06-10', end: '2099-06-13' } }];
  let workspace = eventWorkspace(firstBrief, boards, [], FIRST_EVENT_ID, firstBasket, 'first-preview');
  const second = { id: 'second', name: 'Reception', kind: 'reception', brief: { ...newEventBrief(), photoIds: [] }, basket: [], renderId: null };
  delete second.brief.uploadedImages;
  workspace.events.push(second);
  workspace = eventWorkspace({ ...eventBrief(second, {}), venueId: 'listing:second-venue', weddingDate: '2099-07-20' }, boards, workspace.events, 'second', [{ itemId: 'tables', quantity: 8 }], 'second-preview');
  assert.deepEqual(workspace.events.find(e => e.id === FIRST_EVENT_ID).basket.map(line => line.itemId), ['chairs']);
  assert.deepEqual(workspace.events.find(e => e.id === 'second').basket.map(line => line.itemId), ['tables']);
  const restored = workspace.events.find(e => e.id === FIRST_EVENT_ID);
  assert.equal(eventBrief(restored, {}).venueId, firstBrief.venueId);
  assert.equal(eventBrief(restored, {}).deliveryDate, before);
  assert.deepEqual(restored.basket, firstBasket);
  assert.deepEqual(workspace.boards, boards);
});

test('successful visualiser style commit preserves versions and rejects a stale event callback', () => {
  const file = ts.createSourceFile('page.tsx', fs.readFileSync('app/design/page.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let handler;
  function visit(node) {
    if (ts.isJsxAttribute(node) && node.name.getText(file) === 'onStyle') handler = node.initializer.expression.getText(file);
    ts.forEachChild(node, visit);
  }
  visit(file); assert.ok(handler);
  const vm = require('node:vm');
  let brief = { styleId: 'garden_romance' }, touched = false;
  const versions = [{ id: 'existing' }, { id: 'new-success' }];
  const context = { workspaceLock: { current: false }, activeEventRef: { current: 'event-a' }, activeEventId: 'event-a', setBrief: update => { brief = update(brief); }, setWorkspaceTouched: value => { touched = value; }, patchBrief: () => { throw Error('Style commit must not clear renders'); } };
  const code = ts.transpileModule(`(${handler})("modern_minimal");`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(code, context);
  assert.equal(brief.styleId, 'modern_minimal'); assert.equal(touched, true); assert.equal(versions.length, 2);
  context.activeEventRef.current = 'event-b'; touched = false; brief.styleId = 'classic_elegance';
  vm.runInNewContext(code, context);
  assert.equal(brief.styleId, 'classic_elegance'); assert.equal(touched, false);
});

test('leave-warning fingerprints equate implicit defaults and refreshed listing details but retain actual date changes', () => {
  const h = harness(), { planningFingerprint, newEventBrief } = h.load('components/wedding/planning-state');
  const { eventWorkspace, FIRST_EVENT_ID } = h.load('lib/event-plans');
  const workspace = eventWorkspace(newEventBrief(), [], [], FIRST_EVENT_ID, [], null);
  const implicit = structuredClone(workspace);
  for (const brief of [implicit.brief, implicit.events[0].brief]) {
    for (const key of ['deliverySameDay', 'deliveryDate', 'returnDate', 'venueChoice', 'venueName', 'venuePostcode']) delete brief[key];
  }
  assert.equal(planningFingerprint(implicit), planningFingerprint(workspace));
  const linked = structuredClone(workspace);
  linked.brief.venueId = linked.events[0].brief.venueId = 'listing:chosen-venue';
  const refreshed = structuredClone(linked);
  for (const brief of [refreshed.brief, refreshed.events[0].brief]) { brief.venueChoice = 'have'; brief.venueName = 'Public venue name'; }
  assert.equal(planningFingerprint(linked), planningFingerprint(refreshed));
  refreshed.brief.weddingDate = future;
  assert.notEqual(planningFingerprint(linked), planningFingerprint(refreshed));
});

test('preview products and modes round-trip through server validation per event without modifying any basket or render reference', () => {
  const h = harness(), { newEventBrief } = h.load('components/wedding/planning-state');
  const { eventWorkspace, FIRST_EVENT_ID, togglePreviewItem, emptyPreviewSelection } = h.load('lib/event-plans');
  const { parseWorkspace } = h.load('lib/workspace-input');
  const firstRender = '00000000-0000-4000-8000-000000000011', secondRender = '00000000-0000-4000-8000-000000000012';
  const basket = [{ itemId: 'basket-only', quantity: 3 }];
  let chosen = togglePreviewItem(emptyPreviewSelection(), 'preview-chair');
  chosen = togglePreviewItem(chosen, 'demo-permitted');
  let data = eventWorkspace(newEventBrief(), [], [], FIRST_EVENT_ID, basket, firstRender, chosen);
  const secondId = '00000000-0000-4000-8000-000000000002';
  data = eventWorkspace(newEventBrief(), [], data.events, secondId, [{ itemId: 'second-basket', quantity: 1 }], secondRender, { itemIds: ['preview-table'], mode: 'auto' });
  const parsed = parseWorkspace(JSON.parse(JSON.stringify(data)));
  assert.deepEqual(parsed.events[0].basket, basket);
  assert.deepEqual(parsed.events[0].previewSelection, { itemIds: ['preview-chair', 'demo-permitted'], mode: 'manual' });
  assert.deepEqual(parsed.events[1].previewSelection, { itemIds: ['preview-table'], mode: 'auto' });
  assert.deepEqual(parsed.events.map(event => event.renderId), [firstRender, secondRender]);
  const removed = togglePreviewItem(chosen, 'preview-chair');
  assert.deepEqual(removed.itemIds, ['demo-permitted']);
  assert.deepEqual(chosen.itemIds, ['preview-chair', 'demo-permitted']);
  const back = eventWorkspace(newEventBrief(), [], parsed.events, FIRST_EVENT_ID, basket, firstRender);
  assert.deepEqual(back.events[0].previewSelection, chosen);
  const legacy = structuredClone(data); for (const event of legacy.events) delete event.previewSelection;
  assert.deepEqual(parseWorkspace(legacy).events.map(event => event.previewSelection), [emptyPreviewSelection(), emptyPreviewSelection()]);
});

test('workspace preview validation rejects malformed IDs/modes and never silently truncates selections', () => {
  const h = harness(), { parsePreviewSelection } = h.load('lib/event-plans');
  assert.deepEqual(parsePreviewSelection({ itemIds: ['one', 'one', 'two'], mode: 'manual', owner_id: 'forged' }), { itemIds: ['one', 'two'], mode: 'manual' });
  for (const value of [null, [], { itemIds: ['https://private.example'], mode: 'manual' }, { itemIds: [], mode: 'invalid' }, { itemIds: [null], mode: 'auto' }, { itemIds: Array(101).fill('one'), mode: 'auto' }]) assert.throws(() => parsePreviewSelection(value));
  const ids = Array.from({ length: 13 }, (_, i) => `item-${i}`);
  assert.deepEqual(parsePreviewSelection({ itemIds: ids, mode: 'manual' }).itemIds, ids);
});

test('verified local drafts retain account/event selections and file references; blocked or discarded storage is detectable', () => {
  const h = harness(), { persistPlanningDraft } = h.load('components/wedding/planning-state');
  const saved = new Map(), storage = { setItem: (key, value) => saved.set(key, value), getItem: key => saved.get(key) };
  const draft = { activeEventId: 'event-a', brief: { uploadedImages: [{ id: 'owned-photo', url: 'signed-link' }] }, previewSelection: { itemIds: ['chair'], mode: 'manual' }, renderId: 'preview-a', basket: [{ itemId: 'basket-only', quantity: 1 }] };
  assert.equal(persistPlanningDraft(storage, 'styled:design:account-a', draft), true);
  assert.deepEqual(JSON.parse(storage.getItem('styled:design:account-a')), draft);
  assert.equal(storage.getItem('styled:design:account-b'), undefined);
  assert.equal(persistPlanningDraft({ setItem() {}, getItem: () => null }, 'key', draft), false);
  assert.equal(persistPlanningDraft(() => { throw Error('Storage access blocked'); }, 'key', draft), false);
  assert.equal(persistPlanningDraft({ setItem() { throw Error('Full'); }, getItem() {} }, 'key', draft), false);
});

test('design browser leave handler is absent for recoverable local drafts even when a legacy session is dirty', () => {
  const source = fs.readFileSync('app/design/page.tsx', 'utf8');
  const file = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let guard;
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(file) === 'useEffect' && node.arguments[0]?.getText(file).includes('"beforeunload"')) guard = node.arguments[0].getText(file);
    ts.forEachChild(node, visit);
  }
  visit(file); assert.ok(guard);
  const vm = require('node:vm');
  for (const [dirty, failed, expected] of [[false, false, 0], [true, false, 0], [false, true, 0], [true, true, 1]]) {
    const listeners = [];
    const cleanup = vm.runInNewContext(ts.transpileModule(`(${guard})()`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, { workspaceDirty: dirty, draftWriteFailed: failed, window: { addEventListener: (name, listener) => listeners.push({ name, listener }), removeEventListener: () => listeners.pop() } });
    assert.equal(listeners.length, expected);
    if (expected) { let prevented = false; listeners[0].listener({ preventDefault() { prevented = true; } }); assert.equal(prevented, true); cleanup(); assert.equal(listeners.length, 0); }
  }
});

test('venue form comparison ignores field/key order, detects real edits and equates a reverted form', () => {
  const h = harness(), { formDraftFingerprint } = h.load('components/wedding/form-draft');
  const baseline = [['name', 'My venue'], ['features', 'parking'], ['features', 'garden'], ['supplier_policy', '{"mode":"open","suppliers":[]}']];
  const fingerprint = formDraftFingerprint(baseline);
  const hydrated = [['supplier_policy', '{"suppliers":[],"mode":"open"}'], ['features', 'garden'], ['name', 'My venue'], ['features', 'parking']];
  assert.equal(formDraftFingerprint(hydrated), fingerprint);
  const edited = hydrated.map(([key, value]) => [key, key === 'name' ? 'Changed venue' : value]);
  assert.notEqual(formDraftFingerprint(edited), fingerprint);
  assert.equal(formDraftFingerprint(baseline), fingerprint);
  assert.notEqual(formDraftFingerprint([...baseline, ['tour_url', 'https://example.test/tour']]), fingerprint);
});

test('complete local workspace snapshots recover new events, every render ID and independent preview products with revision protection', () => {
  const h = harness(), { newEventBrief, createPlanningDraft, recoverPlanningWorkspace, persistPlanningDraft } = h.load('components/wedding/planning-state');
  const { eventWorkspace, FIRST_EVENT_ID } = h.load('lib/event-plans');
  const brief = newEventBrief();
  const one = '00000000-0000-4000-8000-000000000021', two = '00000000-0000-4000-8000-000000000022', nextId = '00000000-0000-4000-8000-000000000002';
  let workspace = eventWorkspace(brief, [], [], FIRST_EVENT_ID, [{ itemId: 'basket-a', quantity: 1 }], one, { itemIds: ['preview-a'], mode: 'manual' });
  workspace = eventWorkspace({ ...brief, weddingDate: future }, [], workspace.events, nextId, [{ itemId: 'basket-b', quantity: 2 }], two, { itemIds: ['preview-b'], mode: 'auto' });
  const draft = createPlanningDraft(workspace, brief, 4);
  let stored;
  assert.equal(persistPlanningDraft({ setItem: (_key, value) => { stored = value; }, getItem: () => stored }, 'account-a', draft), true);
  const recovered = recoverPlanningWorkspace(JSON.parse(stored), 4);
  assert.equal(recovered.activeEventId, nextId);
  assert.deepEqual(recovered.events.map(event => event.renderId), [one, two]);
  assert.deepEqual(recovered.events.map(event => event.previewSelection.itemIds), [['preview-a'], ['preview-b']]);
  assert.deepEqual(recovered.events.map(event => event.basket[0].itemId), ['basket-a', 'basket-b']);
  assert.equal(recoverPlanningWorkspace(draft, 5), null);
  assert.equal(recoverPlanningWorkspace({ ...draft, workspace: { events: [] } }, 4), null);
  const newlyCreated = createPlanningDraft(workspace, brief, 0);
  assert.equal(recoverPlanningWorkspace(newlyCreated, 0).events.length, 2);
});

test('public preview links select only catalogue-eligible products exactly once, including permitted demo previews, with no basket action', () => {
  const source = fs.readFileSync('app/design/page.tsx', 'utf8');
  const file = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let effect;
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(file) === 'useEffect' && node.arguments[0]?.getText(file).includes('previewFromLink.current')) effect = node.arguments[0].getText(file);
    ts.forEachChild(node, visit);
  }
  visit(file); assert.ok(effect);
  const vm = require('node:vm'), code = ts.transpileModule(`(${effect})()`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  for (const eligible of [true, false]) {
    let selection = { itemIds: ['existing'], mode: 'auto' }, touched = false, destination;
    const context = { brief: { venueId: 'manor_orangery' }, venueScope: null, restored: true, workspaceLoaded: true, catalogueLoading: false, catalogueError: null, params: new URLSearchParams('preview=demo-preview'), previewFromLink: { current: null }, getItem: () => eligible ? { id: 'demo-preview', name: 'Permitted demo', demoOnly: true } : undefined, setWorkspaceTouched: value => { touched = value; }, setPreviewSelection: update => { selection = update(selection); }, setActionNotice() {}, URL, window: { location: { href: 'https://development.test/design?preview=demo-preview' }, history: { replaceState(_a, _b, value) { destination = value; } } }, setBasket() { throw Error('Preview must not touch basket'); } };
    vm.runInNewContext(code, context);
    assert.equal(selection.itemIds.includes('demo-preview'), eligible);
    assert.equal(touched, eligible);
    assert.equal(destination.searchParams.has('preview'), false);
    assert.equal(destination.searchParams.get('tab'), eligible ? 'visualiser' : 'catalogue');
    const length = selection.itemIds.length;
    vm.runInNewContext(code, context);
    assert.equal(selection.itemIds.length, length);
  }
});

test('catalogue, visualiser and below-preview details share preview selection callbacks while basket mutations remain separate', () => {
  const source = fs.readFileSync('app/design/page.tsx', 'utf8');
  const file = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const elements = new Map(), functions = new Map();
  function visit(node) {
    if (ts.isJsxSelfClosingElement(node) && ['ProductBrowser', 'RenderStage', 'LookProducts'].includes(node.tagName.getText(file))) elements.set(node.tagName.getText(file), Object.fromEntries(node.attributes.properties.filter(ts.isJsxAttribute).map(attr => [attr.name.getText(file), attr.initializer?.expression?.getText(file)])));
    if (ts.isFunctionDeclaration(node) && ['toggleVisualiserProduct', 'removePreviewItem', 'changePreviewMode'].includes(node.name?.text)) functions.set(node.name.text, node.getText(file));
    ts.forEachChild(node, visit);
  }
  visit(file);
  for (const name of ['ProductBrowser', 'LookProducts']) {
    assert.equal(elements.get(name).selectedVisualiserIds, 'previewSelection.itemIds');
    assert.equal(elements.get(name).onVisualise, 'toggleVisualiserProduct');
  }
  assert.equal(elements.get('RenderStage').itemIds, 'previewSelection.itemIds');
  assert.equal(elements.get('RenderStage').onRemoveItem, 'removePreviewItem');
  assert.equal(elements.get('RenderStage').onSelectionMode, 'changePreviewMode');
  const h = harness(), { togglePreviewItem } = h.load('lib/event-plans'), vm = require('node:vm');
  let selection = { itemIds: ['one'], mode: 'manual' };
  const context = { workspaceLock: { current: false }, activeEventRef: { current: 'event-a' }, activeEventId: 'event-a', togglePreviewItem, setWorkspaceTouched() {}, setPreviewSelection: update => { selection = update(selection); }, setBasket() { throw Error('Separate basket'); } };
  const invoke = (name, argument) => vm.runInNewContext(ts.transpileModule(`${functions.get(name)}; ${name}(${JSON.stringify(argument)})`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, context);
  invoke('toggleVisualiserProduct', { id: 'two', demoOnly: true }); assert.deepEqual([...selection.itemIds], ['one', 'two']);
  invoke('changePreviewMode', 'auto'); assert.equal(selection.mode, 'auto'); assert.deepEqual([...selection.itemIds], ['one', 'two']);
  invoke('removePreviewItem', 'one'); assert.deepEqual([...selection.itemIds], ['two']);
  context.activeEventRef.current = 'event-b'; invoke('toggleVisualiserProduct', { id: 'stale' }); assert.deepEqual([...selection.itemIds], ['two']);
});


test('preview link waits for the restored venue catalogue and never consumes an unrestricted or pending result', () => {
  const file = ts.createSourceFile('page.tsx', fs.readFileSync('app/design/page.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let effect;
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(file) === 'useEffect' && node.arguments[0]?.getText(file).includes('previewFromLink.current')) effect = node.arguments[0].getText(file);
    ts.forEachChild(node, visit);
  }
  visit(file); assert.ok(effect);
  const vm = require('node:vm'), code = ts.transpileModule(`(${effect})()`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  for (const allowed of [false, true]) {
    let reads = 0, destination, selection = { itemIds: [], mode: 'manual' };
    const context = { brief: { venueId: 'listing:restricted-venue' }, venueScope: null, restored: true, workspaceLoaded: true, catalogueLoading: false, catalogueError: null, params: new URLSearchParams('preview=product'), previewFromLink: { current: null }, getItem() { reads++; return { id: 'product', name: 'Unrestricted product' }; }, setWorkspaceTouched() {}, setPreviewSelection(update) { selection = update(selection); }, setActionNotice() {}, URL, window: { location: { href: 'https://development.test/design?preview=product' }, history: { replaceState(_a, _b, url) { destination = url; } } } };
    const run = () => vm.runInNewContext(code, context);
    run(); // Restored venue effect has scheduled a restricted load; this render still holds the public catalogue.
    assert.equal(reads, 0); assert.equal(destination, undefined); assert.equal(context.previewFromLink.current, null);
    context.venueScope = { slug: 'different-venue' }; run(); assert.equal(reads, 0);
    context.venueScope = { slug: 'restricted-venue' }; context.catalogueLoading = true; run(); assert.equal(reads, 0);
    context.catalogueLoading = false;
    context.getItem = () => { reads++; return allowed ? { id: 'product', name: 'Allowed venue product' } : undefined; };
    run();
    assert.equal(reads, 1); assert.equal(selection.itemIds.includes('product'), allowed);
    assert.equal(destination.searchParams.has('preview'), false);
    assert.equal(destination.searchParams.get('tab'), allowed ? 'visualiser' : 'catalogue');
    run(); assert.equal(reads, 1);
  }
  let consumed = false;
  const context = { brief: { venueId: 'manor_orangery' }, venueScope: { slug: 'previous-venue' }, restored: true, workspaceLoaded: true, catalogueLoading: false, catalogueError: null, params: new URLSearchParams('preview=product'), previewFromLink: { current: null }, getItem() { consumed = true; } };
  vm.runInNewContext(code, context);
  assert.equal(consumed, false); assert.equal(context.previewFromLink.current, null);
});


test('header countdown shows the event date in full and updates when the active event changes', () => {
  const h = harness(), Component = h.load('components/wedding/EventCountdown').default;
  const props = { name: 'Ceremony', date: '2039-11-27' };
  h.render(Component, props);
  const cleanups = h.effects.splice(0).map(effect => effect());
  try {
    const first = h.render(Component, props);
    assert.match(text(first), /days to go/);
    assert.match(text(first), /27 November 2039/);
    const next = h.render(Component, {name: 'Reception', date: '2039-12-01'});
    assert.match(text(next), /1 December 2039/);
  } finally { cleanups.forEach(cleanup => cleanup?.()); }
});

test('compact event controls retain switch/save callbacks and event creation behind Manage', async () => {
  const h = harness(), Component = h.load('components/wedding/EventPlans').default;
  const { newEventBrief } = h.load('components/wedding/planning-state');
  const events = [{ id: 'one', name: 'Ceremony' }, { id: 'two', name: 'Evening reception' }];
  const switches = [], creates = []; let saves = 0;
  const props = { compact: true, events, activeId: 'one', brief: { ...newEventBrief(), weddingDate: future }, dirty: true, disabled: false, onSave: async () => { saves++; return true; }, onSwitch: async id => { switches.push(id); return true; }, onCreate: async (name, kind) => { creates.push({ name, kind }); return true; } };
  let tree = h.render(Component, props);
  const cleanups = h.effects.splice(0).map(effect => effect());
  try {
    tree = h.render(Component, props);
    assert.equal(nodes(tree).some(node => node.props?.['aria-label'] === 'Current event countdown'), false);
    assert.equal(nodes(tree).some(node => node.type === 'form'), false);
    nodes(tree).find(node => node.type === 'select').props.onChange({ target: { value: 'two' } });
    assert.deepEqual(switches, ['two']); assert.equal(props.activeId, 'one');
    await nodes(tree).find(node => node.type === 'button' && text(node) === 'Save plan').props.onClick(); assert.equal(saves, 1);
    nodes(tree).find(node => node.props?.['aria-label'] === 'Manage event').props.onClick();
    tree = h.render(Component, props);
    nodes(tree).find(node => node.type === 'button' && text(node) === 'Add event').props.onClick();
    tree = h.render(Component, props);
    nodes(tree).find(node => node.type === 'input').props.onChange({ target: { value: 'Welcome dinner' } });
    tree = h.render(Component, props);
    await nodes(tree).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
    assert.deepEqual(creates, [{ name: 'Welcome dinner', kind: 'ceremony' }]);
    assert.deepEqual(events.map(event => event.name), ['Ceremony', 'Evening reception']);
    tree = h.render(Component, props);
    assert.equal(nodes(tree).some(node => node.type === 'form'), false);
  } finally { cleanups.forEach(cleanup => cleanup?.()); }
});

test('navigation has readable labels and mobile browse keeps its two real destinations', () => {
  const h = harness(), Component = h.load('components/design/StudioNavigation').default;
  const selected = [], props = { active: 'saved', onSelect: tab => selected.push(tab), mobile: true };
  let tree = h.render(Component, props);
  assert.match(tree.props.className, /fixed.*bottom-0/);
  assert.equal(nodes(tree).filter(node => node.type === 'button').length, 6);
  assert.ok(nodes(tree).filter(node => node.type === 'button').every(node => node.props.className.includes('text-[11px]')));
  nodes(tree).find(node => node.type === 'button' && node.props['aria-haspopup'] === true).props.onClick();
  tree = h.render(Component, props);
  nodes(tree).find(node => node.type === 'button' && text(node) === 'Catalogue products').props.onClick();
  assert.deepEqual(selected, ['catalogue']);
  tree = h.render(Component, { ...props, mobile: false });
  assert.ok(nodes(tree).filter(node => node.type === 'button').every(node => node.props.className.includes('text-sm')));
});
