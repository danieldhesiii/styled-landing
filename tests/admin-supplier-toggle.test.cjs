const {test}=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
function load(file,stubs={}){const f=path.resolve(file),m=new Module(f,module);m.paths=module.paths;m.require=id=>{
 if(Object.hasOwn(stubs,id))return stubs[id];
 if(id==='next/server')return {NextResponse:{json:(b,o)=>new Response(JSON.stringify(b),o)}};
 if(id.startsWith('@/'))return load(id.slice(2)+'.ts',stubs);
 if(id.startsWith('.'))return load(path.resolve(path.dirname(f),id)+'.ts',stubs);
 return require(id);
};m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,f);return m.exports;}
const ID='11111111-1111-4111-8111-111111111111';
const row=()=>({id:ID,name:'Fictional supplier',area:'Test',active:true,contact_email:null,logo_url:null,commission_rate:null,created_at:'2026-01-01'});
const approved=()=>({state:'approved',declarations:{listingPermission:true,publicImagePermission:true,imageRights:true}});
const params={params:Promise.resolve({id:ID})};
const req=body=>new Request(`https://styled.test/api/admin/suppliers/${ID}`,{method:'PATCH',headers:{origin:'https://styled.test','content-type':'application/json'},body:JSON.stringify(body)});
function api({staff=true,review=approved(),error=null,supplier=row(),override=false,readError=null}={}){
 const calls=[];
 const db={from(table){let patch,inserted;const q={select:columns=>(calls.push({table,columns}),q),eq:()=>q,order:()=>q,
 update:p=>(patch=p,calls.push({patch:p}),q),insert:p=>(inserted=p,calls.push({insert:p}),q),
 maybeSingle:async()=>table==='supplier_reviews'?{data:review,error:readError}:patch?{data:error?null:supplier?{...supplier,...patch,active:override?false:patch.active??supplier.active}:null,error}:{data:supplier,error:readError},
 single:async()=>({data:{id:ID,...inserted},error:null}),then:(yes,no)=>Promise.resolve({data:[],error:null}).then(yes,no)};return q;}};
 const mocks={'@/lib/server/staff':{requireStaff:async()=>staff?{ok:true,admin:db}:{ok:false,response:new Response('',{status:403})}}};
 return {...load('app/api/admin/suppliers/[id]/route.ts',mocks),create:load('app/api/admin/suppliers/route.ts',mocks).POST,calls};
}
test('supplier visibility writes return canonical active state and explicit pause/reactivate result',async()=>{
 for(const active of [false,true]){const h=api();const r=await h.PATCH(req({active}),params),d=await r.json();assert.equal(r.status,200);assert.equal(d.supplier.active,active);assert.equal(d.requestedActiveApplied,true);assert.match(d.message,active?/reactivated/:/paused/);assert.ok(h.calls.some(c=>c.columns?.includes('active')));assert.equal(r.headers.get('cache-control'),'private, no-store');}
 const r=await api({override:true}).PATCH(req({name:'Edited fictional name',active:true}),params),d=await r.json();assert.equal(d.supplier.active,false);assert.equal(d.requestedActiveApplied,false);assert.match(d.message,/hidden pending approval/);
});
test('missing approval and busy publication return clear conflicts; missing supplier and malformed body do not succeed',async()=>{
 for(const code of ['P0001','55P03','40P01']){const r=await api({error:{code}}).PATCH(req({active:true}),params);assert.equal(r.status,409);assert.match((await r.json()).error,code==='P0001'?/review.*approv/i:/Refresh/);}
 assert.equal((await api({supplier:null}).PATCH(req({active:false}),params)).status,404);
 for(const body of [null,[],{active:'yes'},{active:1}]){const h=api();assert.equal((await h.PATCH(req(body),params)).status,400);assert.ok(!h.calls.some(c=>c.patch));}
});
test('staff membership guards precede reads/writes, and approval metadata never invents legacy consent',async()=>{
 const denied=api({staff:false});assert.equal((await denied.PATCH(req({active:false}),params)).status,403);assert.equal((await denied.GET(req({}),params)).status,403);assert.equal(denied.calls.length,0);
 for(const review of [null,{state:'draft',declarations:{}},{state:'approved',declarations:{listingPermission:true}}]){const r=await api({review}).GET(req({}),params),d=await r.json();assert.equal(d.publication.canReactivate,false);assert.match(d.publication.reason,/approv/);}
 const d=await(await api().GET(req({}),params)).json();assert.equal(d.publication.canReactivate,true);
 assert.equal((await api({readError:{}}).GET(req({}),params)).status,503);
});
test('new admin suppliers start private and cannot request an approval bypass',async()=>{
 const body={name:'Fictional new supplier',area:'Test'};
 const h=api();const r=await h.create(req(body));assert.equal(r.status,201);assert.equal((await r.json()).supplier.active,false);assert.equal(h.calls.find(c=>c.insert).insert.active,false);
 const refused=api();assert.equal((await refused.create(req({...body,active:true}))).status,422);assert.ok(!refused.calls.some(c=>c.insert));
});

