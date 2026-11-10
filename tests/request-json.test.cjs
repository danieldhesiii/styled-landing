const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),Module=require('node:module');
const m=new Module('json',module);m._compile(ts.transpileModule(fs.readFileSync('lib/server/request-json.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,'json');
const {readJsonObject}=m.exports;
const request=body=>new Request('https://styled.test',{method:'POST',body});
test('JSON form accepts objects and preserves Unicode',async()=>{assert.deepEqual(await readJsonObject(request('{"name":"Café 🌷"}')),{name:'Café 🌷'});});
test('null, arrays, scalars, malformed JSON and invalid UTF-8 are controlled form errors',async()=>{for(const body of ['null','[]','true','"text"','{',new Uint8Array([0xff,0xff])])await assert.rejects(readJsonObject(request(body)),e=>e.status===400);});
test('body limit counts bytes rather than characters and rejects chunked streams',async()=>{await assert.rejects(readJsonObject(request('{"a":"🌷🌷"}'),10),e=>e.status===413);let cancelled=false;const stream=new ReadableStream({start(c){c.enqueue(new Uint8Array(8));c.enqueue(new Uint8Array(8));},cancel(){cancelled=true;}});await assert.rejects(readJsonObject(new Request('https://styled.test',{method:'POST',body:stream,duplex:'half'}),10),e=>e.status===413);assert.equal(cancelled,true);});
