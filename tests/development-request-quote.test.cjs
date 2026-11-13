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
const products = load('lib/crescent-moon-demo-catalogue.ts').crescentMoonDemoCatalogue();
const { quotePence, buildQuote, formatGBP } = load('lib/quote.ts');
const { purchaseAvailability, canRequestItem } = load('lib/shopping.ts');
const { oneDayDemoTotal, cataloguePriceForSort } = load('lib/demo-pricing.ts');
const known = products.find(p => p.id.endsWith("empire-200"));
const unknown = products.find((p) => p.priceOnRequest);
const render = (relative, props) => renderToStaticMarkup(React.createElement(load(relative).default, props));
const noop = () => {};


const {priceBasket,publicQuote}=load('lib/server/quote.ts');
test('server request quote resolves only allowlisted development IDs, preserves null prices and checks displayed package total',async()=>{
 const before=process.env.NEXT_PUBLIC_SUPABASE_URL;process.env.NEXT_PUBLIC_SUPABASE_URL='https://qkyeitvwscrxbiwamxan.supabase.co';
 try{
  const req=new Request('https://styledukprodprogress.vercel.app/api/quote');
  assert.equal((await priceBasket([{itemId:"demo-crescent-moon-empire-90",quantity:1}],req)).ok,false,"Published demo fixtures must never fall back to an unowned snapshot");
  const result=await priceBasket([{itemId:known.id,quantity:1,seenUnitPricePence:oneDayDemoTotal(known)*100},{itemId:unknown.id,quantity:2}],req);
  assert.equal(result.ok,true);const q=publicQuote(result.quote);
  assert.equal(q.subtotalPence,oneDayDemoTotal(known)*100);assert.equal(q.lines[1].lineTotalPence,null);assert.equal(q.lines[1].unitPricePence,null);assert.equal(q.hasUnpricedLines,true);assert.equal(q.depositPence,null);
  assert.equal((await priceBasket([{itemId:'demo-crescent-moon-forged',quantity:1}],req)).ok,false);
  process.env.NEXT_PUBLIC_SUPABASE_URL='https://yfwqcidkfjzpwbylgnug.supabase.co';
  assert.equal((await priceBasket([{itemId:known.id,quantity:1}],req)).ok,false);
 }finally{if(before===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_URL;else process.env.NEXT_PUBLIC_SUPABASE_URL=before;}
});
test('basket and checkout show unpriced requests without free-price totals or customer mock disclaimers',()=>{
 catalogue={items:products,loading:false,error:null,getItem:id=>products.find(i=>i.id===id),refresh:noop};
 const props={basket:[{itemId:unknown.id,quantity:1}],guestCount:80,budget:1000,weddingDate:'2027-10-20',onItemDates:noop,onQty:noop,onRemove:noop,onCheckout:noop,onDates:noop,onWeddingDate:noop,onBack:noop,onOrdered:noop,venueLabel:'Test room',styleId:'classic_elegance'};
 for(const file of ['components/design/BasketPanel.tsx','components/design/CheckoutStep.tsx']){const html=render(file,props);assert.match(html,/Price on request|Awaiting quote/);assert.doesNotMatch(html,/£0(?:[<\s]|\.00)|Development request only|to spare/);}
});

test('supplier-generated product IDs remain valid through basket validation',()=>{
 const {validateBasket}=load('lib/server/quote.ts');
 const id='supplier-12345678-1234-4234-8234-123456789012-87654321-4321-4321-8321-210987654321';
 assert.equal(validateBasket([{itemId:id,quantity:1}]).ok,true);
 assert.equal(validateBasket([{itemId:'x'.repeat(129),quantity:1}]).ok,false);
});
