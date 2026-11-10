const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module'), ts = require('typescript');
function load(file, stubs = {}) {
  const absolute = path.resolve(file), m = new Module(absolute, module);
  m.paths = module.paths;
  m.require = id => {
    if (Object.hasOwn(stubs, id)) return stubs[id];
    if (id.startsWith('@/')) return load(id.slice(2) + '.ts', stubs);
    if (id.startsWith('.')) return load(path.resolve(path.dirname(absolute), id) + '.ts', stubs);
    return require(id);
  };
  m._compile(ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, absolute);
  return m.exports;
}
const availability = load('lib/availability.ts');
const planner = load('lib/server/stock-import.ts', {
  '@/lib/availability': { ...availability, todayUtc: () => '2026-11-01' },
});
const own = '11111111-1111-4111-8111-111111111111';
const product = (extra = {}) => ({
  id: 'chair', supplier_id: own, name: 'Gold chair', category: 'furniture', slot: 'chairs',
  unit_price_pence: 550, unit: 'each', qty_rule: 'fixed', capacity: 20, lead_time_days: 0,
  styles: [], image: null, note: null, active: true, ...extra,
});
const line = (extra = {}) => ({
  id: 'line', supplier_id: own, product_id: 'chair', quantity: 4, supplier_status: 'pending',
  needed_date: '2026-11-10', return_date: '2026-11-12', stock_start: null, stock_end: null,
  orders: { wedding_date: '2026-11-11', status: 'requested' }, ...extra,
});
// Execute filtering and pagination, rather than returning fixtures regardless
// of query. Missing supplier/date/status filters change the observed result.
function db({ products = [product()], lines = [], fail } = {}) {
  const reads = [], writes = [];
  const admin = {
    from(table) {
      const filters = [], query = { table, filters, start: 0, end: 499 };
      const q = {
        select: columns => { query.columns = columns; return q; },
        eq: (key, value) => { filters.push(['eq', key, value]); return q; },
        neq: (key, value) => { filters.push(['neq', key, value]); return q; },
        in: (key, value) => { filters.push(['in', key, value]); return q; },
        gte: (key, value) => { filters.push(['gte', key, value]); return q; },
        order: key => { query.order = key; return q; },
        returns: () => q,
        range: (start, end) => { Object.assign(query, { start, end }); return q; },
        then(resolve, reject) {
          reads.push(query);
          if (fail?.(query)) return Promise.resolve({ data: null, error: { message: 'database unavailable' } }).then(resolve, reject);
          let data = table === 'products' ? products : lines;
          data = data.filter(row => filters.every(([op, key, value]) => {
            const actual = key.split('.').reduce((v, k) => v?.[k], row);
            return op === 'eq' ? actual === value : op === 'neq' ? actual !== value : op === 'in' ? value.includes(actual) : actual >= value;
          }));
          if (query.order) data = [...data].sort((a,b) => a[query.order].localeCompare(b[query.order]));
          return Promise.resolve({ data: data.slice(query.start, query.end + 1), error: null }).then(resolve, reject);
        },
      };
      return q;
    },
    async rpc(name, args) {
      writes.push({ name, args });
      return { data: { importId: 'import', created: 1, updated: 0, unchanged: 0 }, error: null };
    },
  };
  return { admin, reads, writes, products, lines };
}
const plan = (h, csv, mode = 'vendor') => planner.planStockImport({ admin: h.admin, supplierId: own, csv, mode });
const apply = (h, csv, mode = 'vendor') => planner.applyStockImport({ admin: h.admin, supplierId: own, csv, mode, actor: { id: 'actor', label: 'Supplier' } });
const warnings = p => p.rows[0].warnings.join('\n');

test('different wedding dates overlap across full inclusive hire periods', async () => {
  const h = db({ lines: [line(), line({ id: 'other', quantity: 6, needed_date: '2026-11-12', return_date: '2026-11-14', orders: { wedding_date: '2026-11-13', status: 'confirmed' } })] });
  const p = await plan(h, 'id,capacity\nchair,9');
  assert.match(warnings(p), /10 already reserved on 2026-11-12.*full hire periods/);
  assert.ok(h.reads.filter(q => q.table === 'order_lines').every(q => !q.filters.some(f => f[1] === 'orders.wedding_date')));
});

test('same wedding date does not combine disjoint item hire periods', async () => {
  const h = db({ lines: [line(), line({ id: 'other', needed_date: '2026-11-13', return_date: '2026-11-14' })] });
  assert.doesNotMatch(warnings(await plan(h, 'id,capacity\nchair,4')), /below/);
});

test('recorded preparation and return buffers take precedence, without double counting', async () => {
  const h = db({ lines: [line({ stock_start: '2026-11-08', stock_end: '2026-11-15' }), line({ id: 'other', quantity: 7, needed_date: '2026-11-15', return_date: '2026-11-15', orders: { wedding_date: '2026-11-20', status: 'deposit_paid' } })] });
  assert.match(warnings(await plan(h, 'id,capacity\nchair,10')), /11 already reserved on 2026-11-15/);
  assert.doesNotMatch(warnings(await plan(h, 'id,capacity\nchair,11')), /below/);
});

