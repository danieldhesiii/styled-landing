const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module'), ts = require('typescript');
function load(relative, mocks = {}) {
  const file = path.resolve(relative), m = new Module(file, module); m.paths = module.paths;
  m.require = id => Object.hasOwn(mocks,id) ? mocks[id] : id.startsWith('@/') ? load(id.slice(2)+'.ts',mocks) : id.startsWith('.') ? load(path.join(path.dirname(file), id)+'.ts',mocks) : require(id);
  m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText,file);
  return m.exports;
}
const photo = load('lib/pinterest-import.ts');
const {prepareBoard} = load('lib/board-inspiration.ts');
test('imported selection takes priority in the visualiser and a saved source link is not mistaken for an imported photo', () => {
  const old=[{id:'note',kind:'note',text:'Pinterest: https://www.pinterest.com/pin/123/'},...['old1','old2','old3'].map(ref=>({id:ref,kind:'photo',ref,text:'Old photo'}))];
  const imported={id:'new-photo',pin:{source:'https://www.pinterest.com/pin/123/',title:'Chosen inspiration'}};
  const next=photo.addPinterestPhotos(old,[imported,imported]);
  assert.equal(next.length,old.length+1); assert.equal(old[0].id,'note');
  assert.deepEqual(prepareBoard({id:'board',name:'Wedding',pins:next}).photoIds,['new-photo','old1','old2']);
  assert.equal(photo.addPinterestPhotos(next,[imported]).length,next.length);
  assert.throws(()=>photo.addPinterestPhotos(Array.from({length:100},(_,i)=>({id:String(i),kind:'note',text:'Idea'})),[imported]),/full/);
});
const jar = new Map();
let user = { id: 'account-one', is_anonymous: false, email_confirmed_at: '2026-11-02' };
let rates = 0, allowRate = true;
const mocks = {
  'next/headers': { cookies: async () => ({ get: key => jar.has(key) ? { value: jar.get(key) } : undefined }) },
  '@/lib/supabase/admin': { createAdminClient: () => ({ rpc: async () => { rates++; return {data: allowRate, error: null}; } }) },
  './session': { requireUser: async () => user ? { ok: true, user } : { ok: false } },
};
// Resolve the route's transitive session import using its absolute alias too.
mocks['@/lib/server/session'] = mocks['./session'];
const helpers = load('lib/server/pinterest-import.ts', mocks);
const route = load('app/api/pinterest/route.ts', mocks);
const callback = load('app/api/pinterest/callback/route.ts', mocks);
const secret = 'fictional-pinterest-app-secret-for-tests';
const origin = 'https://styled-development.invalid';
function config() {
  process.env.PINTEREST_APP_ID='123456'; process.env.PINTEREST_APP_SECRET=secret;
  process.env.NEXT_PUBLIC_SITE_URL=origin; process.env.PINTEREST_API_ENABLED='true';
  process.env.PINTEREST_API_APPROVAL_REFERENCE='fictional-test-only-trial-approval';
  process.env.PINTEREST_IMAGE_REUSE_ENABLED='true';
  process.env.PINTEREST_IMAGE_REUSE_APPROVAL_REFERENCE='fictional-test-only-reuse-approval';
  user = { id: 'account-one', is_anonymous: false, email_confirmed_at: '2026-11-02' };
  allowRate = true; rates = 0; jar.clear();
}
function request(body, headers = {}) {
  return new Request(origin+'/api/pinterest', { method: 'POST', headers: { origin, 'Content-Type':'application/json', ...headers }, body: JSON.stringify(body) });
}
const pin = { id: '123', board_id: '456', title: 'Garden colours', media: { media_type:'image', images: {
  small: { url:'https://i.pinimg.com/236x/example.jpg', width:236 },
  large: { url:'https://i.pinimg.com/736x/example.jpg', width:736 },
} } };
test('Pinterest read access stays disabled without app approval and valid configuration', () => {
  config(); assert.equal(helpers.pinterestConfig().callback, origin+'/api/pinterest/callback');
  delete process.env.PINTEREST_API_APPROVAL_REFERENCE; assert.equal(helpers.pinterestConfig(),null);
  config(); process.env.PINTEREST_API_ENABLED='false'; assert.equal(helpers.pinterestConfig(),null);
  config(); process.env.NEXT_PUBLIC_SITE_URL='http://unsafe.invalid'; assert.equal(helpers.pinterestConfig(),null);
  config(); process.env.PINTEREST_APP_SECRET='short'; assert.equal(helpers.pinterestConfig(),null);
});
test('encrypted OAuth material rejects tampering, another account, purpose, key and expiry', () => {
  const sealed = helpers.sealPinterest({ userId:'one', token:'private-test-token', expires:2000 },secret,'session');
  assert.doesNotMatch(sealed,/private-test-token/);
  assert.equal(helpers.openPinterest(sealed,secret,'session','one',1000).token,'private-test-token');
  for (const args of [[sealed,secret,'state','one',1000],[sealed,secret,'session','two',1000],[sealed,'wrong','session','one',1000],[sealed,secret,'session','one',2000],[sealed.slice(0,-5)+'other',secret,'session','one',1000]]) assert.equal(helpers.openPinterest(...args),null);
  assert.equal(helpers.stateMatches('a'.repeat(64),'a'.repeat(64)),true);
  for (const s of ['a'.repeat(63), 'b'.repeat(64), 'é'.repeat(64), null]) assert.equal(helpers.stateMatches('a'.repeat(64),s),false);
});
test('only image Pins and exact Pinterest image hosts are accepted', () => {
  assert.equal(photo.pinterestPhoto(pin).image, 'https://i.pinimg.com/736x/example.jpg');
  assert.equal(photo.pinterestPhoto({...pin,media:{...pin.media, media_type:'video'}}),null);
  for (const url of ['http://i.pinimg.com/x.jpg','https://i.pinimg.com.evil.invalid/x.jpg','https://user@i.pinimg.com/x.jpg','https://i.pinimg.com:444/x.jpg','https://127.0.0.1/x.jpg','https://i.pinimg.com/x.svg']) assert.equal(photo.pinterestImage(url),null);
  for (const id of ['../pins','1?x=y',123,'1/2']) assert.equal(photo.pinterestId(id),false);
});
test('downloads reread an authorized Pin, verify board membership and never send the token to the CDN', async () => {
  const calls=[];
  const fetcher=async (url,options) => { calls.push({url,options}); return calls.length===1 ? Response.json(pin) : new Response('image-data',{headers:{'Content-Type':'image/jpeg'}}); };
  const r=await helpers.selectedPinterestImage('123','456','fake-access-token',fetcher);
  assert.equal(r.photo.source,'https://www.pinterest.com/pin/123/');
  assert.equal(calls[0].url,'https://api.pinterest.com/v5/pins/123');
  assert.equal(calls[0].options.headers.Authorization,'Bearer fake-access-token');
  assert.equal(calls[1].options.headers,undefined);
  assert.equal(calls[1].options.redirect,'error');
  let count=0;
  await assert.rejects(()=>helpers.selectedPinterestImage('123','999','token',async()=>{ count++; return Response.json(pin); }),/no longer/);
  assert.equal(count,1);
  await assert.rejects(()=>helpers.selectedPinterestImage('../admin','456','token',fetcher));
});
test('oversized, unreadable and non-image responses cannot be imported', async () => {
  await assert.rejects(()=>helpers.boundedPinterestBody(new Response('big',{headers:{'Content-Length':'1000'}}),10),/too large/);
  await assert.rejects(()=>helpers.boundedPinterestBody(new Response('more than ten bytes'),10),/too large/);
  let count=0;
  await assert.rejects(()=>helpers.selectedPinterestImage('123','456','token',async()=> ++count===1 ? Response.json(pin) : new Response('<html>',{headers:{'Content-Type':'text/html'}})),/could not download/);
});
test('disabled feature makes no account or provider calls and signed-out access is refused when enabled', async () => {
  config(); process.env.PINTEREST_API_ENABLED='false';
  assert.deepEqual(await (await route.GET(new Request(origin+'/api/pinterest'))).json(),{enabled:false,connected:false});
  assert.equal(rates,0);
  config(); user=null;
  assert.equal((await route.GET(new Request(origin+'/api/pinterest?action=boards'))).status,401);
  assert.equal((await route.POST(request({action:'connect'}))).status,401);
  config(); user.is_anonymous=true;
  assert.equal((await route.POST(request({action:'connect'}))).status,401);
});
test('OAuth connection requires same-origin JSON and only requests read scopes', async () => {
  config();
  assert.equal((await route.POST(request({action:'connect'},{origin:'https://evil.invalid'}))).status,422);
  assert.equal(rates,0);
  const r=await route.POST(request({action:'connect'})), d=await r.json(), url=new URL(d.url);
  assert.equal(url.origin,'https://www.pinterest.com'); assert.equal(url.searchParams.get('scope'),'boards:read,pins:read');
  assert.equal(url.searchParams.get('redirect_uri'),origin+'/api/pinterest/callback');
  assert.match(r.headers.get('set-cookie'),/HttpOnly/); assert.match(r.headers.get('set-cookie'),/Secure/);
  assert.match(r.headers.get('set-cookie'),/SameSite=lax/); assert.doesNotMatch(JSON.stringify(d),new RegExp(secret));
  const readOnlyResult=await (await route.POST(request({action:'connect',includePrivate:true}))).json();
  assert.equal(new URL(readOnlyResult.url).searchParams.get('scope'),'boards:read,pins:read');
  allowRate=false; assert.equal((await route.POST(request({action:'connect'}))).status,422);
});
test('callback rejects cancelled or mismatched OAuth without contacting Pinterest', async () => {
  config();
  jar.set(helpers.PINTEREST_STATE,helpers.sealPinterest({userId:user.id,nonce:'a'.repeat(64),expires:Date.now()+10000},secret,'state'));
  const old=global.fetch; let called=false; global.fetch=async()=>{ called=true; throw Error(); };
  try {
    const r=await callback.GET(new Request(origin+'/api/pinterest/callback?code=fake&state='+ 'b'.repeat(64)));
    assert.match(r.headers.get('location'),/pinterest=failed/); assert.equal(called,false);
    assert.match(r.headers.get('set-cookie'),/Max-Age=0/);
    assert.equal(r.headers.get('referrer-policy'),'no-referrer');
  } finally { global.fetch=old; }
});
test('successful callback encrypts the token, returns to Boards and never returns provider secrets', async () => {
  config(); const nonce='a'.repeat(64);
  jar.set(helpers.PINTEREST_STATE,helpers.sealPinterest({userId:user.id,nonce,expires:Date.now()+10000},secret,'state'));
  const old=global.fetch; let calls=0;
  global.fetch=async(url,options)=>{
    calls++; assert.equal(url,'https://api.pinterest.com/v5/oauth/token');
    assert.equal(options.body.get('redirect_uri'),origin+'/api/pinterest/callback');
    return Response.json({access_token:'fictional-private-token',scope:'boards:read,pins:read',expires_in:86400});
  };
  try {
    const r=await callback.GET(new Request(origin+'/api/pinterest/callback?code=fake&state='+nonce));
    assert.equal(calls,1); assert.match(r.headers.get('location'),/tab=boards&pinterest=connected/);
    const saved=r.cookies.get(helpers.PINTEREST_SESSION).value;
    assert.equal(helpers.openPinterest(saved,secret,'session',user.id).token,'fictional-private-token');
    assert.doesNotMatch(r.headers.get('set-cookie'),/fictional-private-token/);
    assert.match(r.headers.get('set-cookie'),/Max-Age=3600/);
  } finally { global.fetch=old; }
});
test('board pagination uses only the authorized API and sanitized fields; image action needs permission', async () => {
  config(); jar.set(helpers.PINTEREST_SESSION,helpers.sealPinterest({userId:user.id,token:'fictional',expires:Date.now()+10000},secret,'session'));
  const old=global.fetch;
  global.fetch=async(url)=>{ assert.match(url,/boards\?page_size=25&bookmark=/); return Response.json({items:[{id:'456',name:'Wedding',description:'private-unused-data'},{id:'invalid'}],bookmark:'next'}); };
  try {
    const r=await route.GET(new Request(origin+'/api/pinterest?action=boards&bookmark=abc%26evil%3D1'));
    assert.deepEqual(await r.json(),{items:[{id:'456',name:'Wedding'}],bookmark:'next'});
    assert.equal((await route.POST(request({action:'image',pinId:'123',boardId:'456',permission:false}))).status,400);
    user.id='another-account';
    assert.equal((await route.GET(new Request(origin+'/api/pinterest?action=boards'))).status,401);
  } finally { global.fetch=old; }
});
test('inspiration imports cannot replace the current venue used for additional room angles', async () => {
  const paths=[]; let uploadNumber=0;
  const uploads=load('lib/upload-venue-photo.ts',{
    '@/lib/supabase/client': {createClient:()=>({auth:{getUser:async()=>({data:{user:{id:'owner'}}})},storage:{from:()=>({upload:async()=>({error:null})})}})},
  });
  const old=global.fetch;
  global.fetch=async(_url,options)=>{ paths.push(JSON.parse(options.body)); uploadNumber++;
    return Response.json({photo:{id:'photo-'+uploadNumber,venueId:uploadNumber===1?'room-venue':uploadNumber===2?'inspiration-venue':'room-venue',url:'https://private.invalid/image',width:100,height:100}});
  };
  try {
    const file=new File(['fictional image'],'image.jpg',{type:'image/jpeg'});
    await uploads.uploadVenuePhoto(file);
    await uploads.uploadVenuePhoto(file,{isolated:true});
    await uploads.uploadVenuePhoto(file,{append:true});
    assert.equal(paths[0].venueId,undefined); assert.equal(paths[1].venueId,undefined);
    assert.equal(paths[2].venueId,'room-venue');
  } finally { global.fetch=old; }
});
