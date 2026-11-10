const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
let catalogue = { loading: false, error: null };
function load(relative, quantity) {
  const file = path.resolve(relative);
  if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(file, 'utf8'));
  const m = new Module(file, module);
  m.paths = module.paths;
  m.require = (id) => {
    if (id === '@/components/catalogue/CatalogueProvider') return { useCatalogue: () => catalogue };
    if (id === 'react' && quantity !== undefined) return { ...React, useState: () => [quantity, () => {}], useEffect: () => {} };
    if (id.startsWith('@/') || id.startsWith('.')) {
      const base = id.startsWith('@/') ? path.resolve(id.slice(2)) : path.resolve(path.dirname(file), id);
      return load(base.endsWith('.json') ? base : fs.existsSync(base + '.tsx') ? base + '.tsx' : base + '.ts', quantity);
    }
    return require(id);
  };
  m._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, file);
  return m.exports;
}
const products = load('lib/crescent-moon-demo-catalogue.ts').crescentMoonDemoCatalogue();
const { quotePence, buildQuote, formatGBP } = load('lib/quote.ts');
const { purchaseAvailability, canRequestItem } = load('lib/shopping.ts');
const { oneDayDemoTotal, cataloguePriceForSort } = load('lib/demo-pricing.ts');
const known = products.find((p) => !p.priceOnRequest);
const unknown = products.find((p) => p.priceOnRequest);
const render = (relative, props) => renderToStaticMarkup(React.createElement(load(relative).default, props));
const noop = () => {};

test('all allowlisted development chandeliers support manual requests without asserted stock', () => {
  assert.equal(products.length, 6);
  assert.ok(known);
  assert.ok(unknown);
  for (const product of products) {
    assert.equal(product.requestOnly, true);
    assert.equal(product.stock, 'on_request');
    assert.equal(canRequestItem(product), true);
    assert.equal(purchaseAvailability(product, { status: 'available', availableUnits: 2 }), undefined);
  }
  assert.equal(canRequestItem({ ...known, requestOnly: false }), false);
});

test('known request estimates exactly match the card package including delivery and deposit', () => {
  const amount = oneDayDemoTotal(known);
  assert.equal(known.unitPrice, amount);
  const quote = quotePence([{ itemId: known.id, quantity: 2 }], (id) => products.find((p) => p.id === id));
  assert.equal(quote.lines[0].unitPricePence, Math.round(amount * 100));
  assert.equal(quote.subtotalPence, Math.round(amount * 100) * 2);
  assert.equal(quote.hasRequestOnlyItems, true);
  assert.equal(quote.depositPence, 0);
  assert.equal(cataloguePriceForSort(known), amount);
});

test('unknown prices stay null, contribute no guessed amount and remain visible in a mixed request', () => {
  const quote = quotePence([{ itemId: known.id, quantity: 1 }, { itemId: unknown.id, quantity: 3 }], (id) => products.find((p) => p.id === id));
  const pending = quote.lines.find((l) => l.item.id === unknown.id);
  assert.equal(pending.unitPricePence, null);
  assert.equal(pending.lineTotalPence, null);
  assert.equal(quote.subtotalPence, oneDayDemoTotal(known) * 100);
  assert.equal(quote.hasUnpricedItems, true);
  assert.equal(quote.bySupplier[0].hasUnpricedItems, true);
  assert.equal(quote.depositPence, 0);
  const ui = buildQuote([{ itemId: unknown.id, quantity: 3 }], () => unknown);
  assert.equal(ui.lines[0].lineTotal, null);
  assert.equal(ui.hasUnpricedItems, true);
  assert.equal(formatGBP(ui.lines[0].lineTotal), 'Quoted separately');
  assert.equal(cataloguePriceForSort(unknown), null);
});

test('request controls add known and price-on-request chandeliers without claiming date availability', () => {
  for (const item of [known, unknown]) {
    const html = render('components/design/ProductPurchase.tsx', { item, onAdd: noop, onQty: noop, availability: { status: 'unavailable', availableUnits: 0, reason: 'blocked', requiredQty: 2 } });
    assert.match(html, /Add to basket/);
    assert.match(html, /Availability and final quote on request/);
    assert.doesNotMatch(html, /disabled=""|Available for your date|Only .* available|Unavailable for these dates/);
  }
});

test('a request add uses the chosen quantity and still blocks catalogue failures', () => {
  const calls = [];
  const Control = load('components/design/ProductPurchase.tsx', 3).default;
  function buttons(node, out = []) {
    if (!node || typeof node !== 'object') return out;
    if (node.type === 'button') out.push(node);
    React.Children.forEach(node.props?.children, (child) => buttons(child, out));
    return out;
  }
  const add = buttons(Control({ item: unknown, onAdd: (i) => calls.push(i.id), onQty: (id, q) => calls.push([id, q]) })).find((button) => button.props.children === 'Add to basket');
  assert.equal(add.props.disabled, false);
  add.props.onClick();
  assert.deepEqual(calls, [unknown.id, [unknown.id, 3]]);
  catalogue.error = 'Cannot load';
  try {
    assert.match(render('components/design/ProductPurchase.tsx', { item: unknown, onAdd: noop }), /disabled=""/);
  } finally { catalogue.error = null; }
});

test('public request details hand off both basket add and independent preview without zero-price claims', () => {
  const html = render('components/design/ProductDetails.tsx', { item: unknown, presentation: 'page', studioHref: `/design?tab=catalogue&product=${unknown.id}` });
  assert.match(html, /Price on request/);
  assert.match(html, /add=demo-crescent-moon-/);
  assert.match(html, /Select for preview in studio/);
  assert.doesNotMatch(html, /£0|Available for your date|Total due/);
});
