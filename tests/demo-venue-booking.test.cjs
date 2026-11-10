const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
function load(file){const f=path.resolve(file),m=new Module(f,module);m.paths=module.paths;m.require=id=>id.startsWith('.')?load(path.resolve(path.dirname(f),id)+'.ts'):require(id);m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);return m.exports;}
const {demoVenueRequestError:check,demoAlternativeDay}=load('lib/demo-venue-booking.ts');
test('practice requests support multi-day venue hire while rejecting invalid dates and capacity',()=>{
 const base={start:'2027-06-12',end:'2027-06-14',guests:'80',message:'Ceremony and reception'};
 assert.equal(check(base,20,120,'2027-01-01'),null);
 for(const patch of [{start:'2026-06-12'},{end:'2027-06-11'},{end:'2027-07-30'},{guests:'121'},{guests:'19'},{guests:'2e2'},{message:'x'.repeat(1001)}])assert.ok(check({...base,...patch},20,120,'2027-01-01'));
 assert.equal(demoAlternativeDay('2027-12-29'),'2028-01-05');
 assert.equal(demoAlternativeDay('2028-02-25'),'2028-03-03');
});
test('fictional venue fixtures cover all supplier routes and never use live venue IDs',()=>{
 const {DEMO_VENUES}=load('lib/demo-venues.ts');
 assert.equal(DEMO_VENUES.length,3);
 assert.deepEqual(new Set(DEMO_VENUES.map(v=>v.details.supplier_policy.mode)),new Set(['venue_only','venue_partners','styled']));
 for(const v of DEMO_VENUES){assert.equal(v.is_demo,true);assert.match(v.id,/^demo-/);assert.equal(v.details.supplier_policy.catalogueSupplierIds.length,0);assert.equal(v.details.supplier_policy.bookingUrl,'');}
});
