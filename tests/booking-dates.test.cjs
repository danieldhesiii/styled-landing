const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module'), ts = require('typescript');
function load(file, stubs = {}) {
  const absolute = path.resolve(file), m = new Module(absolute, module); m.paths = module.paths;
  m.require = id => {
    if (Object.hasOwn(stubs, id)) return stubs[id];
    if (id === 'next/server') return { NextResponse: { json: (v, o) => new Response(JSON.stringify(v), o) } };
    if (id.startsWith('@/')) return load(id.slice(2) + '.ts', stubs);
    if (id.startsWith('.')) return load(path.resolve(path.dirname(absolute), id) + '.ts', stubs);
    return require(id);
  };
  m._compile(ts.transpileModule(fs.readFileSync(absolute, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, absolute);
  return m.exports;
}
const { hireDateError, resolveHireDates } = load('lib/booking-dates.ts');
const { validateVenueEnquiry } = load('lib/venue-input.ts');
const day = n => new Date(Date.now() + n * 86400000).toISOString().slice(0,10);
const defaults = { start: day(89), end: day(91) };
test('item dates allow different days including after the wedding, while defaults remain unchanged', () => {
  const ranges = resolveHireDates({ chairs: { start: day(88), end: day(92) }, flowers: { start: day(91), end: day(91) } }, ['chairs','flowers','linen'], defaults);
  assert.deepEqual(ranges.get('chairs'), { start: day(88), end: day(92) });
  assert.deepEqual(ranges.get('flowers'), { start: day(91), end: day(91) });
  assert.deepEqual(ranges.get('linen'), defaults);
});
test('invalid/partial/reversed/past/excessive item ranges and unrelated item IDs are rejected', () => {
  for (const d of [{start:day(91),end:day(90)}, {start:day(-1),end:day(1)}, {start:day(89)}, {start:'2027-02-30',end:day(90)}, {start:day(1),end:day(33)}, null, []])
    assert.throws(() => resolveHireDates({chairs:d}, ['chairs'], defaults));
  assert.throws(() => resolveHireDates({attacker:defaults}, ['chairs'], defaults));
  assert.equal(hireDateError(day(60),day(91)), null);
  assert.ok(hireDateError(day(60),day(92)));
  assert.ok(hireDateError('2099-01-01','2099-01-01'));
});
test('venue booking period includes event and setup/pack-down, while viewing remains a single appointment', () => {
  const base = { venueId:'11111111-1111-4111-8111-111111111111', name:'Couple', email:'test@example.invalid', guests:80, date:day(90) };
  const r = validateVenueEnquiry({...base,bookingStart:day(89),bookingEnd:day(91)},day(0));
  assert.equal(r.value.booking_start,day(89)); assert.equal(r.value.booking_end,day(91));
  assert.equal(validateVenueEnquiry(base,day(0)).value.booking_end,day(90));
  for (const extra of [{bookingStart:day(91)}, {bookingEnd:day(89)}, {bookingStart:''}, {bookingStart:day(20)}, {requestKind:'viewing',bookingStart:day(89),bookingEnd:day(91)}])
    assert.ok(validateVenueEnquiry({...base,...extra},day(0)).error);
  const viewing=validateVenueEnquiry({...base,requestKind:'viewing',viewingTime:'14:00'},day(0));
  assert.equal(viewing.value.booking_start,null); assert.equal(viewing.value.booking_end,null);
});
function orderHarness() {
  const calls=[];
  const admin={from:table=>{
    const q={}; for(const name of ['select','eq','gte','order','limit','insert'])q[name]=()=>q;
    q.maybeSingle=async()=>({data:null,count:0}); q.then=(a,b)=>Promise.resolve({data:null,count:0}).then(a,b);return q;
  },rpc:async(name,args)=>{calls.push({name,args});return {data:'test-order'};}};
  const items = new Map(['chairs','flowers'].map(id=>[id,{id,name:id,supplier:'Same supplier',supplierId:'supplier',leadTimeDays:0}]));
  const stubs={
    '@/lib/server/session':{requireUser:async()=>({ok:true,user:{id:'customer'},supabase:admin})},
    '@/lib/supabase/admin':{createAdminClient:()=>admin},
    '@/lib/server/limits':{clientIpHash:()=>null},
    '@/lib/server/env':{env:{maxOrdersPerDay:20,maxOrdersPerIpPerDay:50}},
    '@/lib/server/quote':{priceBasket:async()=>({ok:true,lines:[...items.keys()].map(itemId=>({itemId,quantity:1})),items,quote:{lines:[...items.values()].map(item=>({item,quantity:1,unitPricePence:100,lineTotalPence:100})),subtotalPence:200,commissionPence:20,depositPence:0}}),publicQuote:()=>({})},
    '@/lib/server/availability':{checkQuantities:async(_db,lines,end,_exclude,start)=>{calls.push({lines,start,end});return new Map(lines.map(l=>[l.itemId,{status:'available'}]));}},
    '@/lib/server/notify':{notifySuppliersOfOrder:async()=>{},notifyStaffOfOrder:async()=>false},
  };
  const real=load('lib/server/orders.ts',stubs);
  stubs['@/lib/server/orders']={...real,loadOrderView:async()=>({id:'test-order'})};
  return {calls,route:load('app/api/orders/route.ts',stubs)};
}
const request = itemDates => new Request('https://styled.test/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({basket:[{itemId:'chairs',quantity:1},{itemId:'flowers',quantity:1}],coupleName:'Couple',email:'test@example.invalid',weddingDate:day(90),deliveryDate:day(89),returnDate:day(91),itemDates})});
test('order submission checks and stores each item’s own range even for the same supplier', async()=>{
  const {calls,route}=orderHarness();
  const r=await route.POST(request({chairs:{start:day(88),end:day(92)},flowers:{start:day(91),end:day(91)}}));
  assert.equal(r.status,201);
  const write=calls.find(c=>c.name==='create_order').args;
  assert.deepEqual(write.p_lines.map(l=>[l.product_id,l.needed_date,l.return_date]),[['chairs',day(88),day(92)],['flowers',day(91),day(91)]]);
  assert.ok(calls.some(c=>c.start===day(88)&&c.end===day(92)));
  assert.ok(calls.some(c=>c.start===day(91)&&c.end===day(91)));
});
test('invalid item dates never write an order or get silently replaced by defaults',async()=>{
  const {calls,route}=orderHarness();const r=await route.POST(request({chairs:{start:day(92),end:day(91)}}));
  assert.equal(r.status,400);assert.equal(calls.some(c=>c.name==='create_order'),false);
});
