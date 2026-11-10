const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const assetId='11111111-1111-4111-8111-111111111111',supplierId='22222222-2222-4222-8222-222222222222';
function reader(scenario){
 let downloads=0;
 const admin={from(table){
  const row=table==='supplier_review_assets'?{id:assetId,path:'fixture.webp',supplier_id:supplierId,product_id:'fixture',approved:true,ai_reference_allowed:scenario.assetGrant!==false}:
   table==='supplier_reviews'?(scenario.missing?null:{supplier_id:supplierId,declarations:{listingPermission:true,publicImagePermission:true,imageRights:true,aiReferencePermission:scenario.consent,...scenario.rights}}):
   {id:'fixture',supplier_id:supplierId,image:`/api/supplier-images/${assetId}`,active:true,'suppliers.active':true};
  const filters=[];const q={select:()=>q,eq:(k,v)=>(filters.push([k,v]),q),maybeSingle:async()=>({
   data:row&&filters.every(([k,v])=>row[k]===v)?row:null,error:table==='supplier_reviews'&&scenario.error?Error('Unavailable'):null})};return q;
 },storage:{from:()=>({download:async()=>{downloads++;return {data:new Blob(['fixture']),error:null};}})}};
 const file=path.resolve('lib/server/published-supplier-image.ts'),m=new Module(file,module);m.paths=module.paths;
 m.require=id=>id==='server-only'?{}:id==='@/lib/supabase/admin'?{createAdminClient:()=>admin}:require(id);
 m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
 return {read:m.exports.publishedSupplierImage,downloads:()=>downloads};
}
test('AI reference reads reject withdrawn/missing/invalid consent and review errors before downloading stale approved assets',async()=>{
 for(const scenario of [{consent:false},{missing:true},{},{consent:'true'},{consent:true,error:true},{consent:true,assetGrant:false}]){
  const h=reader(scenario);assert.equal(await h.read(assetId,true),null);assert.equal(h.downloads(),0);
 }
});
test('AI reference reads require both consent and approved grant; public display remains independent of AI consent',async()=>{
 const approved=reader({consent:true});assert.ok(await approved.read(assetId,true));assert.equal(approved.downloads(),1);
 const withdrawn=reader({consent:false});assert.ok(await withdrawn.read(assetId,false));assert.equal(withdrawn.downloads(),1);
});
test('public and AI image reads reject withdrawn listing permission, public-photo permission and image rights despite stale asset flags',async()=>{
 for(const key of ['listingPermission','publicImagePermission','imageRights']){
  for(const generation of [false,true]){
   const h=reader({consent:true,rights:{[key]:false}});
   assert.equal(await h.read(assetId,generation),null);assert.equal(h.downloads(),0);
  }
 }
 for(const scenario of [{missing:true},{consent:true,error:true}]){
  const h=reader(scenario);assert.equal(await h.read(assetId,false),null);assert.equal(h.downloads(),0);
 }
});
