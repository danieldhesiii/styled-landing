const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const {EventEmitter}=require('node:events');
function load(relative,mocks={}) {
 const file=path.resolve(relative),m=new Module(file,module);m.paths=module.paths;
 m.require=id=>id in mocks?mocks[id]:id.startsWith('@/')?load(id.slice(2)+'.ts',mocks):id.startsWith('.')?load(path.relative(process.cwd(),path.resolve(path.dirname(file),id))+'.ts',mocks):require(id);
 m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);return m.exports;
}
const {productDayLimitInput}=load('lib/product-day-limit.ts');
test('date limit validates explicit units and dates; blank is never silently zero',()=>{
 const base={productId:'arch',day:'2026-12-04',units:2};
 assert.equal(productDayLimitInput(base,'2026-11-02').value.units,2);
 for(const units of ['',undefined,-1,1.5,Infinity,1000001,'2']) assert.ok(productDayLimitInput({...base,units},'2026-11-02').error);
 assert.equal(productDayLimitInput({...base,units:null},'2026-11-02').value.units,null);
 assert.equal(productDayLimitInput({...base,units:0},'2026-11-02').value.units,0);
 assert.ok(productDayLimitInput({...base,day:'2026-02-30'},'2026-01-01').error);
 assert.ok(productDayLimitInput({...base,day:'2026-11-01'},'2026-11-02').error);
});
const feed=events=>'BEGIN:VCALENDAR\r\nVERSION:2.0\r\n'+events+'\r\nEND:VCALENDAR';
const event=lines=>'BEGIN:VEVENT\r\n'+lines+'\r\nEND:VEVENT';
const mocks={'@/lib/availability':{todayUtc:()=> '2026-11-02'}};
const {parseBusyDates}=load('lib/server/ical.ts',mocks);
test('calendar imports complete one-off hire spans and handles exclusive all-day or midnight ends',()=>{
 assert.deepEqual([...parseBusyDates(feed(event('DTSTART;VALUE=DATE:20261103\r\nDTEND;VALUE=DATE:20261105')))],['2026-11-03','2026-11-04']);
 assert.deepEqual([...parseBusyDates(feed(event('DTSTART:20261103T180000Z\r\nDTEND:20261104T000000Z')))],['2026-11-03']);
 assert.deepEqual([...parseBusyDates(feed(event('DTSTART;TZID=Europe/London:20261103T180000\r\nDTEND;TZID=Europe/London:20261104T010000')))],['2026-11-03','2026-11-04']);
});
test('calendar rejects recurrence rather than silently releasing future repeated bookings',()=>{
 for(const rule of ['RRULE:FREQ=WEEKLY;BYDAY=FR','RDATE:20261109T100000Z','EXDATE:20261109T100000Z','RECURRENCE-ID:20261103T100000Z','DURATION:P2D'])
  assert.throws(()=>parseBusyDates(feed(event('DTSTART:20261103T100000Z\r\n'+rule))),/Existing blocks were kept/);
});
test('calendar rejects truncated or impossible dates and ignores free or cancelled events',()=>{
 for(const value of [feed('BEGIN:VEVENT\r\nDTSTART:20261103'),feed(event('DTSTART:20260230')),feed(event('DTSTART:20261105\r\nDTEND:20261104')),feed(event('DTSTART:20261103T990000Z')),feed(event('DTEND:20261103')),feed(event('DTSTART:20261103')).replace('END:VCALENDAR','')]) assert.throws(()=>parseBusyDates(value));
 assert.equal(parseBusyDates(feed(event('DTSTART:20261103\r\nSTATUS:CANCELLED')+'\r\n'+event('DTSTART:20261104\r\nTRANSP:TRANSPARENT'))).size,0);
 assert.equal(parseBusyDates(feed('')).size,0);
});
test('calendar expansion is bounded to the horizon even for a centuries-long event',()=>{
 const dates=parseBusyDates(feed(event('DTSTART:19000101\r\nDTEND:99991231')));
 assert.equal(dates.size,551);assert.equal([...dates][0],'2026-11-02');
});
test('calendar parse or network failure performs no database reads or mutations',async()=>{
 for(const fetchCalendarFeed of [async()=>feed(event('DTSTART:20261103\r\nRRULE:FREQ=WEEKLY')),async()=>{throw Error('network');}]) {
  let touched=false;
  const {syncSupplierCalendar}=load('lib/server/ical.ts',{...mocks,'@/lib/server/calendar-feed':{fetchCalendarFeed}});
  const result=await syncSupplierCalendar({from:()=>{touched=true;throw Error('database touched');}},'supplier','https://feed.example/calendar');
  assert.equal(result.ok,false);assert.equal(touched,false);assert.match(result.error,/kept/);
 }
});
const {isPublicCalendarAddress,calendarFeedUrl}=load('lib/server/calendar-feed.ts');
test('calendar links and resolved addresses reject internal targets and redirects',()=>{
 for(const address of ['127.0.0.1','10.2.3.4','169.254.169.254','172.16.0.1','192.168.0.1','0.0.0.0','100.64.0.1','224.1.2.3','::1','::ffff:127.0.0.1','192.0.2.1']) assert.equal(isPublicCalendarAddress(address),false,address);
 assert.equal(isPublicCalendarAddress('8.8.8.8'),true);
 for(const url of ['http://calendar.example/a','https://u:p@calendar.example/a','https://calendar.example:444/a','https://calendar.example/a#x']) assert.throws(()=>calendarFeedUrl(url));
 assert.equal(calendarFeedUrl('https://calendar.example/a?token=private').hostname,'calendar.example');
});
test('calendar fetch pins public DNS results and bounds redirects, incomplete, oversized and invalid bodies',async()=>{
 for(const kind of ['success','private','redirect','huge','abort','invalid']) {
  let requested=0;
  const {fetchCalendarFeed}=load('lib/server/calendar-feed.ts',{
   'node:dns/promises':{lookup:async()=>[{address:kind==='private'?'127.0.0.1':'8.8.8.8',family:4}]},
   'node:https':{request:(url,options,cb)=>{
    requested++; options.lookup(url.hostname,{all:true},(err,addresses)=>assert.deepEqual(addresses,[{address:'8.8.8.8',family:4}]));
    const req=new EventEmitter();req.end=()=>{const res=new EventEmitter();res.statusCode=kind==='redirect'?302:200;res.headers=kind==='huge'?{'content-length':3000000}:{};res.destroy=()=>{};cb(res);if(kind==='abort')res.emit('aborted');else{res.emit('data',kind==='invalid'?Buffer.from([0xff]):Buffer.from('calendar'));res.emit('end');}};return req;
   }},
  });
  if(kind==='success')assert.equal(await fetchCalendarFeed('https://calendar.example/private.ics'),'calendar');
  else await assert.rejects(fetchCalendarFeed('https://calendar.example/private.ics'));
  assert.equal(requested,kind==='private'?0:1);
 }
});
test('supplier date-limit mutation derives actor and supplier from authentication',async()=>{
 const calls=[];
 const route=load('app/api/vendor/availability/products/route.ts',{
  'next/server':{NextResponse:{json:(body,{status=200}={})=>({body,status})}},
  '@/lib/server/vendor':{requireVendor:async()=>({ok:true,actor:{id:'real-user'},supplierId:'real-supplier',admin:{rpc:async(...args)=>{calls.push(args);return {error:null};}}})},
  '@/lib/availability':{...load('lib/availability.ts'),todayUtc:()=> '2026-11-02'},
 });
 const response=await route.POST(new Request('https://dev.example/api',{method:'POST',body:JSON.stringify({productId:'arch',day:'2026-12-04',units:1,supplierId:'victim',actor:'victim'})}));
 assert.equal(response.status,200);assert.equal(calls[0][1].p_actor,'real-user');assert.equal(calls[0][1].p_supplier,'real-supplier');
});
test('saved render restore keeps its own room photo and catalogue report and rejects unfinished or mismatched renders',()=>{
 const {savedRenderSnapshot}=load('lib/saved-render.ts');
 const report={venueSlug:'original-venue',supplierId:'original-supplier',checked:true,date:'2026-12-04',items:[{id:'arch'}]};
 const source={renderId:'saved',status:'succeeded',imageUrl:'https://private.example/after',originalUrl:'https://private.example/before',itemIds:['arch',null],look:report};
 const restored=savedRenderSnapshot('saved',source);
 assert.equal(restored.look,report);assert.equal(restored.originalUrl,source.originalUrl);assert.deepEqual(restored.itemIds,['arch']);
 for(const patch of [{status:'failed'},{status:'queued'},{imageUrl:null},{renderId:'another-account-render'}]) assert.equal(savedRenderSnapshot('saved',{...source,...patch}),null);
 const legacy=savedRenderSnapshot('saved',{status:'succeeded',imageUrl:'image'});assert.deepEqual(legacy.itemIds,[]);assert.equal(legacy.look,undefined);
});
test('supplier date-limit endpoints reject unauthorised access before queries',async()=>{
 const denied={status:401};
 const route=load('app/api/vendor/availability/products/route.ts',{'next/server':{NextResponse:{json:()=>{throw Error('should return auth denial');}}},'@/lib/server/vendor':{requireVendor:async()=>({ok:false,response:denied})}});
 assert.equal(await route.GET({}),denied);assert.equal(await route.POST({}),denied);
});
test('date-limit read cannot expose another supplier product exceptions',async()=>{
 const calls=[];
 function query(data){const q=new Proxy({},{get:(_,key)=>key==='then'?(resolve)=>Promise.resolve({data,error:null}).then(resolve):(...args)=>{calls.push([key,...args]);return q;}});return q;}
 const route=load('app/api/vendor/availability/products/route.ts',{
  'next/server':{NextResponse:{json:(body,{status=200}={})=>({body,status})}},
  '@/lib/server/vendor':{requireVendor:async()=>({ok:true,supplierId:'own-supplier',admin:{from:table=>query(table==='products'?[{id:'own-product',name:'Arch',capacity:2}]:[])}})},
 });
 assert.equal((await route.GET({})).status,200);
 assert.ok(calls.some(c=>c[0]==='eq'&&c[1]==='supplier_id'&&c[2]==='own-supplier'));
 assert.deepEqual(calls.find(c=>c[0]==='in'&&c[1]==='product_id')[2],['own-product']);
});