// Executes page handlers with deterministic hooks; no browser, auth, provider or
// network is involved. Database publication semantics are tested separately.
function pageHarness({canReactivate=true,active=true}={}){
 const React=require('react'),slots=[],effects=[],calls=[];let cursor=0,first=true;
 let get=async()=>({ok:true,data:{supplier:{id:ID,name:'Fictional supplier',area:'Test',active,contactEmail:null,logoUrl:null,commissionRate:null},products:[],publication:{reviewState:canReactivate?'approved':'unreviewed',canReactivate,reason:'Review range before reactivating.'}}});
 let patch=async body=>({ok:true,data:{supplier:{id:ID,name:'Fictional supplier',area:'Test',active:body.active,contactEmail:null,logoUrl:null,commissionRate:null},message:body.active?'Supplier reactivated.':'Supplier paused.'}});
 const hooks={...React,useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],v=>{slots[i]=typeof v==='function'?v(slots[i]):v}];},useRef(value){const i=cursor++;if(!(i in slots))slots[i]={current:value};return slots[i];},useEffect(fn){if(first)effects.push(fn);}};
 const stub=()=>null;
 const Page=load('app/admin/(panel)/suppliers/[id]/page.tsx',{'react':hooks,'next/navigation':{useParams:()=>({id:ID})},'next/link':{__esModule:true,default:'a'},'@/components/admin/ProductEditDialog':{__esModule:true,default:stub},'@/components/booking/SupplierRangeReview':{__esModule:true,default:stub},'@/components/vendor/AssetUpload':{__esModule:true,default:stub},'@/components/stock/StockImportPanel':{__esModule:true,default:stub},'@/lib/admin-client':{money:()=>'',adminApi:async(url,method,body)=>{calls.push({url,method,body});if(url.endsWith('/users'))return {ok:true,data:{users:[]}};return method==='PATCH'?patch(body):get();}}}).default;
 let tree;
 const render=()=>{cursor=0;tree=Page();first=false;return tree;};
 function nodes(n,result=[]){if(!n||typeof n!=='object')return result;if(n.props){result.push(n);for(const child of React.Children.toArray(n.props.children))nodes(child,result);}return result;}
 const find=predicate=>nodes(tree).find(predicate);
 const text=()=>{const collect=n=>typeof n==='string'||typeof n==='number'?String(n):n?.props?React.Children.toArray(n.props.children).map(collect).join(' '):'';return collect(tree)};
 const tick=async()=>{await new Promise(resolve=>setImmediate(resolve));render();};
 return {render,find,text,calls,tick,init:async()=>{render();effects.forEach(fn=>fn());await tick();},setPatch:f=>patch=f,setGet:f=>get=f};
}
test('supplier toggle updates from PATCH without a reload, preserves unsaved profile and ignores stale reads',async()=>{
 const h=pageHarness();await h.init();h.find(n=>n.props.id==='e-name').props.onChange({target:{value:'Unsaved profile name'}});h.render();
 let resolveOld;h.setGet(()=>new Promise(resolve=>resolveOld=resolve));h.find(n=>n.type==='button'&&n.props.children==='Refresh supplier status').props.onClick();
 const toggle=h.find(n=>n.props['aria-label']==='Supplier active in shop');await toggle.props.onChange({target:{checked:false}});await h.tick();assert.equal(h.find(n=>n.props['aria-label']==='Supplier active in shop').props.checked,false);assert.equal(h.find(n=>n.props.id==='e-name').props.value,'Unsaved profile name');assert.match(h.text(),/Supplier paused/);
 resolveOld({ok:true,data:{supplier:{active:true},products:[],publication:{canReactivate:true}}});await h.tick();assert.equal(h.find(n=>n.props['aria-label']==='Supplier active in shop').props.checked,false);
});
test('network and guard failures remain beside toggle, release busy state and do not claim success',async()=>{
 for(const result of ['network','guard']){const h=pageHarness();await h.init();h.setPatch(async()=>{if(result==='network')throw Error('Connection failed');return {ok:false,data:{error:'Review and approve the range.'}};});await h.find(n=>n.props['aria-label']==='Supplier active in shop').props.onChange({target:{checked:false}});await h.tick();const toggle=h.find(n=>n.props['aria-label']==='Supplier active in shop');assert.equal(toggle.props.checked,true);assert.equal(toggle.props.disabled,false);assert.ok(h.find(n=>n.props.role==='alert'));assert.doesNotMatch(h.text(),/Supplier paused\./);}
});
test('unreviewed active suppliers may pause, unreviewed hidden suppliers link to review instead of reactivation',async()=>{
 for(const active of [true,false]){const h=pageHarness({canReactivate:false,active});await h.init();assert.equal(h.find(n=>n.props['aria-label']==='Supplier active in shop').props.disabled,!active);assert.ok(h.find(n=>n.props.href==='#range-review'));assert.match(h.text(),active?/reactivation will require range approval/:/Hidden — review required/);}
});
