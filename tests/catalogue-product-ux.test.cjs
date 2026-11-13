const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const item = { id: 'chairs-1', name: 'Oak chair', category: 'furniture', supplier: 'Oak supplier', supplierId: 'oak', supplierArea: 'Essex', unitPrice: 12, unit: 'each', qtyRule: 'fixed', styles: [], icon: 'C', swatch: '#ddd', rating: 0, reviewCount: 0, leadTimeDays: 0, stock: 'in_stock' };
let params = new URLSearchParams();
let catalogue = { items: [item], loading: false, error: null };
function load(relative, hookState) {
  const file = path.resolve(relative);
  const m = new Module(file, module);
  m.paths = module.paths;
  m.require = (id) => {
    if (id === 'react' && hookState) return { ...React, useState: () => [hookState.quantity, () => {}], useEffect: () => {} };
    if (id === 'next/navigation') return { useSearchParams: () => params };
    if (id === '@/components/catalogue/CatalogueProvider') return { useCatalogue: () => catalogue };
    if (id.startsWith('@/') || id.startsWith('.')) {
      const base = id.startsWith('@/') ? path.resolve(id.slice(2)) : path.resolve(path.dirname(file), id);
      if(base.endsWith('.json'))return JSON.parse(fs.readFileSync(base,'utf8'));
      return load(fs.existsSync(base + '.tsx') ? base + '.tsx' : base + '.ts', hookState);
    }
    return require(id);
  };
  m._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, file);
  return m.exports;
}
const nav = load('app/(site)/products/[id]/navigation.ts');
const noop = () => {};
const render = (file, props) => renderToStaticMarkup(React.createElement(load(file).default, props));
const browserProps = { styleId: '', basket: [], weddingDate: '', availability: { items: null, loading: false, error: null }, onDates: noop, onWeddingDate: noop, onAdd: noop, onRemove: noop, onQty: noop, savedItemIds: [], savesLoaded: true, savingItems: new Set(), onToggleSave: noop };

