// Isolated in-memory PostgreSQL only. No keys, database URLs or provider calls.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
test('supplier publication and AI permission regressions roll back in PostgreSQL',async()=>{
 const {PGlite}=require('@electric-sql/pglite');
 const db=new PGlite();
 try {
  await db.exec(`
   create role anon; create role authenticated; create role service_role bypassrls;
   create schema auth; create table auth.users(id uuid primary key,email text,is_anonymous boolean default false);
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   create schema storage;
   create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
   create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner uuid);
   alter table storage.objects enable row level security;
   create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;
   grant usage on schema public,auth,storage to anon,authenticated,service_role;
   grant execute on function auth.uid() to anon,authenticated,service_role;
   grant all on all tables in schema public,storage to service_role;
   alter default privileges in schema public grant all on tables to service_role;
   alter default privileges in schema public grant all on sequences to service_role;
  `);
  const root=path.resolve(__dirname,'..');
  for(const file of fs.readdirSync(root+'/supabase/migrations').filter(f=>/^\d+_.+\.sql$/.test(f)).sort()) {
   // Prove each fixture catches the original bug before applying its fix.
   const regression=file.endsWith('_booking_supplier_publication_guard.sql')?
    ['supplier_publication_booking.sql',/TEST: issued a quote for an unpublished supplier/]:
    file.endsWith('_supplier_ai_permission_withdrawal.sql')?
    ['supplier_ai_permission.sql',/TEST: saved withdrawal left the asset authorised for AI/]:null;
   if(regression){
    await assert.rejects(db.exec(fs.readFileSync(root+'/supabase/tests/'+regression[0],'utf8')),regression[1]);
    await db.exec('rollback');
   }
   if(file.endsWith('_supplier_ai_permission_withdrawal.sql')){
    await assert.rejects(db.exec(fs.readFileSync(root+'/supabase/tests/supplier_public_permission.sql','utf8')),
     /TEST: saved public permission withdrawal retained publication/);
    await db.exec('rollback');
   }
   try {await db.exec(fs.readFileSync(root+'/supabase/migrations/'+file,'utf8'));}
   catch(e){throw Error(file+': '+e.message);}
  }
  const counts=`select (select count(*) from auth.users) users,(select count(*) from public.orders) orders,
   (select count(*) from public.suppliers) suppliers,(select count(*) from public.products) products,
   (select count(*) from public.booking_quotes) quotes,(select count(*) from public.booking_workflows) workflows,
   (select count(*) from public.booking_notifications) notices,(select count(*) from public.supplier_reviews) reviews,
   (select count(*) from public.supplier_review_assets) assets,(select count(*) from public.supplier_review_history) history`;
  const before=(await db.query(counts)).rows;
  for(const file of ['supplier_publication_booking.sql','supplier_ai_permission.sql','supplier_public_permission.sql']) {
   await db.exec(fs.readFileSync(root+'/supabase/tests/'+file,'utf8'));
   assert.deepEqual((await db.query(counts)).rows,before,file+' must roll back every fixture');
  }
 } finally {await db.close();}
});