test('past weddings with stock still out today are counted; completed hires are not', async () => {
  const h = db({ lines: [line({ needed_date: '2026-10-28', return_date: '2026-10-31', stock_end: '2026-11-02', orders: { wedding_date: '2026-10-29', status: 'confirmed' } }), line({ id: 'finished', quantity: 99, needed_date: '2026-10-20', return_date: '2026-10-31' })] });
  assert.match(warnings(await plan(h, 'id,capacity\nchair,3')), /4 already reserved on 2026-11-01/);
});

test('legacy null item dates fall back independently to wedding date', async () => {
  const h = db({ lines: [line({ needed_date: null, return_date: null })] });
  assert.match(warnings(await plan(h, 'id,capacity\nchair,0')), /4 already reserved on 2026-11-11/);
});

test('sweep handles simultaneous starts/ends across leap day without summing disjoint reservations', async () => {
  const h = db({ lines: [
    line({ id: 'a', quantity: 5, needed_date: '2028-02-28', return_date: '2028-02-29' }),
    line({ id: 'b', quantity: 6, needed_date: '2028-02-29', return_date: '2028-03-01' }),
    line({ id: 'c', quantity: 8, needed_date: '2028-03-01', return_date: '2028-03-01' }),
  ] });
  assert.match(warnings(await plan(h, 'id,capacity\nchair,13')), /14 already reserved on 2028-03-01/);
});

test('only own non-declined reservations in live order states count', async () => {
  const h = db({ lines: [line(), line({ id: 'declined', quantity: 100, supplier_status: 'declined' }), line({ id: 'cancelled', quantity: 100, orders: { wedding_date: '2026-11-11', status: 'cancelled' } }), line({ id: 'foreign', supplier_id: 'other', quantity: 100 })] });
  assert.doesNotMatch(warnings(await plan(h, 'id,capacity\nchair,4')), /below/);
  assert.ok(h.reads.every(q => q.filters.some(f => f[0] === 'eq' && f[1] === 'supplier_id' && f[2] === own)));
});

test('all reservation and product pages are read, including the peak after row 500', async () => {
  const lines = Array.from({ length: 501 }, (_, i) => line({ id: `line-${String(i).padStart(4, '0')}`, quantity: 1 }));
  const products = Array.from({ length: 501 }, (_, i) => product({ id: `p-${String(i).padStart(4, '0')}`, name: `Chair ${i}` }));
  products.push(product());
  const h = db({ products, lines });
  const p = await plan(h, 'id,capacity\nchair,500');
  assert.match(warnings(p), /501 already reserved/);
  assert.equal(p.missing.length, 501);
  assert.ok(h.reads.some(q => q.table === 'products' && q.start === 500));
  assert.ok(h.reads.some(q => q.table === 'order_lines' && q.start === 500));
});

test('failed catalogue/reservation reads stop apply before any write, including later pages', async () => {
  for (const table of ['products', 'order_lines']) {
    const h = db({ fail: q => q.table === table });
    await assert.rejects(() => apply(h, 'id,capacity\nchair,2'), /Couldn.t load/);
    assert.equal(h.writes.length, 0);
  }
  const h = db({ lines: Array.from({length:501}, (_,i) => line({id:`line-${i}`})), fail: q => q.table === 'order_lines' && q.start === 500 });
  await assert.rejects(() => apply(h, 'id,capacity\nchair,2'), /stock reservations/);
  assert.equal(h.writes.length, 0);
});

test('undated or invalid reservations explicitly warn that stock could not be fully checked', async () => {
  for (const bad of [
    { needed_date: null, return_date: null, orders: { wedding_date: null, status: 'requested' } },
    { needed_date: '2026-02-30' }, { return_date: '2026-11-09' }, { quantity: 0 },
  ]) assert.match(warnings(await plan(db({lines:[line(bad)]}), 'id,capacity\nchair,2')), /could not be fully checked/);
});

test('new stock must be explicit: blank/missing/unknown never becomes unlimited', async () => {
  for (const mode of ['staff','vendor']) for (const csv of [
    'name,category,price\nArch,backdrops,100',
    'name,category,price,capacity\nArch,backdrops,100,',
    'name,category,price,capacity\nArch,backdrops,100,n/a',
    'name,category,price,capacity\nArch,backdrops,100,none',
  ]) {
    const h = db();
    const result = await apply(h, csv, mode);
    assert.equal(result.plan.counts.error, 1);
    assert.equal(result.result, null);
    assert.equal(h.writes.length, 0);
  }
});

