const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
function load(file,stubs={}){
 const f=path.resolve(file),m=new Module(f,module);m.paths=module.paths;
 m.require=id=>{if(Object.hasOwn(stubs,id))return stubs[id];if(id==='next/server')return {NextResponse:{json:(d,o)=>new Response(JSON.stringify(d),o)}};if(id.startsWith('@/'))return load(id.slice(2)+'.ts',stubs);if(id.startsWith('.'))return load(path.resolve(path.dirname(f),id)+'.ts',stubs);return require(id);};
 m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);return m.exports;
}
const {supplierBookingTasks}=load('lib/supplier-booking-task.ts');
const {EMPTY_REPLY}=load('lib/booking-operations.ts');
const complete={...EMPTY_REPLY,response:'available',deliveryPence:0,setupPence:0,collectionPence:0,extraPence:0,securityPence:0,systemChecked:true,siteChecked:true,sharedStockChecked:true,pricesIncludeVat:true,terms:'Fictional terms for test only'};
test('confirming legacy availability keeps the missing service quote in supplier tasks',()=>{
 assert.ok(supplierBookingTasks('requested',[{status:'pending'}]).length);
 const tasks=supplierBookingTasks('requested',[{status:'confirmed'}]);
 assert.ok(tasks.some(t=>t.includes('fees')));assert.ok(tasks.some(t=>t.includes('terms')));
 assert.deepEqual(supplierBookingTasks('requested',[{status:'confirmed'}],complete),[]);
});
test('partial service quotes need action; zero included costs complete the quote',()=>{
 for(const patch of [{deliveryPence:null},{securityPence:null},{siteChecked:false},{terms:''},{pricesIncludeVat:false}])assert.ok(supplierBookingTasks('requested',[{status:'confirmed'}],{...complete,...patch}).length);
 for(const status of ['confirmed','cancelled','declined','deposit_paid'])assert.deepEqual(supplierBookingTasks(status,[{status:'pending'}]),[]);
 assert.deepEqual(supplierBookingTasks('requested',[{status:'declined'}]),[]);
 assert.deepEqual(supplierBookingTasks('requested',[]),[]);
});
function query(rows,onFilter=()=>{}){
 const filters=[];const q={select:()=>q,eq:(k,v)=>(filters.push(r=>r[k]===v),onFilter(k,v),q),in:(k,v)=>(filters.push(r=>v.includes(r[k])),onFilter(k,v),q),order:()=>q,then:(a,b)=>Promise.resolve({data:rows.filter(r=>filters.every(f=>f(r))),error:null}).then(a,b)};return q;
}
test('supplier list computes tasks only for linked orders and never returns raw supplier replies',async()=>{
 const own='own-supplier',calls=[];
 const order={reference:'TEST',status:'requested',wedding_date:'2027-01-01',venue_label:'Fictional venue'};
 const tables={order_lines:[{id:'line',order_id:'own-order',supplier_id:own,product_name:'Fixture',supplier_status:'confirmed',orders:order},{id:'foreign-line',order_id:'foreign-order',supplier_id:'other',orders:order}],booking_workflows:[{order_id:'own-order',supplier_replies:{[own]:complete,other:{note:'PRIVATE FOREIGN REPLY'}}},{order_id:'foreign-order',supplier_replies:{other:complete}}]};
 const route=load('app/api/vendor/orders/route.ts',{'@/lib/server/vendor':{requireVendor:async()=>({ok:true,supplierId:own,admin:{from:t=>query(tables[t],(k,v)=>calls.push([t,k,v]))}})}});
 const d=await (await route.GET(new Request('https://styled.test'))).json();
 assert.equal(d.orders.length,1);assert.deepEqual(d.orders[0].outstandingTasks,[]);
 assert.ok(calls.some(c=>c[0]==='booking_workflows'&&c[1]==='order_id'&&c[2].join()==='own-order'));
 assert.doesNotMatch(JSON.stringify(d),/PRIVATE FOREIGN|supplier_replies|foreign-order/);
 tables.booking_workflows[0].supplier_replies={};
 const pending=await (await route.GET(new Request('https://styled.test'))).json();assert.ok(pending.orders[0].outstandingTasks.length);
});
function dispatchDb({status='confirmed',phase='confirmed',audience='supplier',kind='booking_confirmed',linked=true}={}){
 const jobs=[{id:'job',order_id:'order',supplier_id:'own',audience,kind,status:'queued',attempts:0,created_at:'2026-01-01',due_at:'2026-01-01',dedupe_key:'order:confirmed:customer'}];
 const tables={booking_notifications:jobs,orders:[{id:'order',owner_id:'customer',reference:'TEST',status}],booking_workflows:[{order_id:'order',phase}],suppliers:[{id:'own',contact_email:'supplier@example.com'}],supplier_users:[],order_lines:linked?[{order_id:'order',supplier_id:'own',product_name:'Own fixture',quantity:2,needed_date:'2027-01-01',return_date:'2027-01-03'},{order_id:'order',supplier_id:'foreign',product_name:'FOREIGN FIXTURE'}]:[]};
 const db={auth:{admin:{getUserById:async()=>({data:{user:{email:'customer@example.com',email_confirmed_at:'2026-01-01'}}})}},from(table){let patch;const filters=[];const q={select:()=>q,in:(k,v)=>(filters.push(r=>v.includes(r[k])),q),lt:(k,v)=>(filters.push(r=>r[k]<v),q),lte:(k,v)=>(filters.push(r=>r[k]<=v),q),eq:(k,v)=>(filters.push(r=>r[k]===v),q),neq:(k,v)=>(filters.push(r=>r[k]!==v),q),order:()=>q,limit:()=>q,update:p=>(patch=p,q),maybeSingle:async()=>({data:resolve()[0]||null,error:null}),then:(a,b)=>Promise.resolve({data:resolve(),error:null}).then(a,b)};function resolve(){const rows=(tables[table]||[]).filter(r=>filters.every(f=>f(r)));if(patch)rows.forEach(r=>Object.assign(r,patch));return rows;}return q;}};return {db,jobs};
}
async function exercise(options,enabled=true){
 const {db,jobs}=dispatchDb(options),sent=[];const old=process.env.ENABLE_BOOKING_EMAILS,fetch=global.fetch;
 process.env.ENABLE_BOOKING_EMAILS=String(enabled);global.fetch=()=>{throw Error('Actual network forbidden in booking workflow tests');};
 try{
  const lib=load('lib/server/booking-notifications.ts',{'./env':{env:{siteUrl:'https://styled.test',supabaseUrl:'https://db.test',brevoApiKeyIfSet:'fake-test-only'}},'@/lib/pilot-readiness':{environmentMatches:()=>true},'./email-delivery':{trackedDelivery:async(_db,msg)=>{sent.push(msg);return {accepted:true,outcome:'accepted'};}}});
  await lib.dispatchBookingNotifications(db);await lib.dispatchBookingNotifications(db);
  return {jobs,sent};
 }finally{global.fetch=fetch;if(old===undefined)delete process.env.ENABLE_BOOKING_EMAILS;else process.env.ENABLE_BOOKING_EMAILS=old;}
}
test('final confirmation dispatches once to own customer and supplier with no actual network',async()=>{
 for(const audience of ['customer','supplier']){
  const {sent,jobs}=await exercise({audience});assert.equal(sent.length,1);assert.equal(jobs[0].status,'provider_accepted');
  assert.deepEqual(sent[0].to,[audience==='supplier'?'supplier@example.com':'customer@example.com']);
  assert.match(sent[0].text,/recorded the agreed offline booking/);assert.match(sent[0].text,/does not take payment/);assert.doesNotMatch(sent[0].text,/FOREIGN FIXTURE/);
  if(audience==='supplier')assert.match(sent[0].text,/Own fixture: 2027-01-01 to 2027-01-03/);
 }
 assert.equal((await exercise({status:'deposit_paid'})).sent.length,1);
});
test('cancelled, unconfirmed, wrong-phase and unlinked confirmations never reach delivery',async()=>{
 for(const options of [{status:'requested'},{status:'cancelled'},{status:'declined'},{phase:'accepted'},{linked:false}]){
  const {sent,jobs}=await exercise(options);assert.equal(sent.length,0);assert.equal(jobs[0].status,'failed');
 }
});
test('existing reminders stay restricted to open requests; disabled delivery never calls provider',async()=>{
 assert.equal((await exercise({kind:'reminder',status:'confirmed'})).sent.length,0);
 assert.equal((await exercise({kind:'initial_request',status:'cancelled'})).sent.length,0);
 assert.equal((await exercise({kind:'reminder',status:'requested'})).sent.length,1);
 const disabled=await exercise({},false);assert.equal(disabled.sent.length,0);assert.equal(disabled.jobs[0].status,'blocked');
});
