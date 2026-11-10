const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module'), ts = require('typescript');
const React = require('react'), { renderToStaticMarkup } = require('react-dom/server');
const noop = () => {};
// Fictional, in-memory catalogue and venue records only.
const chair = { id: 'local-chair', name: 'Local chair', category: 'furniture', supplier: 'Test local supplier', supplierId: 'local', supplierArea: 'Chelmsford, Essex', unitPrice: 12, unit: 'each', qtyRule: 'fixed', styles: [], icon: 'C', swatch: '#ddd', rating: 0, reviewCount: 0, leadTimeDays: 0, stock: 'in_stock' };
const distant = { ...chair, id: 'other-chair', name: 'Other chair', supplierId: 'other', supplier: 'Other test supplier', supplierArea: 'Yorkshire' };
const items = [chair, distant];
function load(relative) {
  let file = path.resolve(relative);
  if (!path.extname(file)) file += fs.existsSync(file + '.tsx') ? '.tsx' : '.ts';
  const m = new Module(file, module); m.paths = module.paths;
  m.require = id => {
    if (id === 'next/navigation') return { useSearchParams: () => new URLSearchParams() };
    if (id === '@/components/catalogue/CatalogueProvider') return { useCatalogue: () => ({ items, loading: false, error: null }) };
    if (id.startsWith('@/')) return load(id.slice(2));
    if (id.startsWith('.')) return load(path.resolve(path.dirname(file), id));
    return require(id);
  };
  m._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, file);
  return m.exports;
}
const render = (file, props) => renderToStaticMarkup(React.createElement(load(file).default, props));
const browser = { styleId: '', basket: [], weddingDate: '', availability: { items: null, loading: false, error: null }, onDates: noop, onWeddingDate: noop, onAdd: noop, onRemove: noop, savedItemIds: [], savesLoaded: true, savingItems: new Set(), onToggleSave: noop };
test('studio catalogue filters by selected place IDs, shows stored names and never applies a radius to place matches', () => {
  const html = render('components/design/ProductBrowser', { ...browser, placeMatches: { local: 'Chelmsford, Essex' }, matches: { local: { miles: 400, delivery: 'outside_area' } }, searchRadius: 25 });
  assert.match(html, /id="item-local-chair"/);
  assert.doesNotMatch(html, /id="item-other-chair"/);
  assert.match(html, /Chelmsford, Essex/);
  assert.doesNotMatch(html, /Nearest suppliers|400 miles/);
});
test('empty place matches show no products; clearing restores products; account saves ignore the event location', () => {
  let html = render('components/design/ProductBrowser', { ...browser, placeMatches: {} });
  assert.doesNotMatch(html, /id="item-/);
  assert.match(html, /No pieces match your filters/);
  html = render('components/design/ProductBrowser', browser);
  assert.match(html, /id="item-local-chair"/);
  assert.match(html, /id="item-other-chair"/);
  html = render('components/design/ProductBrowser', { ...browser, savedOnly: true, savedItemIds: ['other-chair'], placeMatches: { local: 'Chelmsford, Essex' } });
  assert.match(html, /id="item-other-chair"/);
});
test('studio venue discovery consumes inherited place matches and can clear them', () => {
  const venue = { id: 'venue-local', slug: 'local-venue', name: 'Local test venue', location: 'Chelmsford', county: 'Essex', gallery_images: [], package_from_pence: null };
  const html = render('components/venues/VenueSearch', { active: false, initialVenues: [venue, { ...venue, id: 'venue-other', slug: 'other-venue', name: 'Other test venue', location: 'York', county: 'Yorkshire' }], placeMatches: { 'local-venue': 'Chelmsford, Essex' } });
  assert.match(html, /Local test venue/);
  assert.doesNotMatch(html, /Other test venue|miles from your chosen location/);
  assert.match(html, /Clear wedding location filter/);
});
test('shared studio location control handles supplier and venue no-match states without invented distances', () => {
  const result = { label: 'Essex', suppliers: {}, venues: {}, placeMatches: { suppliers: { local: 'Chelmsford, Essex' }, venues: {} } };
  const props = { result, onResult: noop, radius: 25, onRadius: noop };
  const supplierHtml = render('components/venues/LocationFilter', { ...props, entity: 'suppliers' });
  assert.match(supplierHtml, /Showing published locations matching Essex/);
  assert.match(supplierHtml, /maxLength="160"/);
  assert.match(supplierHtml, /Place name match/);
  assert.match(supplierHtml, /<select disabled=""/);
  const venueHtml = render('components/venues/LocationFilter', { ...props, entity: 'venues' });
  assert.match(venueHtml, /No published venue locations match Essex/);
});
test('studio wires the shared place picker and supplier/venue place maps to the actual consumers', () => {
  const source = fs.readFileSync('app/design/page.tsx', 'utf8');
  assert.match(source, /import LocationFilter from "@\/components\/venues\/LocationFilter"/);
  assert.match(source, /<LocationFilter\s+entity="suppliers"/);
  assert.match(source, /<VenueExplorer[\s\S]*?placeMatches=\{discovery\?\.placeMatches\?\.venues\}/);
  assert.match(source, /<ProductBrowser[\s\S]*?placeMatches=\{discovery\?\.placeMatches\?\.suppliers\}/);
});
