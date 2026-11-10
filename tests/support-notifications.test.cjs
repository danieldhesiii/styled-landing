const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const deferred=[];
function load(file,stubs={}){
 const f=path.resolve(file),m=new Module(f,module);m.paths=module.paths;
 m.require=id=>{if(Object.hasOwn(stubs,id))return stubs[id];if(id==='next/server')return {after:fn=>deferred.push(fn),NextResponse:{json:(d,o)=>new Response(JSON.stringify(d),o)}};if(id.startsWith('@/'))return load(id.slice(2)+'.ts',stubs);if(id.startsWith('.'))return load(path.resolve(path.dirname(f),id)+'.ts',stubs);return require(id);};
 m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,f);return m.exports;
}

const JOB='11111111-1111-4111-8111-111111111111';
function harness({enabled=true,outcome='accepted',saveFails=false,throwSend=false}={}) {
 const sent=[],queries=[];
 const tables={support_notifications:[{id:JOB,request_id:'request',status:'queued',attempts:0,due_at:'2020-01-01'}],support_requests:[{id:'request',reference:'SUP-FIXTURE',message:'PRIVATE BODY',account_email:'private@example.invalid'}]};
 const db={from(table){const filters=[];let patch;const q={select:v=>(queries.push([table,v]),q),eq:(k,v)=>(filters.push(r=>r[k]===v),q),in:(k,v)=>(filters.push(r=>v.includes(r[k])),q),lt:(k,v)=>(filters.push(r=>r[k]<v),q),lte:(k,v)=>(filters.push(r=>r[k]<=v),q),order:()=>q,limit:()=>q,range:()=>q,update:p=>(patch=p,q),maybeSingle:async()=>{const r=run();return {...r,data:r.data?.[0]||null}},then:(yes,no)=>Promise.resolve(run()).then(yes,no)};
 function run(){const rows=(tables[table]||[]).filter(r=>filters.every(f=>f(r)));if(saveFails&&patch?.due_at)return {data:null,error:{}};if(patch)rows.forEach(r=>Object.assign(r,patch));return {data:rows.map(r=>({...r})),error:null};}return q;}};
 const previous=process.env.ENABLE_SUPPORT_EMAILS;process.env.ENABLE_SUPPORT_EMAILS='true';
 const lib=load('lib/server/support-notifications.ts',{'@/lib/pilot-readiness':{environmentMatches:()=>enabled},'@/lib/email-provider':{emailProvider:()=>enabled?'resend':null},'./env':{env:{siteUrl:'https://styled.test',supabaseUrl:'https://dev.test'}},'./email-delivery':{trackedDelivery:async(_db,email,link)=>{sent.push({email,link});if(throwSend)throw Error('Timeout');return {accepted:outcome==='accepted',outcome};}}});
 return {db,tables,sent,queries,dispatch:lib.dispatchSupportNotifications,job:tables.support_notifications[0],restore:()=>{if(previous===undefined)delete process.env.ENABLE_SUPPORT_EMAILS;else process.env.ENABLE_SUPPORT_EMAILS=previous;}};
}
test('support dispatch is opt-in; disabled makes zero reads, claims, attempts or sends', async()=>{
 const h=harness({enabled:false});try {assert.equal((await h.dispatch(h.db)).sendingEnabled,false);assert.equal(h.queries.length,0);assert.equal(h.job.attempts,0);assert.equal(h.sent.length,0);}finally{h.restore();}
 const x=harness();delete process.env.ENABLE_SUPPORT_EMAILS;try{await x.dispatch(x.db);assert.equal(x.sent.length,0);assert.equal(x.queries.length,0);}finally{x.restore();}
});
test('only the approved staff mailbox is notified; private bodies and addresses stay in the authenticated inbox',async()=>{
 const h=harness();try{await h.dispatch(h.db);await h.dispatch(h.db);assert.equal(h.sent.length,1);assert.deepEqual(h.sent[0].email.to,['support@styleduk.com']);assert.deepEqual(h.sent[0].link,{supportJobId:JOB});assert.equal(h.job.status,'provider_accepted');assert.doesNotMatch(JSON.stringify(h.sent),/PRIVATE BODY|private@example/);assert.ok(h.queries.some(([t,c])=>t==='support_requests'&&c==='reference'));}finally{h.restore();}
});
test('concurrent support workers claim once; interrupted and uncertain sends stay held',async()=>{
 for(const options of [{},{saveFails:true},{outcome:'unknown'},{throwSend:true}]){const h=harness(options);try{await Promise.all([h.dispatch(h.db),h.dispatch(h.db)]);h.job.due_at='2020-01-01';await h.dispatch(h.db);assert.equal(h.sent.length,1);assert.equal(h.job.attempts,1);assert.equal(h.job.status,options.saveFails?'sending':options.outcome||options.throwSend?'unknown':'provider_accepted');}finally{h.restore();}}
});
test('only definite rejection/pre-send failure retries, with backoff and a five attempt ceiling',async()=>{
 for(const outcome of ['rejected','disabled']){const h=harness({outcome});try{await h.dispatch(h.db);assert.equal(h.job.status,outcome==='rejected'?'failed':'blocked');assert.ok(Date.parse(h.job.due_at)>Date.now()+14*60000);await h.dispatch(h.db);assert.equal(h.sent.length,1);h.job.due_at='2020-01-01';await h.dispatch(h.db);assert.equal(h.sent.length,2);h.job.attempts=5;h.job.due_at='2020-01-01';await h.dispatch(h.db);assert.equal(h.sent.length,2);}finally{h.restore();}}
 const h=harness();try{h.tables.support_requests=[];await h.dispatch(h.db);assert.equal(h.sent.length,0);assert.equal(h.job.status,'blocked');}finally{h.restore();}
});
test('staff retry cannot send or reset held/accepted/exhausted notifications',async()=>{
 const h=harness();const api=load('app/api/admin/support/route.ts',{'@/lib/server/staff':{requireStaff:async()=>({ok:true,admin:h.db,user:{id:'staff'}})}});
 const req=(body,origin='https://styled.test')=>new Request('https://styled.test/api/admin/support',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
 try{for(const status of ['queued','sending','unknown','provider_accepted']){h.job.status=status;assert.equal((await api.POST(req({id:JOB}))).status,409);}h.job.status='failed';h.job.attempts=5;assert.equal((await api.POST(req({id:JOB}))).status,409);h.job.attempts=2;assert.equal((await api.POST(req({id:JOB}))).status,200);assert.equal(h.job.status,'queued');assert.equal(h.job.attempts,2);assert.equal(h.sent.length,0);assert.equal((await api.POST(req({id:JOB},'https://evil.test'))).status,403);}finally{h.restore();}
});
test('staff inbox stays visible with missing notification schema and filters before pagination',async()=>{
 const h=harness();h.tables.support_requests[0].status='new';const api=load('app/api/admin/support/route.ts',{'@/lib/server/staff':{requireStaff:async()=>({ok:true,admin:h.db,user:{id:'staff'}})}});
 try{const response=await api.GET(new Request('https://styled.test/api/admin/support'));const d=await response.json();assert.equal(d.requests.length,1);assert.equal(d.requests[0].notification.id,JOB);h.tables.support_requests[0].status='resolved';assert.equal((await(await api.GET(new Request('https://styled.test/api/admin/support'))).json()).requests.length,0);assert.equal((await api.GET(new Request('https://styled.test/api/admin/support?status=bad'))).status,422);}finally{h.restore();}
});
test('support links use the existing provider ledger; ledger failure prevents any provider call',async()=>{
 let sends=0,rows;
 const delivery=load('lib/server/email-delivery.ts',{'./env':{env:{}},'@/lib/email-provider':{emailProvider:()=> 'resend'},'./notify':{sendTrackedEmail:async()=>{sends++;return {accepted:true,outcome:'accepted',messageId:'fixture-message',provider:'resend'};}}}).trackedDelivery;
 for(const ledgerFails of [true,false]){
  const q={eq:()=>q,then:yes=>Promise.resolve({error:null}).then(yes)};
  const db={from:()=>({insert:async r=>{rows=r;return {error:ledgerFails?{}:null}},update:()=>q})};
  const receipt=await delivery(db,{to:['support@styleduk.com'],subject:'Fixture',text:'Fixture',html:'<p>Fixture</p>'},{supportJobId:JOB});
  assert.equal(receipt.accepted,!ledgerFails);assert.equal(sends,ledgerFails?0:1);assert.equal(rows[0].support_job_id,JOB);assert.equal(rows[0].job_id,null);
 }
});
test('support can be enabled while booking emails remain disabled, but refuses environment mismatch',()=>{
 const oldSupport=process.env.ENABLE_SUPPORT_EMAILS,oldBooking=process.env.ENABLE_BOOKING_EMAILS;
 process.env.ENABLE_SUPPORT_EMAILS='true';process.env.ENABLE_BOOKING_EMAILS='false';
 const env={supabaseUrl:'https://qkyeitvwscrxbiwamxan.supabase.co',siteUrl:'https://styledukprodprogress.vercel.app',resendApiKeyIfSet:'fixture-key'};
 const lib=load('lib/server/support-notifications.ts',{'./env':{env}});
 try{assert.equal(lib.supportEmailEnabled(),true);env.siteUrl='https://styleduk.com';assert.equal(lib.supportEmailEnabled(),false);env.siteUrl='https://styledukprodprogress.vercel.app';env.resendApiKeyIfSet=undefined;assert.equal(lib.supportEmailEnabled(),false);}finally{if(oldSupport===undefined)delete process.env.ENABLE_SUPPORT_EMAILS;else process.env.ENABLE_SUPPORT_EMAILS=oldSupport;if(oldBooking===undefined)delete process.env.ENABLE_BOOKING_EMAILS;else process.env.ENABLE_BOOKING_EMAILS=oldBooking;}
});
test('support schedules best-effort delivery only after save; receipt never claims sent email',async()=>{
 let failed=false,sends=0;deferred.length=0;
 const lib=load('app/api/support/route.ts',{'@/lib/server/session':{requireUser:async()=>({ok:true,user:{id:'owner',email:'fixture@example.invalid',email_confirmed_at:'yes'}})},'@/lib/supabase/admin':{createAdminClient:()=>({rpc:async()=>failed?{error:{message:'private'}}:{data:'SUP-FIXTURE',error:null}})},'@/lib/server/support-notifications':{supportEmailEnabled:()=>true,dispatchSupportNotifications:async()=>{sends++;throw Error('Provider failure');}}});
 const req=()=>new Request('https://styled.test/api/support',{method:'POST',headers:{origin:'https://styled.test','content-type':'application/json'},body:JSON.stringify({topic:'problem',reference:'',message:'Private fixture support question',clientId:JOB})});
 const response=await lib.POST(req());assert.equal(response.status,200);assert.deepEqual(await response.json(),{ok:true,reference:'SUP-FIXTURE'});assert.equal(deferred.length,1);assert.equal(sends,0);await deferred[0]();assert.equal(sends,1);failed=true;assert.equal((await lib.POST(req())).status,503);assert.equal(deferred.length,1);
});
