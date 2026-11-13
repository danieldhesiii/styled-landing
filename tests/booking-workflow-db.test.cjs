// Isolated PostgreSQL tests run with the pinned development dependency.
// STYLED_PGLITE_MODULE optionally selects another local test installation.
// No database URLs, credentials, provider modules or network services are used.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const runtime=process.env.STYLED_PGLITE_MODULE||require.resolve('@electric-sql/pglite');
test('booking workflow migration and rollback-only SQL fixtures on local PostgreSQL', {skip:runtime?false:'Set STYLED_PGLITE_MODULE to run isolated SQL fixtures'}, async()=>{
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
for(const file of fs.readdirSync(root+'/supabase/migrations').filter(f=>/^\d+_.+\.sql$/.test(f)).sort()) {try{await db.exec(fs.readFileSync(root+'/supabase/migrations/'+file,'utf8'));}catch(e){throw Error(file+': '+e.message);}}
await db.exec(fs.readFileSync(root+'/supabase/tests/last_chandelier_and_receipts.sql','utf8'));
await db.exec(fs.readFileSync(root+'/supabase/tests/resend_delivery.sql','utf8'));
await db.exec(fs.readFileSync(root+'/supabase/tests/supplier_product_day_limits.sql','utf8'));

 const before=await db.query('select (select count(*) from auth.users) users,(select count(*) from public.orders) orders,(select count(*) from public.booking_notifications) jobs');
 await db.exec(fs.readFileSync(root+'/supabase/tests/booking_workflow.sql','utf8'));
 assert.deepEqual((await db.query('select (select count(*) from auth.users) users,(select count(*) from public.orders) orders,(select count(*) from public.booking_notifications) jobs')).rows,before.rows,'SQL fixture must roll back all users, orders and notifications');
 await db.exec("insert into auth.users(id,email,is_anonymous) values('11111111-1111-4111-8111-111111111111','staff@example.invalid',false); insert into public.staff(user_id) values('11111111-1111-4111-8111-111111111111')");
 await db.exec(fs.readFileSync(root+'/supabase/tests/booking_operations.sql','utf8'));
 assert.equal((await db.query('select count(*)::int n from public.orders')).rows[0].n,0);
 }finally{await db.close();}
});
