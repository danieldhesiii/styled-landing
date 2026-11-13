const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
function load(file,stubs={}){const f=path.resolve(file),m=new Module(f,module);m.paths=module.paths;m.require=id=>{if(Object.hasOwn(stubs,id))return stubs[id];if(id.startsWith('@/'))return id.endsWith('.json')?require(path.resolve(id.slice(2))):load(id.slice(2)+'.ts',stubs);if(id.startsWith('.'))return id.endsWith('.json')?require(path.resolve(path.dirname(f),id)):load(path.resolve(path.dirname(f),id)+'.ts',stubs);return require(id);};m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);return m.exports;}
const matching=load('lib/product-matching.ts'),demos=load('lib/crescent-moon-demo-catalogue.ts').crescentMoonDemoCatalogue();
const chair={id:'chair',name:'Oak Crossback Chair',supplier:'Chairs',category:'furniture',styles:['rustic_barn'],image:'/chair.jpg',capacity:100,unitPrice:5,qtyRule:'fixed',stock:'in_stock'};
const classic={...chair,id:'classic-chair',name:'Gold Chiavari Chair',styles:['classic_elegance']};
const lighting={id:'fairy',name:'Fairy-Light Backdrop Wall',category:'lighting',styles:['classic_elegance'],note:'Warm fairy lights',capacity:10,unitPrice:200,qtyRule:'fixed'};
const choose=(extra={})=>matching.choosePreviewProduct({catalogue:demos,currentItems:[lighting],brief:'',styleId:'classic_elegance',chosenIds:[],allow:true,auto:true,...extra});
test('catalogue names work across categories, accents, spacing and exact model numbers',()=>{const result=matching.namedProducts('Use MARIE THÉRÈSE100 and Oak Crossback Chair.',[...demos,chair]);assert.deepEqual(result.items.map(i=>i.name),['Marie Therese 100','Oak Crossback Chair']);assert.throws(()=>matching.namedProducts('Marie Therese 100 and Marie Therese 999',demos),/model number is not listed/);assert.throws(()=>matching.namedProducts('Empire 900',demos),/model number is not listed/);assert.throws(()=>matching.namedProducts('Oak Crossback Chair and Marie Therese 200',[...demos,chair]),/model number is not listed/);assert.equal(matching.namedProducts('Necklace Empire 180',demos).items[0].name,'Vintage Necklace Empire 180');assert.equal(matching.namedProducts('Use Candles',[{...chair,name:'Candles'}]).items.length,1);});
test('negated items are excluded while a separately requested replacement is retained',()=>{for(const brief of ['No Empire 90, use Marie Therese 150','Remove Empire 90 and use Marie Therese 150','Use Marie Therese 150 instead of Empire 90']){const result=matching.namedProducts(brief,demos);assert.deepEqual(result.items.map(i=>i.name),['Marie Therese 150']);assert.deepEqual(result.excludedIds,['demo-crescent-moon-empire-90']);}});
test('ambiguous model families require an exact size instead of guessing',()=>{assert.throws(()=>matching.namedProducts('Use a Marie Therese chandelier',demos),/Marie Therese 100 or Marie Therese 150/);assert.equal(matching.namedProducts('No Marie Therese please',demos).items.length,0);});
test('automatic choice follows style and description, without needing a product selector',()=>{assert.equal(choose().name,'Marie Therese 100');assert.equal(choose({brief:'Use Empire 200',styleId:'rustic_barn'}).name,'Empire 200');assert.equal(choose({brief:'Use Empire 200',chosenIds:['demo-crescent-moon-empire-90']}).name,'Empire 200');assert.equal(choose({brief:'A small compact chandelier'}).name,'Empire 90');assert.equal(choose({brief:'No chandeliers'}),undefined);assert.equal(choose({styleId:'modern_minimal',currentItems:[]}),undefined);});
test('venue/supplier restrictions and deliberate live choices cannot be bypassed by matching',()=>{assert.equal(choose({allow:false}),undefined);assert.throws(()=>choose({allow:false,brief:'Use Empire 90'}),/not available/);assert.equal(choose({chosenIds:['fairy']}),undefined);assert.equal(choose({auto:false}),undefined);});
test('named products override style alternatives; unavailable or out-of-scope named products fail clearly',async()=>{
 for(const mode of ['available','unavailable','restricted']){
  const stubs={'@/lib/server/catalogue':{loadCatalogue:async()=>[chair,classic],SCENE_CATEGORIES:{reception:['furniture']}},'./venue-catalogue':{venueCatalogue:async()=>({items:[classic]})},'@/lib/supabase/admin':{createAdminClient:()=>({})},'@/lib/server/availability':{loadAvailability:async()=>new Map([[chair.id,{effectiveCapacity:mode==='unavailable'?0:100,available:mode==='unavailable'?0:100}],[classic.id,{effectiveCapacity:100,available:100}]])}};
  const server=load('lib/server/look.ts',stubs),opts={brief:'Use Oak Crossback Chair',venueSlug:mode==='restricted'?'restricted':undefined,styleId:'classic_elegance',chosenIds:[classic.id],setting:'reception',weddingDate:'2099-01-01',guestCount:1};
  if(mode==='available'){const result=await server.composeOrderableLook(opts);assert.deepEqual(result.items.map(i=>i.id),[chair.id]);assert.deepEqual(result.namedIds,[chair.id]);}
  else await assert.rejects(server.composeOrderableLook(opts),mode==='restricted'?/outside this venue/:/cannot be supplied/);
 }
});
test('named photos get image-budget priority and never silently disappear',async()=>{let reads=[];const {loadProductReferences}=load('lib/server/product-references.ts',{'@/lib/server/public-images':{readPublicImage:async image=>{reads.push(image);if(image==='/missing')throw Error('missing');return Buffer.from(image);}}});const result=await loadProductReferences([{...classic,image:'/classic.jpg'},chair],[chair.id],1);assert.deepEqual(result.names,['Oak Crossback Chair']);assert.deepEqual(reads,['/chair.jpg']);await assert.rejects(loadProductReferences([chair],[chair.id],0),/fewer venue/);await assert.rejects(loadProductReferences([{...chair,image:'/missing'}],[chair.id],1),/reference photo/);});
test('generation selects by style or product name and records references without a special selector',async()=>{
 const parentId='11111111-1111-4111-8111-111111111111';
 const oldPreview=demos.find(i=>i.name==='Empire 90');
 for(const mode of ['style','named-preview','named-ordinary','replace-preview-with-live']){
  let row,job;const callbacks=[],loaded=[];
  const refining=mode==='replace-preview-with-live',brief=mode==='named-preview'?'Use Empire 200':mode==='named-ordinary'?'Use Oak Crossback Chair':refining?'Use Festoon Canopy Package instead':'A classic elegant crystal look';
  const liveLighting={...lighting,name:'Festoon Canopy Package',id:'festoon',image:'/festoon.jpg',styles:['rustic_barn']};
  const q={select:()=>q,order:()=>q,limit:()=>q,maybeSingle:async()=>({data:{id:'brief'}}),update:()=>q,eq:async()=>({error:null})};
  const stubs={
   'next/server':{NextResponse:{json:(d,o)=>new Response(JSON.stringify(d),o)},after:fn=>callbacks.push(fn)},
   '@/lib/server/session':{requireUser:async()=>({ok:true,user:{id:'user'},supabase:{from:()=>q}})},
   '@/lib/server/env':{env:{openaiApiKeyIfSet:'test-only',maxRefinements:6,imageModel:'configured-model'}},
   '@/lib/styles':{STYLES:[{id:'classic_elegance'},{id:'modern_minimal'}],getStyle:()=>({})},
   '@/lib/scenes':{DEFAULT_SCENE:'reception',isSceneId:()=>true},
   '@/lib/server/render-prompt':{cleanBrief:x=>x||'',MAX_ITEMS:12,buildRefinePrompt:()=> 'Edit the room',buildRenderPrompt:()=> 'Restyle the room'},
   '@/lib/board-inspiration':{parsePhotoSelection:()=>[]},
   '@/lib/server/look':{usableDate:()=>null,composeOrderableLook:async opts=>{const picks=opts.brief?(mode==='named-ordinary'?[chair]:refining?[liveLighting]:[]):[];return {items:picks,namedIds:picks.map(i=>i.id),report:{items:picks.map(i=>({...i})),leftPlain:[]}};}},
   '@/lib/supabase/admin':{createAdminClient:()=>({from:()=>({insert:async data=>(row=data,{error:null})})})},
   '@/lib/server/limits':{clientIpHash:()=>'',checkRenderLimits:async()=>null},
   '@/lib/server/render-source':{loadSampleVenue:async()=>({images:[Buffer.from('room')],width:1024,height:1024,photoIds:[]}),loadParentRender:async()=>({id:parentId,briefId:'brief',depth:0,lookReport:{items:[],demoReference:oldPreview},sampleVenueId:'sample',styleId:'classic_elegance',base:{images:[Buffer.from('room')],width:1024,height:1024,photoIds:[]}})},
   '@/lib/server/render-job':{runRenderJob:async opts=>{job=opts;}},
   '@/lib/crescent-moon-demo-catalogue':{crescentMoonDemoCatalogue:()=>demos},
   '@/lib/server/crescent-moon-references':{loadCrescentMoonReferences:async id=>(loaded.push(id),{buffers:[Buffer.from(id)],names:[id]}),chandelierIdentityInstruction:id=>'Match '+id,orderChandelierInputs:(room,products)=>[room[0],...products]},
   '@/lib/server/image-model':{sizeFor:()=> '1024x1024'},
   '@/lib/server/public-images':{readPublicImage:async image=>Buffer.from(image)},'@/lib/server/selected-photos':{loadSelectedPhotoBuffers:async()=>({buffers:[]})},'@/lib/wedding':{},'@/lib/categories':{categoryMeta:c=>({label:c})}
  };
  const response=await load('app/api/generate/route.ts',stubs).POST(new Request('https://styledukprodprogress.vercel.app/api/generate',{method:'POST',body:JSON.stringify({venueId:'sample',styleId:mode==='named-ordinary'?'modern_minimal':'classic_elegance',prompt:brief,...(refining?{parentRenderId:parentId}:{})})}));
  assert.equal(response.status,202,await response.clone().text());for(const fn of callbacks)await fn();
  const expected=mode==='style'?'Marie Therese 100':mode==='named-preview'?'Empire 200':undefined;
  assert.equal(row.look_report.demoReference?.name,expected);
  if(expected){assert.deepEqual(loaded,[row.look_report.demoReference.id]);assert.ok(job.prompt.includes('Match '+row.look_report.demoReference.id));assert.deepEqual(row.item_ids,[row.look_report.demoReference.id]);}
  else {assert.deepEqual(loaded,[]);assert.equal(row.look_report.items.length,1);assert.equal(row.item_ids[0],refining?'festoon':chair.id);assert.ok(job.images.some(b=>b.toString()===(refining?'/festoon.jpg':'/chair.jpg')));}
 }
});
test('naming a chair replaces another chair without removing the tables from the look',async()=>{const oak={...chair,slot:'chairs'},gold={...classic,slot:'chairs'},table={...chair,id:'table',name:'Round Banquet Table',slot:undefined};const server=load('lib/server/look.ts',{'@/lib/server/catalogue':{loadCatalogue:async()=>[oak,gold,table],SCENE_CATEGORIES:{reception:['furniture']}},'./venue-catalogue':{},'@/lib/supabase/admin':{},'@/lib/server/availability':{}});const result=await server.composeOrderableLook({brief:'Use Oak Crossback Chair',styleId:'classic_elegance',chosenIds:[gold.id,table.id],setting:'reception',weddingDate:null,guestCount:1,autoFill:false,substitute:false});assert.deepEqual(result.items.map(i=>i.id),[oak.id,table.id]);});
test('brochure model names select the intended chandelier without conflating French variants',()=>{
 for(const [name,expected] of [['Empire Chandelier 90','Empire 90'],['Empire Chandelier 200','Empire 200'],['Marie Therese Chandelier 100','Marie Therese 100'],['Necklace Empire 180','Vintage Necklace Empire 180']]){
  assert.deepEqual(matching.namedProducts('Use '+name,demos).items.map(i=>i.name),[expected]);
 }
 assert.throws(()=>matching.namedProducts('Use Vintage French Crystal Empire 105',demos),/separate variant/);
});
