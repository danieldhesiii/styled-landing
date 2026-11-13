const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
const path = require('node:path');

test('historical retired listings cannot enter browsing or direct item lookups', async () => {
  const rows = [
    {id:'old-invitations', category:'stationery', suppliers:{id:'paper-supplier',name:'Paper business',area:'London'}},
    {id:'current-chair', category:'furniture', suppliers:{id:'chair-supplier',name:'Chair business',area:'London'}, unit_price_pence:650, capacity:100},
  ];
  const query = {
    select(){return this;}, eq(){return this;}, order(){return this;}, range(){return this;},
    async returns(){return {data:rows,error:null};},
  };
  const file = path.resolve('lib/server/catalogue.ts');
  const module = new Module(file);
  module.require = id => {
    if(id === '@/lib/supabase/anon') return {createAnonClient:()=>({from:()=>query})};
    if(id === '@/lib/supplier-workspace') return {money:()=>0};
    if(id === './crescent-call-demo') return {linkedCrescentProduct:()=>false};
    throw Error('Unexpected runtime dependency: '+id);
  };
  module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,file);
  assert.deepEqual((await module.exports.loadCatalogue()).map(p=>p.id),['current-chair']);
  assert.equal((await module.exports.loadItemsById(['old-invitations'])).size,0);
});
