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
function harness({audience='venue',enabled=true,outcome='accepted',throwSend=false,saveFails=false,ledgerFails=false,users,authError=false}={}){
 const sent=[],queries=[];
 const tables={booking_email_deliveries:[],venue_conversation_notifications:[{id:JOB,message_id:'message',request_id:'request',audience,status:'queued',attempts:0,due_at:'2020-01-01',created_at:'2020-01-01'}],venue_enquiries:[{id:'request',venue_id:'venue',owner_user_id:'owner',email:'UNTRUSTED@example.com',response:'PRIVATE RESPONSE'}],venue_request_messages:[{id:'message',request_id:'request',sender_kind:audience==='venue'?'customer':'venue',body:'PRIVATE MESSAGE'}],venue_users:[{venue_id:'venue',user_id:'team'},{venue_id:'venue',user_id:'team2'},{venue_id:'foreign',user_id:'outsider'}]};
 const accounts=users||{owner:{email:'owner@example.com',email_confirmed_at:'yes'},team:{email:'team@example.com',email_confirmed_at:'yes'},team2:{email:'TEAM@example.com',email_confirmed_at:'yes'},outsider:{email:'outsider@example.com',email_confirmed_at:'yes'}};
 const db={rpc:async()=>({data:true}),auth:{admin:{getUserById:async id=>({data:{user:accounts[id]||null},error:authError===true||authError===id?{}:null})}},from(table){const filters=[];let patch,columns;const q={insert:async rows=>{if(ledgerFails)return {error:{}};tables[table].push(...rows.map(r=>({status:'pending',message_id:null,...r})));return {error:null};},select:v=>(columns=v,queries.push([table,v]),q),eq:(k,v)=>(filters.push(r=>r[k]===v),q),in:(k,v)=>(filters.push(r=>v.includes(r[k])),q),lt:(k,v)=>(filters.push(r=>r[k]<v),q),lte:(k,v)=>(filters.push(r=>r[k]<=v),q),limit:()=>q,order:()=>q,update:p=>(patch=p,q),maybeSingle:async()=>{const result=run();return {...result,data:result.data?.[0]||null}},then:(yes,no)=>Promise.resolve(run()).then(yes,no)};
 function run(){const rows=(tables[table]||[]).filter(r=>filters.every(f=>f(r)));if(saveFails&&patch?.due_at)return {data:null,error:{}};if(patch)rows.forEach(r=>Object.assign(r,patch));return {data:rows.map(r=>({...r})),error:null};}return q;}};
 const dispatch=load('lib/server/venue-conversation-notifications.ts',{'./booking-notifications':{bookingEmailEnabled:()=>enabled},'./env':{env:{siteUrl:'https://styled.test'}},'./email-delivery':{trackedDelivery:async(_db,email,link)=>{sent.push({email,link});if(throwSend)throw Error('Provider timeout');return {accepted:outcome==='accepted',outcome};}}}).dispatchVenueConversationNotifications;
 return {db,tables,sent,queries,dispatch,job:tables.venue_conversation_notifications[0]};
}
test('verified current participants only, deduplicated, private bodies never selected or emailed',async()=>{
 for(const audience of ['venue','customer']){const h=harness({audience});await h.dispatch(h.db);await h.dispatch(h.db);assert.equal(h.sent.length,1);assert.deepEqual(h.sent[0].email.to,[audience==='venue'?'team@example.com':'owner@example.com']);assert.deepEqual(h.sent[0].link,{venueJobId:JOB});assert.equal(h.job.status,'provider_accepted');assert.doesNotMatch(JSON.stringify(h.sent),/PRIVATE|UNTRUSTED|outsider/);assert.ok(h.queries.filter(([t])=>t==='venue_request_messages').every(([,s])=>!s.includes('body')));}
});
test('disabled dispatch does not query, send, claim or consume attempts',async()=>{const h=harness({enabled:false});assert.equal((await h.dispatch(h.db)).sendingEnabled,false);assert.equal(h.job.attempts,0);assert.equal(h.job.status,'queued');assert.equal(h.queries.length,0);assert.equal(h.sent.length,0);});
test('missing, anonymous, unverified, banned accounts and auth errors block before any send',async()=>{
 for(const user of [null,{email:'u@example.com'},{email:'u@example.com',email_confirmed_at:'yes',is_anonymous:true},{email:'u@example.com',email_confirmed_at:'yes',banned_until:'2999-01-01'},{email:'fixture@example.invalid',email_confirmed_at:'yes'}]){const h=harness({users:{team:user,team2:user}});await h.dispatch(h.db);assert.equal(h.sent.length,0);assert.equal(h.job.status,'blocked');}
 for(const authError of [true,'team2']){const h=harness({authError});await h.dispatch(h.db);assert.equal(h.sent.length,0);assert.equal(h.job.status,'blocked');}
});
test('changed membership and ownership are resolved when processing, never from saved email',async()=>{const h=harness();h.tables.venue_users=[];await h.dispatch(h.db);assert.equal(h.sent.length,0);const c=harness({audience:'customer'});c.tables.venue_enquiries[0].owner_user_id=null;await c.dispatch(c.db);assert.equal(c.sent.length,0);});
test('definite rejection retries after backoff; unknown and partial sends never retry',async()=>{
 for(const outcome of ['rejected','unknown','disabled']){const h=harness({outcome});await h.dispatch(h.db);assert.ok(Date.parse(h.job.due_at)>Date.now()+14*60_000);assert.ok(Date.parse(h.job.due_at)<=Date.now()+15*60_000);assert.equal(h.job.status,{rejected:'failed',unknown:'unknown',disabled:'blocked'}[outcome]);await h.dispatch(h.db);assert.equal(h.sent.length,1);h.job.due_at='2020-01-01';await h.dispatch(h.db);assert.equal(h.sent.length,outcome==='unknown'?1:2);h.job.attempts=5;h.job.due_at='2020-01-01';await h.dispatch(h.db);assert.equal(h.sent.length,outcome==='unknown'?1:2);}
 const h=harness({throwSend:true});await h.dispatch(h.db);h.job.due_at='2020-01-01';await h.dispatch(h.db);assert.equal(h.job.status,'unknown');assert.equal(h.sent.length,1);
});
test('concurrent dispatch claims once; accepted, unknown and interrupted jobs stay held',async()=>{
 const h=harness();await Promise.all([h.dispatch(h.db),h.dispatch(h.db)]);assert.equal(h.sent.length,1);assert.equal(h.job.attempts,1);
 const broken=harness({saveFails:true});await broken.dispatch(broken.db);await broken.dispatch(broken.db);assert.equal(broken.job.status,'sending');assert.equal(broken.sent.length,1);
 for(const status of ['unknown','sending','provider_accepted']){const h=harness();h.job.status=status;await h.dispatch(h.db);assert.equal(h.sent.length,0);}
});
function api(h,staff=true){return load('app/api/admin/venue-notifications/route.ts',{'@/lib/server/staff':{requireStaff:async()=>staff?{ok:true,admin:h.db,user:{id:'staff'}}:{ok:false,response:new Response('',{status:403})}},'@/lib/server/booking-notifications':{bookingEmailEnabled:()=>true},'@/lib/server/venue-conversation-notifications':{dispatchVenueConversationNotifications:h.dispatch}});}
function request(body,origin='https://styled.test'){return new Request('https://styled.test/api/admin/venue-notifications',{method:'POST',headers:{'Content-Type':'application/json',...(origin?{origin}:{})},body:JSON.stringify(body)});}
test('queue API staff authorization precedes reads and actions, with same-origin JSON CSRF checks',async()=>{
 const h=harness(),denied=api(h,false);assert.equal((await denied.GET(new Request('https://styled.test'))).status,403);assert.equal((await denied.POST(request({action:'process_due'}))).status,403);assert.equal(h.queries.length,0);
 const route=api(h);for(const origin of [null,'https://attacker.test'])assert.equal((await route.POST(request({action:'process_due'},origin))).status,422);
 assert.equal(h.sent.length,0);const get=await route.GET(new Request('https://styled.test'));assert.equal(get.headers.get('cache-control'),'private, no-store');
 for(const status of ['unknown','sending','provider_accepted']){h.job.status=status;assert.equal((await route.POST(request({action:'retry',jobId:JOB}))).status,422);}assert.equal(h.sent.length,0);
 h.job.status='queued';assert.equal((await route.POST(request({action:'retry',jobId:JOB}))).status,200);assert.equal(h.sent.length,1);
});
test('legacy response helper only dispatches saved jobs and disabled gate prevents all email work',async()=>{
 let enabled=true,dispatches=0,created=0;const lib=load('lib/server/venue-notify.ts',{'@/lib/supabase/admin':{createAdminClient:()=>{created++;return {}}},'./booking-notifications':{bookingEmailEnabled:()=>enabled},'./venue-conversation-notifications':{dispatchVenueConversationNotifications:async(_db,id)=>{assert.equal(id,'request');dispatches++;}},'./notify':{sendEmail:()=>assert.fail('Legacy response send forbidden')},'./env':{env:{}}});await lib.notifyVenueRequest('request','response');assert.equal(dispatches,1);enabled=false;await lib.notifyVenueRequest('request','response');await lib.notifyVenueRequest('request','new');assert.equal(dispatches,1);assert.equal(created,1);
});
test('cron requires its secret and sending gate before dispatching either queue',async()=>{
 const previous=process.env.CRON_SECRET;process.env.CRON_SECRET='fixture';let enabled=false,bookings=0,venues=0;
 const lib=load('app/api/cron/booking-notifications/route.ts',{'@/lib/supabase/admin':{createAdminClient:()=>({})},'@/lib/server/booking-notifications':{bookingEmailEnabled:()=>enabled,dispatchBookingNotifications:async()=>{bookings++;return {processed:2}}},'@/lib/server/venue-conversation-notifications':{dispatchVenueConversationNotifications:async()=>{venues++;return {processed:1}}}});
 try{assert.equal((await lib.GET(new Request('https://styled.test'))).status,401);const req=()=>new Request('https://styled.test',{headers:{authorization:'Bearer fixture'}});await lib.GET(req());assert.equal(bookings+venues,0);enabled=true;const body=await (await lib.GET(req())).json();assert.equal(bookings,1);assert.equal(venues,1);assert.equal(body.venueNotifications.processed,1);}finally{if(previous===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=previous;}
});
test('staff queue shows venue names, short scoped references, queued and last-error signals',async()=>{
 const {renderToStaticMarkup}=require('react-dom/server'),React=require('react');
 const h=harness();h.job.last_error='No verified participant is available.';h.job.request_id='33333333-3333-4333-8333-333333333333';
 h.job.venue_enquiries={venue_id:'22222222-2222-4222-8222-222222222222',venue_listings:{name:'Fictional Manor'}};h.job.booking_email_deliveries=[];
 const route=api(h),response=await route.GET(new Request('https://styled.test'));
 const data=await response.json();assert.equal(data.jobs[0].status,'queued');assert.equal(data.jobs[0].last_error,h.job.last_error);
 assert.ok(h.queries.some(([,s])=>s.includes('venue_enquiries(venue_id,venue_listings(name))')));
 let state=0;
 const component=load('components/booking/VenueNotificationQueue.tsx',{'react':{...React,useEffect:()=>{},useState:()=>[state++===0?data:state===2?'':false,()=>{}]},'next/link':{__esModule:true,default:({children,...props})=>React.createElement('a',props,children)}}).default;
 const html=renderToStaticMarkup(React.createElement(component));assert.match(html,/Fictional Manor/);assert.match(html,/Request 33333333/);assert.doesNotMatch(html,/>Request 33333333-3333/);assert.match(html,/\/admin\/venues\/22222222-2222-4222-8222-222222222222\/enquiries/);assert.match(html,/queued/);assert.match(html,/No verified participant is available/);assert.match(html,/href="\/admin\/operations"/);assert.match(html,/Back to Service checks/);
});
test('venue queue is recognised by the executable admin section selector',()=>{
 const {renderToStaticMarkup}=require('react-dom/server'),React=require('react');
 const component=load('components/admin/AdminNav.tsx',{'next/link':{__esModule:true,default:({children,...props})=>React.createElement('a',props,children)},'next/navigation':{usePathname:()=>'/admin/venue-notifications',useRouter:()=>({push:()=>{}})},'@/lib/supabase/client':{createClient:()=>assert.fail('No auth network during render')}}).default;
 assert.match(renderToStaticMarkup(React.createElement(component,{email:'fixture@example.invalid'})),/<option value="\/admin\/venue-notifications" selected="">Venue notifications<\/option>/);
});
test('follow-up success registers best-effort dispatch after persistence; failed writes do not dispatch',async()=>{
 let failWrite=false,sends=0,writes=0;deferred.length=0;
 const requestRow={id:'request',venue_id:'venue',owner_user_id:'owner',status:'new'};
 const admin={rpc:async name=>name==='hit_rate_limit'?{data:true}:{error:failWrite?{}:null,...(writes++,{})}};
 const supabase={from:table=>{const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:table==='venue_enquiries'?requestRow:null,error:null})};return q;}};
 const route=load('app/api/venue-follow-up/route.ts',{'@/lib/server/venue-access':{requireVenueAccount:async()=>({ok:true,user:{id:'owner'},admin,supabase}),venueUuid:()=>true,londonToday:()=> '2026-11-02'},'@/lib/server/venue-conversation-notifications':{dispatchVenueConversationNotifications:async(db,id)=>{assert.equal(db,admin);assert.equal(id,'request');sends++;return {processed:0,error:'Fixture dispatch failure'};}}});
 const req=()=>new Request('https://styled.test/api/venue-follow-up',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:'request',action:'message',message:'Private fixture'})});
 assert.equal((await route.POST(req())).status,200);assert.equal(writes,1);assert.equal(sends,0);assert.equal(deferred.length,1);await deferred.shift()();assert.equal(sends,1);
 failWrite=true;assert.equal((await route.POST(req())).status,409);assert.equal(deferred.length,0);assert.equal(sends,1);
});
test('real tracker links venue ledger rows and holds partial/unknown sends; pre-send ledger failure makes no provider calls',async()=>{
 const network=global.fetch;global.fetch=()=>assert.fail('Actual network is forbidden in venue tests');
 try {for(const outcomes of [['accepted','rejected'],['unknown','rejected'],['rejected','rejected'],['accepted','accepted'],[]]){
   const h=harness({ledgerFails:!outcomes.length,users:{team:{email:'one@example.com',email_confirmed_at:'yes'},team2:{email:'two@example.com',email_confirmed_at:'yes'}}});let calls=0;const sent=[];
   const tracker=load('lib/server/email-delivery.ts',{'./env':{env:{resendApiKeyIfSet:'FICTIONAL'}},'./notify':{sendTrackedEmail:async email=>{sent.push(email);const outcome=outcomes[calls++];return {accepted:outcome==='accepted',provider:'resend',messageId:JOB,outcome};}}});
   const dispatch=load('lib/server/venue-conversation-notifications.ts',{'./booking-notifications':{bookingEmailEnabled:()=>true},'./env':{env:{siteUrl:'https://styled.test'}},'./email-delivery':tracker}).dispatchVenueConversationNotifications;
   await dispatch(h.db);const expected=!outcomes.length?'blocked':outcomes.every(o=>o==='accepted')?'provider_accepted':outcomes.every(o=>o==='rejected')?'failed':'unknown';assert.equal(h.job.status,expected);assert.equal(calls,outcomes.length);
   for(const row of h.tables.booking_email_deliveries){assert.equal(row.venue_job_id,JOB);assert.equal(row.job_id,null);assert.equal(row.check_user_id,null);}
   if(outcomes.length){assert.deepEqual(sent.map(s=>s.to),[['one@example.com'],['two@example.com']]);assert.equal(new Set(sent.map(s=>s.trackingRun)).size,2);const parser=load('lib/server/resend-webhook.ts');const event=parser.parseResendDeliveryEvent({type:'email.delivered',created_at:new Date().toISOString(),data:{email_id:JOB,to:sent[0].to,tags:{styled_delivery:sent[0].trackingRun}}},'msg_fixture');assert.equal(event.p_run,h.tables.booking_email_deliveries[0].run_id);assert.equal(event.p_recipient,h.tables.booking_email_deliveries[0].recipient_hash);}
   if(['unknown','provider_accepted'].includes(expected)){h.job.due_at='2020-01-01';await dispatch(h.db);assert.equal(calls,outcomes.length);}
 }} finally {global.fetch=network;}
});