test('public return links retain catalogue filters but reject outside destinations and actions', () => {
  const href = nav.catalogueReturnHref('/design?tab=catalogue&category=furniture&supplier=oak&q=oak+chair&min=5&sort=price_up&add=bad&product=old', 'lighting');
  const query = new URL(href, 'https://local.test').searchParams;
  assert.equal(query.get('category'), 'furniture');
  assert.equal(query.get('q'), 'oak chair');
  assert.equal(query.get('supplier'), 'oak');
  assert.equal(query.get('min'), '5');
  assert.equal(query.get('sort'), 'price_up');
  assert.equal(query.has('add'), false);
  assert.equal(query.has('product'), false);
  for (const invalid of ['https://outside.test', '//outside.test', 'javascript:alert(1)', ['/design?tab=catalogue'], '/design/other?tab=catalogue']) {
    assert.equal(nav.catalogueReturnHref(invalid, 'lighting'), '/design?tab=catalogue&category=lighting');
  }
});
test('Add to basket keeps filters and explicitly selects the real product; previews cannot enter basket', () => {
  const href = nav.studioProductHref('/design?tab=catalogue&supplier=oak&q=chair', item.id);
  const query = new URL(href, 'https://local.test').searchParams;
  assert.equal(query.get('product'), item.id);
  assert.equal(query.get('add'), item.id);
  assert.equal(query.get('supplier'), 'oak');
  assert.equal(query.get('q'), 'chair');
  assert.equal(new URL(nav.studioProductHref('/design?tab=catalogue', 'preview', false), 'https://local.test').searchParams.has('add'), false);
});
test('public details are a full page with supplier link, missing-photo state and studio handoff', () => {
  const html = render('components/design/ProductDetails.tsx', { item, presentation: 'page', browseHref: '/design?tab=catalogue&q=chair', studioHref: '/design?tab=catalogue&product=chairs-1&add=chairs-1' });
  assert.match(html, /<h1[^>]*>Oak chair/);
  assert.match(html, /href="\/suppliers\/oak"/);
  assert.match(html, /Photo not supplied/);
  assert.match(html, /Add to basket/);
  assert.match(html, /No payment is taken/);
  assert.doesNotMatch(html, /<dialog|BoardPicker|Add to board/);
});
test('catalogue offers basket, details and optional visualiser actions without date editing', () => {
  params = new URLSearchParams();
  const html = render('components/design/ProductBrowser.tsx', { ...browserProps, onVisualise: noop });
  assert.match(html, /grid-cols-1/);
  assert.match(html, /View product/);
  assert.match(html, /Select for preview/);
  assert.match(html, /Edit in Wedding plan/);
  assert.match(html, /Dates not checked/);
  assert.match(html, /Add to basket/);
  assert.doesNotMatch(html, /type="date"|Add to board|overflow-x-auto/);
});
test('studio product deep link opens full detail and quantity without an overlay', () => {
  params = new URLSearchParams({ product: item.id });
  const html = render('components/design/ProductBrowser.tsx', { ...browserProps, onVisualise: noop });
  assert.match(html, /<h1[^>]*>Oak chair/);
  assert.match(html, /Add to basket/);
  assert.match(html, /Quantity/);
  assert.match(html, /Select for preview/);
  assert.match(html, /Public product page/);
  assert.doesNotMatch(html, /<dialog/);
  params = new URLSearchParams();
});
test('pre-add quantity is applied after adding and invalid quantities cannot be submitted', () => {
  const calls = [];
  const props = { item, onAdd: (i) => calls.push(['add', i.id]), onQty: (id, quantity) => calls.push(['quantity', id, quantity]), availability: { status: 'available', availableUnits: 5, requiredQty: 1 } };
  function buttons(node, result = []) {
    if (!node || typeof node !== 'object') return result;
    if (node.type === 'button') result.push(node);
    React.Children.forEach(node.props?.children, (child) => buttons(child, result));
    return result;
  }
  const Control = load('components/design/ProductPurchase.tsx', { quantity: 3 }).default;
  const add = buttons(Control(props)).find((b) => b.props.children === 'Add to basket');
  assert.equal(add.props.disabled, false);
  add.props.onClick();
  assert.deepEqual(calls, [['add', item.id], ['quantity', item.id, 3]]);
  for (const quantity of [0, -1, 1.5, 6, NaN]) {
    const Control = load('components/design/ProductPurchase.tsx', { quantity }).default;
    const add = buttons(Control(props)).find((b) => b.props.children === 'Add to basket');
    assert.equal(add.props.disabled, true);
  }
});

test('place matching from the location owner is preserved, including an empty result', () => {
  const included = render('components/design/ProductBrowser.tsx', { ...browserProps, placeMatches: { oak: {} } });
  assert.match(included, /Oak chair/);
  const excluded = render('components/design/ProductBrowser.tsx', { ...browserProps, placeMatches: {} });
  assert.doesNotMatch(excluded, /Oak chair/);
  assert.match(excluded, /No pieces match your filters/);
});

test('card preview state is controlled by preview IDs, independently of basket contents', () => {
  params = new URLSearchParams();
  const notSelected = render('components/design/ProductBrowser.tsx', { ...browserProps, basket: [{ itemId: item.id, quantity: 12 }], onVisualise: noop, selectedVisualiserIds: [] });
  assert.match(notSelected, /aria-pressed="false" aria-label="Select Oak chair for preview"/);
  const selected = render('components/design/ProductBrowser.tsx', { ...browserProps, basket: [], onVisualise: noop, selectedVisualiserIds: [item.id] });
  assert.match(selected, /aria-pressed="true" aria-label="Remove Oak chair from preview"/);
  assert.match(selected, />Selected<\/button>/);
});

test('preview toggle passes the item back without adding or removing basket lines', () => {
  const calls = [];
  const Control = load('components/design/ProductPreviewSelection.tsx').default;
  for (const ids of [[], [item.id]]) {
    const control = Control({ item, selectedVisualiserIds: ids, onVisualise: (product) => calls.push(product) });
    assert.equal(control.type, 'button');
    assert.equal(control.props['aria-pressed'], ids.includes(item.id));
    control.props.onClick();
  }
  assert.deepEqual(calls, [item, item]);
});