test('blank capacity preserves existing finite stock, zero is real stock, explicit made-to-order warns', async () => {
  const h = db();
  const blank = await plan(h, 'id,capacity,price\nchair,,6');
  assert.equal(Object.hasOwn(blank.rows[0].payload, 'capacity'), false);
  assert.equal((await plan(h, 'id,capacity\nchair,0')).rows[0].payload.capacity, 0);
  const mto = await plan(h, 'id,capacity\nchair,made to order');
  assert.equal(mto.rows[0].payload.capacity, null);
  assert.match(warnings(mto), /not verified availability/);
  const existingUnknown = await plan(db({ products:[product({capacity:null})] }), 'id\nchair');
  assert.equal(existingUnknown.rows[0].action, 'unchanged');
  assert.match(warnings(existingUnknown), /not verified availability/);
});

test('both staff and vendor create hidden products despite active=yes', async () => {
  for (const mode of ['staff','vendor']) for (const capacity of ['0','made to order']) {
    const p = await plan(db(), `name,category,price,capacity,active\nArch,backdrops,100,${capacity},yes`, mode);
    assert.equal(p.rows[0].action, 'create');
    assert.equal(p.rows[0].payload.active, false);
    assert.equal(p.newProductsStartHidden, true);
    assert.match(warnings(p), /Submit the range for review/);
  }
});

test('imports cannot reactivate hidden products; content edits explicitly return to private review', async () => {
  for (const mode of ['staff','vendor']) {
    const h = db({products:[product({active:false})]});
    const activation = await plan(h, 'id,active\nchair,yes', mode);
    assert.equal(activation.rows[0].action, 'unchanged');
    assert.equal(activation.rows[0].payload, undefined);
    assert.match(warnings(activation), /cannot publish/);
    for (const [column, value] of [['price','7'],['category','backdrops'],['note','New description'],['image','https://example.test/chair.jpg'],['lead_time_days','4'],['unit','per table'],['quantity_rule','per table'],['styles','Garden Romance']]) {
      const p = await plan(db(), `id,${column},active\nchair,${value},yes`, mode);
      assert.equal(p.rows[0].payload.active, false, column);
      assert.ok(p.rows[0].changes.some(c => c.field === 'active' && c.to === false));
      assert.match(warnings(p), /range will return to draft/);
    }
  }
});

test('stock-only changes preserve visibility, hiding remains allowed, omitted content stays untouched', async () => {
  const p = await plan(db(), 'id,capacity\nchair,12');
  assert.deepEqual(p.rows[0].payload, { action:'update', id:'chair', capacity:12 });
  const hide = await plan(db(), 'id,active\nchair,no');
  assert.deepEqual(hide.rows[0].payload, {action:'update', id:'chair', active:false});
});

test('foreign ids, duplicate existing matches and ambiguous names cannot write; missing products stay untouched', async () => {
  const h = db({products:[product(),product({id:'other', name:'Other'})]});
  const {plan:p} = await apply(h, 'id,capacity\nforeign,5\nchair,10\nchair,9');
  assert.deepEqual(p.counts, {create:0,update:1,unchanged:0,error:2});
  assert.deepEqual(p.missing, [{id:'other',name:'Other'}]);
  assert.equal(h.writes[0].args.p_supplier, own);
  assert.deepEqual(h.writes[0].args.p_rows, [{action:'update',id:'chair',capacity:10}]);
  assert.equal(h.writes[0].args.p_skipped, 2);
  const ambiguous = await plan(db({products:[product(),product({id:'duplicate'})]}), 'name,capacity\nGold chair,1');
  assert.equal(ambiguous.counts.error, 1);
});

test('apply replans against current catalogue/reservations and sends only validated payloads', async () => {
  const h = db();
  assert.equal((await plan(h, 'id,capacity\nchair,10')).rows[0].action, 'update');
  h.products[0].capacity = 10;
  assert.equal((await apply(h, 'id,capacity\nchair,10')).result, null);
  assert.equal(h.writes.length, 0);
  h.lines.push(line({quantity:12}));
  const applied = await apply(h, 'id,capacity\nchair,9');
  assert.match(warnings(applied.plan), /12 already reserved/);
  assert.deepEqual(h.writes[0].args.p_rows, [{action:'update',id:'chair',capacity:9}]);
  assert.equal(h.writes[0].name, 'apply_stock_import');
});

test('vendor route ignores forged supplier and payload and uses authenticated scope', async () => {
  const h = db();
  const route = load('app/api/vendor/stock-import/route.ts', {
    'next/server': {NextResponse:{json:(data,opts)=>new Response(JSON.stringify(data),opts)}},
    '@/lib/server/vendor': { requireVendor: async () => ({ok:true, admin:h.admin, supplierId:own, actor:{id:'actor',label:'Supplier'}}) },
    '@/lib/server/stock-import': planner,
  });
  const response = await route.POST(new Request('https://styled.test/api/vendor/stock-import', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({supplierId:'forged',csv:'id,capacity\nchair,10',apply:true,payload:{active:true,supplier_id:'forged'}})}));
  assert.equal(response.status, 200);
  const write = h.writes.find(w=>w.name==='apply_stock_import');
  assert.equal(write.args.p_supplier, own);
  assert.deepEqual(write.args.p_rows, [{action:'update',id:'chair',capacity:10}]);
});
