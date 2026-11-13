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
    if (id === '@/lib/server/catalogue') return { loadCatalogue: async () => [] };
    if (id === '@/lib/supabase/admin') return { createAdminClient: () => ({ from: () => { throw Error('Request-only quotes must not look up invented suppliers'); } }) };
    if (id === '@/components/availability/useAvailability') return { useBasketAvailability: () => ({ lines: Object.fromEntries(products.map(i=>[i.id,{status:'request_only',availableUnits:null,requiredQty:1}])), loading:false,error:null,checked:true,allAvailable:false }) };
    if (id === '@/components/session/useUser') return { useUser:()=>({email:'fixture@example.invalid'}) };
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

const products = load('lib/earth-village-catalogue.ts').earthVillageCatalogue();
const {quotePence} = load('lib/quote.ts');
const {supplierPreviewCatalogue} = load('lib/server/development-request-catalogue.ts');

test('tent package request preserves the supplier package price and collects no automatic deposit', () => {
  const quote = quotePence(products.filter(p=>['earth-village-stretch-tent-20x15','earth-village-furniture-150'].includes(p.id)).map(p => ({itemId:p.id,quantity:1})), id => products.find(p => p.id === id));
  assert.equal(quote.subtotalPence, 656200);
  assert.equal(quote.hasRequestOnlyItems, true);
  assert.equal(quote.depositPence, 0);
  assert.equal(products[0].slot, undefined);
  for (const item of products.filter(p=>p.image)) assert.ok(fs.existsSync(path.resolve('public' + item.image)));
  assert.equal(products.find(p=>p.id==='earth-village-stretch-tent-20x15').gallery.length, 4);
});

test('Alex’s four packages appear on the approved live aliases and development site', () => {
  const old = {...process.env};
  try {
    process.env.NODE_ENV='production';
    process.env.STYLED_PUBLIC_DEMO_ENABLED='true';
    process.env.NEXT_PUBLIC_SUPABASE_URL='https://yfwqcidkfjzpwbylgnug.supabase.co';
    for (const host of ['styleduk.com','www.styleduk.com']) {
      const items = supplierPreviewCatalogue(new Request('https://' + host + '/api/catalogue'));
      assert.deepEqual(items.filter(p => p.supplier === 'Earth Village Events').map(p => p.id), products.map(p => p.id));
    }
    assert.deepEqual(supplierPreviewCatalogue(new Request('https://unrelated.invalid/api/catalogue')), []);
    process.env.STYLED_PUBLIC_DEMO_ENABLED='false';
    assert.deepEqual(supplierPreviewCatalogue(new Request('https://styleduk.com/api/catalogue')), []);
    assert.equal(supplierPreviewCatalogue(new Request('https://styledukprodprogress.vercel.app/api/catalogue')).filter(p=>p.supplier==='Earth Village Events').length,4);
  } finally {
    for (const key of ['NODE_ENV','STYLED_PUBLIC_DEMO_ENABLED','NEXT_PUBLIC_SUPABASE_URL']) {
      if(old[key]===undefined) delete process.env[key]; else process.env[key]=old[key];
    }
  }
});


test("10 by 15 package keeps Alex's supplied prices, capacity, optional furniture and booking terms", () => {
  const tent=products.find(p=>p.id==='earth-village-stretch-tent-10x15');
  const furniture=products.find(p=>p.id==='earth-village-furniture-75');
  const quote=quotePence([tent,furniture].map(p=>({itemId:p.id,quantity:1})),id=>products.find(p=>p.id===id));
  assert.equal(tent.unitPrice,2850); assert.equal(furniture.unitPrice,550);
  assert.equal(quote.subtotalPence,340000); assert.equal(quote.depositPence,0);
  assert.equal(quote.hasRequestOnlyItems,true); assert.equal(tent.stock,'on_request');
  assert.equal(tent.slot,undefined); assert.equal(furniture.slot,undefined);
  assert.equal(tent.gallery.length,6);
  for(const photo of [{src:tent.image},...tent.gallery])assert.ok(fs.existsSync(path.resolve('public'+photo.src)));
  assert.equal(furniture.image,undefined, 'Do not advertise pictured crossback chairs as the supplied folding-chair package');
  assert.match(tent.dimensions,/15 × 20 m/); assert.match(tent.hireUnits,/75 seated.*100 seated.*100 evening/);
  assert.match(furniture.dimensions,/13 rustic trestle tables.*75 vintage folding chairs/);
  const details=tent.packageDetails.map(p=>p.text).join(' ');
  assert.match(details,/eight colour-changing uplighters/);assert.match(details,/£3,800/);assert.match(details,/£570/);assert.match(details,/14 working days/);assert.match(details,/five to six hours with three crew/);
});