test('development preview products can be selected on cards and details while booking stays unavailable', () => {
  const preview = { ...item, id: 'demo-crescent-moon-empire-90', name: 'Empire 90', demoOnly: true, imageKind: 'supplier_reference', image: '/img/items/crescent-moon-demo/empire-90.webp', demoPricing: { dailyHireGBP: 200, deliverySetupCollectionGBP: 90, damageDepositGBP: 150 } };
  catalogue = { ...catalogue, items: [preview] };
  try {
    const cards = render('components/design/ProductBrowser.tsx', { ...browserProps, onVisualise: noop, selectedVisualiserIds: [preview.id] });
    assert.match(cards, /aria-pressed="true" aria-label="Remove Empire 90 from preview"/);
    const details = render('components/design/ProductDetails.tsx', { item: preview, presentation: 'page', onAdd: noop, onVisualise: noop, selectedVisualiserIds: [preview.id] });
    assert.match(details, /aria-pressed="true" aria-label="Remove Empire 90 from preview"/);
    assert.doesNotMatch(details, /Add to basket/);
    assert.match(details, /Delivery, setup and collection/);
    assert.match(details, /Refundable damage deposit/);
    assert.match(details, /£90/);
    assert.match(details, /£150/);
  } finally { catalogue = { ...catalogue, items: [item] }; }
});

test('standalone preview handoff preserves catalogue state and never triggers basket add', () => {
  const { previewStudioHref } = load('lib/product-preview-navigation.ts');
  const url = new URL(previewStudioHref('demo-crescent-moon-empire-90', '/design?tab=catalogue&supplier=oak&q=chair&venue=hall&add=wrong'), 'https://local.test');
  assert.equal(url.pathname, '/design');
  assert.equal(url.searchParams.get('preview'), 'demo-crescent-moon-empire-90');
  assert.equal(url.searchParams.get('product'), 'demo-crescent-moon-empire-90');
  assert.equal(url.searchParams.get('supplier'), 'oak');
  assert.equal(url.searchParams.get('q'), 'chair');
  assert.equal(url.searchParams.get('venue'), 'hall');
  assert.equal(url.searchParams.has('add'), false);
  const html = render('components/design/ProductDetails.tsx', { item, presentation: 'page', studioHref: '/design?tab=catalogue&add=chairs-1' });
  assert.match(html, /Select for preview in studio/);
  assert.match(html, /preview=chairs-1/);
});

test('gallery image information appears once and cards do not repeat image notices', () => {
  catalogue = { ...catalogue, items: [item, { ...item, id: 'chair-2' }] };
  try {
    const html = render('components/design/ProductBrowser.tsx', { ...browserProps, onVisualise: noop });
    assert.equal((html.match(/About catalogue images/g) || []).length, 1);
    const cards = html.slice(html.indexOf('<article'));
    assert.doesNotMatch(cards, /Illustrative catalogue image|Image source unverified|No product photograph supplied/);
    const details = render('components/design/ProductDetails.tsx', { item, presentation: 'page' });
    assert.equal((details.match(/Image information/g) || []).length, 1);
    assert.doesNotMatch(details, /No verified reviews|Not supplied\. Ask the supplier/);
    assert.equal((details.match(/Ask supplier for missing specifications/g) || []).length, 1);
  } finally { catalogue = { ...catalogue, items: [item] }; }
});


test('price-on-request catalogue cards still offer the basket action',()=>{
 const previous=catalogue;
 try{const requestItem=load('lib/crescent-moon-demo-catalogue.ts').crescentMoonDemoCatalogue().find(i=>i.priceOnRequest);assert.ok(requestItem);catalogue={items:[requestItem],loading:false,error:null};params=new URLSearchParams();const html=render('components/design/ProductBrowser.tsx',browserProps);assert.match(html,/Price on request/);assert.match(html,/Add to basket/);}finally{catalogue=previous;}
});
