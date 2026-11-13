const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), Module = require('node:module'), ts = require('typescript');
function load(file, overrides = {}) {
  const loc = path.resolve(file), m = new Module(loc,module);
  m.require = id => overrides[id] || require(id);
  m._compile(ts.transpileModule(fs.readFileSync(loc,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,loc);
  return m.exports;
}
test('signed WhatsApp confirmation honours the enrolled phone, notice version, and supplier',async()=>{
  const helpers=load('lib/server/order-whatsapp.ts'), webhook='https://development.example/api/whatsapp/orders', token='fixture';
  const config={webhook,token,sid:'test-account',sender:'whatsapp:+447700900111'};
  const params={AccountSid:config.sid,From:'whatsapp:+447700900222',To:config.sender,Body:'CONFIRM ABCDEF0123456789'};
  const filters={}, calls=[];
  const query={select(){return this},eq(k,v){filters[k]=v;return this},async maybeSingle(){return {data:filters.recipient==='+447700900222'?{id:'order-notice',supplier_id:'supplier-1',sent_version:'original'}:null}}};
  const admin={from:()=>query,async rpc(fn,args){calls.push({fn,args});return {data:'availability_confirmed'}}};
  const {POST}=load('app/api/whatsapp/orders/route.ts',{'@/lib/server/order-whatsapp':{...helpers,whatsappConfig:()=>config},'@/lib/supabase/admin':{createAdminClient:()=>admin}});
  function request(form,valid=true){
    const input=webhook+Object.entries(form).sort(([a],[b])=>a.localeCompare(b)).flat().join('');
    const sig=crypto.createHmac('sha1',token).update(input).digest('base64');
    return new Request(webhook,{method:'POST',headers:{'x-twilio-signature':valid?sig:'invalid'},body:new URLSearchParams(form)});
  }
  assert.equal((await POST(request(params,false))).status,403);
  await POST(request({...params,From:'whatsapp:+447700900333'}));
  assert.equal(calls.length,0);
  assert.match(await (await POST(request(params))).text(),/Availability confirmed/);
  assert.deepEqual(calls,[{fn:'approve_supplier_order_notice',args:{p_notice:'order-notice',p_supplier:'supplier-1',p_version:'original',p_actor:null,p_channel:'whatsapp'}}]);
});
test('long orders retain every product and a single unbroken reply command',()=>{
  const {orderMessageParts}=load('lib/server/order-whatsapp.ts');
  const products='💐 Ceremony flowers (15 to 17 September)\n'.repeat(80);
  const code='ABCDEF0123456789';
  const parts=orderMessageParts(products,code);
  assert.ok(parts.length>1);
  assert.equal(parts.join('').split('\n\nTo confirm')[0],products);
  assert.ok(parts.at(-1).endsWith('CONFIRM '+code));
  assert.ok(parts.every(part=>part.length<1550));
});
test('delivery reports use a signed callback scoped to one part and never approve a booking',async()=>{
 const h=load('lib/server/order-whatsapp.ts'), cfg={webhook:'https://development.example/api/whatsapp/orders',token:'local-fixture',sid:'ACtest'};
 const notice='12345678-1234-4234-8234-123456789abc',url=cfg.webhook+'/status?notice='+notice+'&part=0',calls=[];
 const mod=load('app/api/whatsapp/orders/status/route.ts',{'@/lib/server/order-whatsapp':{...h,whatsappConfig:()=>cfg},'@/lib/supabase/admin':{createAdminClient:()=>({rpc:(fn,p)=>{calls.push([fn,p]);return {error:null}}})}});
 const params={AccountSid:cfg.sid,MessageSid:'SM'+'f'.repeat(32),MessageStatus:'delivered'};
 const sig=crypto.createHmac('sha1',cfg.token).update(url+Object.keys(params).sort().map(k=>k+params[k]).join('')).digest('base64');
 for (const [address,expected] of [[url.replace('part=0','part=1'),403],[url,204]])assert.equal((await mod.POST(new Request(address,{method:'POST',headers:{'x-twilio-signature':sig},body:new URLSearchParams(params)}))).status,expected);
 assert.deepEqual(calls,[['record_order_phone_part',{p_notice:notice,p_part:0,p_sid:params.MessageSid,p_state:'delivered'}]]);
});
test('tracker flags partial failures and overdue replies without treating delivery as acceptance',()=>{
 const {deliverySummary,needsFollowUp}=load('lib/request-tracker.ts');const now=Date.now(),base={created_at:new Date(now).toISOString(),delivery:'sent',part_count:2,order_phone_parts:[{state:'delivered'},{state:'accepted'}]};
 assert.equal(deliverySummary(base,now).phoneStatus,'Accepted by provider');
 assert.equal(deliverySummary(base,now+3600001).deliveryProblem,true);
 assert.equal(deliverySummary({...base,order_phone_parts:[{state:'delivered'},{state:'failed'}]},now).deliveryProblem,true);
 assert.equal(deliverySummary({...base,order_phone_parts:[{state:'delivered'},{state:'delivered'}]},now).phoneStatus,'Delivered to phone');
 assert.equal(needsFollowUp({stage:'waiting',replyDueAt:new Date(now-1).toISOString(),followUp:'2099-01-01'},now,48),true);
});
