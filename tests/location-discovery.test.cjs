const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module'), ts = require('typescript');
function load(file, stubs = {}) {
  const absolute = path.resolve(file), m = new Module(absolute, module);
  m.paths = module.paths;
  m.require = id => {
    if (Object.hasOwn(stubs, id)) return stubs[id];
    if (id === 'server-only') return {};
    if (id === 'next/server') return { NextResponse: { json: (d, o) => new Response(JSON.stringify(d), o) } };
    if (id.startsWith('@/')) return load(id.slice(2) + '.ts', stubs);
    if (id.startsWith('.')) return load(path.resolve(path.dirname(absolute), id) + '.ts', stubs);
    return require(id);
  };
  m._compile(ts.transpileModule(fs.readFileSync(absolute, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, absolute);
  return m.exports;
}
const location = load('lib/location.ts');
const input = load('lib/supplier-location.ts').supplierLocationInput;
const SUPPLIER = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const VENUE = '33333333-3333-4333-8333-333333333333';
// Fictional listings, kept entirely in memory.
const items = [{ supplierId: SUPPLIER, supplierArea: 'Chelmsford, Essex' }, { supplierId: OTHER, supplierArea: '' }];
const venues = [{ id: VENUE, slug: 'test-venue', name: 'Test venue', location: 'Chelmsford', county: 'Essex' }];
const origin = { latitude: 51.7, longitude: 0.1, postcode: 'CM1 1AA' };
const request = body => new Request('https://styled.test/api/discovery', { method: 'POST', headers: { origin: 'https://styled.test', 'content-type': 'application/json' }, body: JSON.stringify(body) });
function discovery({ rows = [], allowed = true, error = null, catalogue = items, scoped = items, lookup = async () => origin } = {}) {
  const calls = [];
  const admin = { rpc: async () => ({ data: allowed }), from: table => ({ select: async columns => { calls.push({ table, columns }); return { data: rows, error }; } }) };
  const route = load('app/api/discovery/route.ts', {
    '@/lib/supabase/admin': { createAdminClient: () => admin },
    '@/lib/server/catalogue': { loadCatalogue: async () => catalogue },
    '@/lib/server/venues': { loadPublicVenues: async () => venues },
    '@/lib/server/venue-catalogue': { venueCatalogue: async () => ({ items: scoped }) },
    '@/lib/server/limits': { clientIpHash: () => 'test' },
    '@/lib/server/geocode': { lookupPostcode: lookup },
  });
  return { ...route, calls };
}
test('place names match public areas with case, accents and word boundaries', () => {
  assert.equal(location.matchesPlace('ESSEX', 'Chelmsford, Essex'), true);
  assert.equal(location.matchesPlace('St Albans', 'St. Albans, Herts'), true);
  assert.equal(location.matchesPlace('Bath', 'Bathgate'), false);
  assert.equal(location.matchesPlace('Essex', null, ''), false);
  assert.equal(location.matchesPlace('   ', 'Chelmsford'), false);
});
test('place discovery uses saved public fields without inventing coordinates or calling geocoding', async () => {
  const route = discovery({ lookup: async () => { throw Error('Must not geocode a place'); } });
  const response = await route.POST(request({ query: 'Essex' })), body = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(body.placeMatches.suppliers, { [SUPPLIER]: 'Chelmsford, Essex' });
  assert.equal(body.placeMatches.venues['test-venue'], 'Chelmsford, Essex');
  assert.deepEqual(body.suppliers, {});
  assert.deepEqual(body.venues, {});
  assert.deepEqual(route.calls, []);
  assert.match(response.headers.get('cache-control'), /no-store/);
});
test('legacy postcode field also accepts place input; no-match remains explicitly empty', async () => {
  let response = await discovery().POST(request({ postcode: 'Essex' }));
  assert.ok((await response.json()).placeMatches.suppliers[SUPPLIER]);
  response = await discovery().POST(request({ query: 'No such place' }));
  assert.deepEqual((await response.json()).placeMatches, { suppliers: {}, venues: {} });
  for (const query of ['', 'A', '1234', '\x00Essex']) assert.equal((await discovery().POST(request({ query }))).status, 400);
  assert.equal((await discovery().POST(request([]))).status, 400);
});
test('existing public delivery coverage is searchable without a business coordinate', async () => {
  const response = await discovery({ catalogue: [{ supplierId: SUPPLIER, supplierArea: 'Chelmsford', supplierServiceArea: 'Essex and East London' }] }).POST(request({ query: 'East London' }));
  const body = await response.json();
  assert.equal(body.placeMatches.suppliers[SUPPLIER], 'Chelmsford · Essex and East London');
  assert.deepEqual(body.suppliers, {});
});
test('distance matching omits missing/malformed/private/unpublished records and keeps delivery boundaries exact', async () => {
  const rows = [
    { entity_type: 'supplier', entity_id: SUPPLIER, ...origin, radius_miles: 0, nationwide: false },
    { entity_type: 'supplier', entity_id: OTHER, latitude: null, longitude: 0 },
    { entity_type: 'supplier', entity_id: 'unpublished', ...origin },
    { entity_type: 'venue', entity_id: VENUE, ...origin },
    { entity_type: 'venue', entity_id: 'private', ...origin },
  ];
  let response = await discovery({ rows }).POST(request({ postcode: 'CM1 1AA' }));
  let body = await response.json();
  assert.deepEqual(body.suppliers, { [SUPPLIER]: { miles: 0, delivery: 'within_area' } });
  assert.deepEqual(body.venues, { 'test-venue': { miles: 0, delivery: 'unknown' } });
  assert.equal(JSON.stringify(body).includes('latitude'), false);
  assert.equal(JSON.stringify(body.suppliers).includes('postcode'), false);
  rows[0].latitude += 0.001; // Rounds to zero miles but lies outside a zero-mile delivery radius.
  body = await (await discovery({ rows }).POST(request({ point: origin }))).json();
  assert.equal(body.suppliers[SUPPLIER].delivery, 'outside_area');
  rows[0].nationwide = true;
  body = await (await discovery({ rows }).POST(request({ point: origin }))).json();
  assert.equal(body.suppliers[SUPPLIER].delivery, 'nationwide');
});
test('venue discovery honours the server-side allowed supplier set', async () => {
  const rows = [{ entity_type: 'venue', entity_id: VENUE, ...origin }, { entity_type: 'supplier', entity_id: SUPPLIER, ...origin }];
  const body = await (await discovery({ rows, scoped: [] }).POST(request({ venueSlug: 'test-venue' }))).json();
  assert.deepEqual(body.suppliers, {});
  rows[0].latitude = null;
  assert.equal((await discovery({ rows }).POST(request({ venueSlug: 'test-venue' }))).status, 422);
});
test('rate limits, unavailable location store and postcode errors are visible', async () => {
  assert.equal((await discovery({ allowed: false }).POST(request({ query: 'Essex' }))).status, 429);
  assert.equal((await discovery({ error: {} }).POST(request({ point: origin }))).status, 503);
  assert.equal((await discovery({ lookup: async () => { throw Error('Postcode not found'); } }).POST(request({ postcode: 'CM1 1AA' }))).status, 422);
});
test('supplier private location validation rejects malformed and unconfirmed records', () => {
  const valid = { action: 'save', postcode: 'CM1 1AA', confirmed: true, radius_miles: '', nationwide: false };
  assert.equal(input(valid).radius_miles, null);
  for (const radius of [0, '0', 500, '500']) assert.equal(input({ ...valid, radius_miles: radius }).radius_miles, Number(radius));
  for (const change of [{ confirmed: false }, { postcode: 'Essex' }, { radius_miles: true }, { radius_miles: {} }, { radius_miles: '1e2' }, { radius_miles: 501 }, { radius_miles: -1 }, { radius_miles: 2.5 }, { nationwide: 'yes' }]) assert.throws(() => input({ ...valid, ...change }));
});
function supplierRoute({ authorized = true, failure = null } = {}) {
  const calls = [];
  const admin = { from(table) {
    const call = { table, filters: [] }; calls.push(call);
    const q = { select(v) { call.select = v; return q; }, eq(k, v) { call.filters.push([k, v]); return q; }, delete() { call.delete = true; return q; }, upsert(v) { call.value = v; return Promise.resolve({ error: failure }); }, maybeSingle: async () => ({ data: { postcode: origin.postcode, radius_miles: null, nationwide: false }, error: failure }), then(a, b) { return Promise.resolve({ error: failure }).then(a, b); } }; return q;
  } };
  const route = load('app/api/vendor/location/route.ts', {
    '@/lib/server/vendor': { requireVendor: async () => authorized ? { ok: true, supplierId: SUPPLIER, admin } : { ok: false, response: new Response('', { status: 403 }) } },
    '@/lib/server/geocode': { lookupPostcode: async () => origin },
  });
  return { ...route, calls };
}
test('supplier location save/read/clear are membership-scoped and cannot overwrite another supplier', async () => {
  const route = supplierRoute();
  assert.equal((await route.GET(request({}))).status, 200);
  assert.deepEqual(route.calls[0].filters, [['entity_type', 'supplier'], ['entity_id', SUPPLIER]]);
  const response = await route.POST(request({ action: 'save', entity_id: OTHER, entity_type: 'venue', postcode: 'CM1 1AA', radius_miles: '25', nationwide: false, confirmed: true }));
  assert.equal(response.status, 200);
  assert.deepEqual(route.calls[1].value, { entity_type: 'supplier', entity_id: SUPPLIER, ...origin, radius_miles: 25, nationwide: false });
  const publicResult = await (await discovery({ rows: [route.calls[1].value] }).POST(request({ point: origin }))).json();
  assert.deepEqual(publicResult.suppliers[SUPPLIER], { miles: 0, delivery: 'within_area' });
  assert.equal((await route.POST(request({ action: 'clear', entity_id: OTHER }))).status, 200);
  assert.deepEqual(route.calls[2].filters, [['entity_type', 'supplier'], ['entity_id', SUPPLIER]]);
  const denied = supplierRoute({ authorized: false });
  assert.equal((await denied.POST(request({ action: 'clear' }))).status, 403);
  assert.equal((await denied.GET(request({}))).status, 403);
  assert.deepEqual(denied.calls, []);
  assert.equal((await supplierRoute({ failure: {} }).POST(request({ action: 'clear' }))).status, 503);
});
