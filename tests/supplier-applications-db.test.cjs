// Isolated SQL runner: uses the pinned local PGlite dependency.
// STYLED_PGLITE_MODULE is a fallback for an external isolated runtime.
// No database URLs, credentials, provider modules or network services are used.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
let runtime;
try { runtime=require.resolve('@electric-sql/pglite'); } catch { runtime=process.env.STYLED_PGLITE_MODULE; }
test('supplier application approval is private, idempotent and never publishes a supplier', {skip:runtime?false:'Set STYLED_PGLITE_MODULE to run isolated SQL fixtures'}, async()=>{
 const {PGlite}=require(runtime);
 const db=new PGlite();
 try{
await db.exec(`
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create table auth.users(id uuid primary key,email text,is_anonymous boolean default false);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create schema storage;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner uuid);
alter table storage.objects enable row level security;
create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1,'/') $$;
grant usage on schema public,auth,storage to anon,authenticated,service_role;
grant execute on function auth.uid() to anon,authenticated,service_role;
grant all on all tables in schema public,storage to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
`);
const root=path.resolve(__dirname,'..');
for(const file of fs.readdirSync(root+'/supabase/migrations').filter(f=>f.endsWith('.sql')).sort()) {
 try { await db.exec(fs.readFileSync(root+'/supabase/migrations/'+file,'utf8')); }
 catch(e) { throw Error(file+': '+e.message); }
}
 await db.exec(fs.readFileSync(root+'/supabase/tests/supplier_applications.sql','utf8'));
 } finally { await db.close(); }
});
