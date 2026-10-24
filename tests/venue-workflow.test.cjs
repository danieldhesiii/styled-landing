const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
function load(file, stubs = {}) {
  const absolute = path.resolve(file), m = new Module(absolute, module);
  m.paths = module.paths;
  m.require = (id) => {
    if (Object.hasOwn(stubs, id)) return stubs[id];
    if (id === 'next/server') return { NextResponse: { json: (data, options) => new Response(JSON.stringify(data), options) }, after: () => {} };
    if (id.startsWith('@/')) return load(id.slice(2) + '.ts', stubs);
    if (id.startsWith('.')) return load(path.resolve(path.dirname(absolute), id) + '.ts', stubs);
    return require(id);
  };
  m._compile(ts.transpileModule(fs.readFileSync(absolute, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, absolute);
  return m.exports;
}
const ID = '11111111-1111-4111-8111-111111111111';
const VENUE = '22222222-2222-4222-8222-222222222222';
const DAY = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
const rules = load('lib/venue-workflow.ts');
const input = load('lib/venue-input.ts');
const details = load('lib/venue-details.ts');
function database(resolve = () => ({ data: null, error: null })) {
  const queries = [], calls = [];
  return { queries, calls,
    from(table) {
      const q = { table, filters: [], operation: 'select' };
      const chain = {};
      for (const method of ['select','eq','in','gte','lte','order','limit','insert','update','delete']) chain[method] = (...args) => {
        if (['insert','update','delete'].includes(method)) { q.operation = method; q.value = args[0]; }
        else q.filters.push([method, ...args]);
        return chain;
      };
      const finish = () => { queries.push(q); return resolve(q); };
      chain.single = chain.maybeSingle = async () => finish();
      chain.then = (a, b) => Promise.resolve(finish()).then(a, b);
      return chain;
    },
    async rpc(name, args) { calls.push({ name, args }); return { data: name === 'hit_rate_limit' ? true : null, error: null }; },
  };
}
const post = (url, body) => new Request(`https://styled.test${url}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://styled.test' }, body: JSON.stringify(body) });
function authStub(db, user = 'customer') { return { requireVenueAccount: async () => ({ ok: true, user: { id: user, email: 'verified@example.com' }, admin: db, supabase: db }), londonToday: () => '2026-10-23', venueUuid: (v) => typeof v === 'string' && /^[0-9a-f-]{36}$/.test(v) }; }

test('viewing input stores a distinct optional appointment time and strips status/ownership', () => {
  const base = { venueId: VENUE, name: 'Couple', email: 'couple@example.com', guests: 80, date: DAY, requestKind: 'viewing' };
  for (const time of ['', '00:00', '23:59', '14:30']) {
    const { value } = input.validateVenueEnquiry({ ...base, viewingTime: time, status: 'booked', owner_user_id: 'attacker' }, '2026-10-23');
    assert.equal(value.viewing_time, time || null); assert.equal(value.request_kind, 'viewing');
    assert.equal(value.status, undefined); assert.equal(value.owner_user_id, undefined);
  }
  for (const time of ['24:00','12:60','9:30','tomorrow']) assert.ok(input.validateVenueEnquiry({ ...base, viewingTime: time }, '2026-10-23').error);
  assert.ok(input.validateVenueEnquiry({ ...base, requestKind: 'booking', viewingTime: '14:30' }, '2026-10-23').error);
  assert.throws(() => details.parseVenueResponse({ status: 'viewing_confirmed', response: 'Agreed', viewing_time: '24:00' }, '2026-10-23'));
  assert.throws(() => details.parseVenueResponse({ status: 'viewing_confirmed' }, '2026-10-23'));
});
test('type/status transitions reject cross-kind confirmation and reopening terminal requests', () => {
  assert.equal(rules.validateVenueTransition('viewing','contacted','viewing_confirmed'), true);
  assert.equal(rules.validateVenueTransition('booking','contacted','booked'), true);
  for (const args of [ ['viewing','new','booked'], ['booking','new','viewing_confirmed'], ['booking','cancelled','booked'], ['booking','booked','new'], ['viewing','viewing_confirmed','contacted'], ['other','new','booked'] ]) assert.equal(rules.validateVenueTransition(...args), false, args.join('/'));
});
test('viewing POST bypasses wedding blocks/bookings while booking POST refuses occupied dates', async () => {
  for (const kind of ['viewing','booking']) {
    const db = database((q) => {
      if (q.table === 'venue_listings') return { data: { id: VENUE, capacity_max: 200 } };
      if (q.table === 'venue_enquiries' && q.operation === 'insert') return { data: { id: ID } };
      if (q.table === 'venue_enquiries') return { data: [{ id: 'occupied' }] };
      if (q.table === 'venue_date_blocks') return { data: [{ day: DAY }] };
      return { data: null };
    });
    const route = load('app/api/venue-enquiries/route.ts', { '@/lib/server/venue-access': authStub(db), '@/lib/supabase/admin': { createAdminClient: () => db }, '@/lib/server/limits': { clientIpHash: () => 'test' }, '@/lib/server/venue-notify': { notifyVenueRequest: () => { throw Error('No outbound notifications in tests'); } } });
    const response = await route.POST(post('/api/venue-enquiries', { venueId: VENUE, name: 'Couple', email: 'spoof@example.com', guests: 80, date: DAY, requestKind: kind, ...(kind === 'viewing' ? { viewingTime: '14:30' } : {}) }));
    assert.equal(response.status, kind === 'viewing' ? 201 : 409);
    if (kind === 'viewing') {
      assert.equal(db.queries.some((q) => q.table === 'venue_date_blocks'), false);
      assert.equal(db.queries.filter((q) => q.table === 'venue_enquiries').length, 1);
      const write = db.queries.find((q) => q.operation === 'insert').value;
      assert.equal(write.owner_user_id, 'customer'); assert.equal(write.email, 'verified@example.com'); assert.equal(write.viewing_time, '14:30');
    } else assert.ok(db.queries.find((q) => q.table === 'venue_enquiries').filters.some((f) => f[1] === 'request_kind' && f[2] === 'booking'));
  }
});
test('confirmed-account guard rejects anonymous, unverified and cross-origin access before admin use', async () => {
  let adminCalls = 0;
  for (const user of [{ id: 'guest', is_anonymous: true }, { id: 'unverified', email: 'x@example.com' }]) {
    // Load the real guard with only its session and admin dependencies replaced.
    const real = load('lib/server/venue-access.ts', {
      '@/lib/supabase/admin': { createAdminClient: () => { adminCalls++; } },
      // Relative import is resolved by load; override exact name.
      './session': { requireUser: async () => ({ ok: true, user }) },
    });
    assert.equal((await real.requireVenueAccount(new Request('https://styled.test/api/venue-follow-up'))).response.status, 401);
  }
  const real = load('lib/server/venue-access.ts', {
    './session': { requireUser: async () => { throw Error('Should not authenticate cross-origin write'); } },
    '@/lib/supabase/admin': { createAdminClient: () => { adminCalls++; } },
  });
  const denied = await real.requireVenueAccount(new Request('https://styled.test/api/venue-follow-up', { method: 'POST', headers: { origin: 'https://evil.test', 'content-type': 'application/json' } }));
  assert.equal(denied.response.status, 403); assert.equal(adminCalls, 0);
});
function followup({ user = 'customer', owner = 'customer', member = false, status = 'contacted', visible = true } = {}) {
  const db = database((q) => {
    if (q.table === 'venue_enquiries') return { data: visible ? { id: ID, venue_id: VENUE, owner_user_id: owner, status, alternative_dates: [DAY], next_actor: 'customer' } : null };
    if (q.table === 'venue_users') return { data: member ? { venue_id: VENUE } : null };
    if (q.table === 'venue_request_messages') return { data: [] };
    return { data: null };
  });
  return { db, route: load('app/api/venue-follow-up/route.ts', { '@/lib/server/venue-access': authStub(db, user) }) };
}
test('thread denies unrelated customers, other venue teams and nonparticipant staff without message reads', async () => {
  for (const user of ['stranger', 'other-venue-member', 'staff']) {
    const { route, db } = followup({ user });
    const r = await route.GET(new Request(`https://styled.test/api/venue-follow-up?id=${ID}`));
    assert.equal(r.status, 404); assert.equal(db.queries.some((q) => q.table === 'venue_request_messages'), false);
  }
});
test('participant thread reads use the exact request scope and no-cache response', async () => {
  for (const options of [{}, { user: 'team', member: true }]) {
    const { route, db } = followup(options);
    const r = await route.GET(new Request(`https://styled.test/api/venue-follow-up?id=${ID}&owner_user_id=someone-else`));
    assert.equal(r.status, 200); assert.equal(r.headers.get('cache-control'), 'no-store');
    const q = db.queries.find((q) => q.table === 'venue_request_messages');
    assert.ok(q.filters.some((f) => f[0] === 'eq' && f[1] === 'request_id' && f[2] === ID));
  }
});
test('customer alternative RPC keeps request identity and never accepts a caller status or kind', async () => {
  const { route, db } = followup();
  const r = await route.POST(post('/api/venue-follow-up', { id: ID, action: 'alternative', date: DAY, status: 'booked', request_kind: 'booking', owner_user_id: 'attacker' }));
  assert.equal(r.status, 200);
  assert.deepEqual(db.calls.find((c) => c.name === 'request_venue_alternative').args, { p_id: ID, p_user_id: 'customer', p_day: DAY });
});
test('alternative requests reject team members, terminal states and dates outside current suggestions', async () => {
  for (const [options, date, expected] of [[{ user: 'team', member: true }, DAY, 403], [{ status: 'booked' }, DAY, 409], [{ status: 'viewing_confirmed' }, DAY, 409], [{ status: 'cancelled' }, DAY, 409], [{}, '2099-06-13', 409], [{}, '2099-02-30', 409]]) {
    const { route, db } = followup(options);
    assert.equal((await route.POST(post('/api/venue-follow-up', { id: ID, action: 'alternative', date }))).status, expected);
    assert.equal(db.calls.some((c) => c.name === 'request_venue_alternative'), false);
  }
});
test('thread sends verified participant identity and message only; spoofed sender/status is ignored', async () => {
  const { route, db } = followup({ user: 'team', member: true });
  const r = await route.POST(post('/api/venue-follow-up', { id: ID, action: 'message', message: '  Can we agree a time?  ', sender_kind: 'customer', p_user_id: 'attacker', status: 'booked' }));
  assert.equal(r.status, 200);
  assert.deepEqual(db.calls.find((c) => c.name === 'send_venue_request_message').args, { p_id: ID, p_user_id: 'team', p_body: 'Can we agree a time?' });
});
test('public availability queries only wedding bookings and returns dates without contacts', async () => {
  const db = database((q) => q.table === 'venue_listings' ? { data: { id: VENUE } } : q.table === 'venue_enquiries' ? { data: [{ preferred_date: DAY }] } : { data: [{ day: '2099-06-13' }] });
  const route = load('app/api/venues/[slug]/dates/route.ts', { '@/lib/supabase/admin': { createAdminClient: () => db } });
  const r = await route.GET(new Request('https://styled.test/api/venues/test/dates'), { params: Promise.resolve({ slug: 'test' }) });
  assert.deepEqual(await r.json(), { blockedDates: [DAY, '2099-06-13'] });
  const q = db.queries.find((q) => q.table === 'venue_enquiries');
  assert.ok(q.filters.some((f) => f[0] === 'eq' && f[1] === 'request_kind' && f[2] === 'booking'));
  assert.deepEqual(q.filters.find((f) => f[0] === 'select'), ['select', 'preferred_date,booking_start,booking_end']);
});
test('venue response endpoint refuses wrong-kind confirmation before RPC and records agreed viewing time', async () => {
  for (const status of ['booked', 'viewing_confirmed']) {
    const db = database((q) => q.table === 'venue_users' ? { data: { venue_id: VENUE } } : { data: { request_kind: 'viewing', status: 'new' } });
    const route = load('app/api/venue-portal/route.ts', { '@/lib/server/venue-access': authStub(db, 'team'), '@/lib/server/venue-notify': { notifyVenueRequest: () => { throw Error('No outbound notifications in tests'); } } });
    const r = await route.POST(post('/api/venue-portal', { action: 'respond', venueId: VENUE, id: ID, status, response: 'Agreed appointment', viewing_time: '14:30' }));
    assert.equal(r.status, status === 'booked' ? 409 : 200);
    const call = db.calls.find((c) => c.name === 'respond_venue_enquiry');
    if (status === 'booked') assert.equal(call, undefined);
    else { assert.equal(call.args.p_status, 'viewing_confirmed'); assert.equal(call.args.p_viewing_time, '14:30'); }
  }
});
