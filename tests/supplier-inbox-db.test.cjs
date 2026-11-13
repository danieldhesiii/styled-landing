// Isolated SQL runner: uses the pinned local PGlite dependency.
// STYLED_PGLITE_MODULE is a fallback for an external isolated runtime.
// No database URLs, credentials, provider modules or network services are used.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
let runtime;
try { runtime=require.resolve('@electric-sql/pglite'); } catch { runtime=process.env.STYLED_PGLITE_MODULE; }
test('private supplier conversations enforce membership, idempotency and unread state', {skip:runtime?false:'Set STYLED_PGLITE_MODULE to run isolated SQL fixtures'}, async()=>{
 const {PGlite}=require(runtime);
 const db=new PGlite();
 try{
await db.exec(`
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create table auth.users(id uuid primary key,email text,is_anonymous boolean default false,email_confirmed_at timestamptz);
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

 await db.exec(`
 insert into auth.users(id,email,email_confirmed_at) values
 ('10000000-0000-4000-8000-000000000001','customer@example.invalid',now()),
 ('10000000-0000-4000-8000-000000000002','supplier@example.invalid',now()),
 ('10000000-0000-4000-8000-000000000003','outsider@example.invalid',now());
 insert into public.suppliers(id,name,area,active) values
 ('20000000-0000-4000-8000-000000000001','Inbox test','Test',true);
 insert into public.supplier_users(user_id,supplier_id) values
 ('10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001');
 `);
 await db.exec("update public.suppliers set message_reply_hours=48 where id='20000000-0000-4000-8000-000000000001'; set role service_role");
 const send = (actor,client,body) => db.query(
 'select public.send_supplier_message($1,$2,$3,$4,$5,$6) id',
 ['10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',actor,'Customer',body,client]);
 const customer='10000000-0000-4000-8000-000000000001', supplier='10000000-0000-4000-8000-000000000002', outsider='10000000-0000-4000-8000-000000000003';
 const client='30000000-0000-4000-8000-000000000001';
 await send(customer,client,'Hello');
 await send(customer,client,'Hello');
 assert.equal((await db.query('select count(*)::int n from public.supplier_messages')).rows[0].n,1);
 await assert.rejects(send(customer,client,'Changed'),/retry changed/);
 await assert.rejects(send(outsider,'30000000-0000-4000-8000-000000000002','No access'),/access denied/);
 assert.equal((await db.query('select supplier_unread from public.supplier_conversations')).rows[0].supplier_unread,true);
 const thread=(await db.query('select * from public.supplier_conversations')).rows[0];
 assert.equal(thread.reply_target_hours,48);
 assert.equal(thread.last_sender_role,'customer');
 const firstMessage=(await db.query('select * from public.supplier_messages')).rows[0];
 assert.equal(firstMessage.read_at,null);
 await assert.rejects(db.query('select public.read_supplier_messages($1,$2,true,$3)',[thread.id,outsider,firstMessage.id]),/access denied/);
 await send(customer,'30000000-0000-4000-8000-000000000004','Following up');
 assert.equal(String((await db.query('select awaiting_since from public.supplier_conversations')).rows[0].awaiting_since),String(thread.awaiting_since));
 await db.query('select public.read_supplier_messages($1,$2,true,$3)',[thread.id,supplier,firstMessage.id]);
 assert.ok((await db.query('select read_at from public.supplier_messages where id=$1',[firstMessage.id])).rows[0].read_at);
 assert.equal((await db.query('select supplier_unread from public.supplier_conversations')).rows[0].supplier_unread,true,'newer unread message survives an old read snapshot');
 const latest=(await db.query('select last_message_id from public.supplier_conversations')).rows[0].last_message_id;
 await db.query('select public.read_supplier_messages($1,$2,true,$3)',[thread.id,supplier,latest]);
 assert.equal((await db.query('select supplier_unread from public.supplier_conversations')).rows[0].supplier_unread,false);
 const firstRead=(await db.query('select read_at from public.supplier_messages where id=$1',[firstMessage.id])).rows[0].read_at;
 await db.query('select public.read_supplier_messages($1,$2,true,$3)',[thread.id,supplier,latest]);
 assert.equal(String((await db.query('select read_at from public.supplier_messages where id=$1',[firstMessage.id])).rows[0].read_at),String(firstRead));
 await db.query('update public.suppliers set message_reply_hours=24 where id=$1',[thread.supplier_id]);
 assert.equal((await db.query('select reply_target_hours from public.supplier_conversations')).rows[0].reply_target_hours,48,'existing target does not move when supplier changes future defaults');

 await send(supplier,'30000000-0000-4000-8000-000000000003','We can help');
 assert.equal((await db.query('select customer_unread from public.supplier_conversations')).rows[0].customer_unread,true);
 for (const [actor,count] of [[customer,3],[supplier,3],[outsider,0]]) {
  await db.exec(`set role authenticated; set request.jwt.claim.sub='${actor}';`);
  assert.equal((await db.query('select count(*)::int n from public.supplier_messages')).rows[0].n,count);
  await assert.rejects(send(customer,'30000000-0000-4000-8000-000000000099','browser RPC'),/permission denied/);
  await assert.rejects(db.query('select public.read_supplier_messages($1,$2,true,$3)',[thread.id,supplier,latest]),/permission denied/);
  await assert.rejects(db.query('update public.supplier_messages set read_at=now()'),/permission denied/);
  await assert.rejects(db.query("insert into public.supplier_messages(conversation_id,sender_id,sender_role,body,client_id) values (gen_random_uuid(),gen_random_uuid(),'supplier','spoof',gen_random_uuid())"),/permission denied/);
  await db.exec('reset role');
 }
 await db.exec('set role anon');
 await assert.rejects(db.query('select * from public.supplier_messages'),/permission denied/);
 await db.exec('reset role');
 // Repeat supplier approvals through either channel against a mixed basket.
 await db.exec("set role service_role");
 const other = '20000000-0000-4000-8000-000000000099';
 await db.query("insert into public.suppliers(id,name,area,active) values ($1,'Other supplier','Test',true)",[other]);
 await db.query("insert into public.supplier_whatsapp_recipients(supplier_id,phone) values ($1,'+447700900123')",[thread.supplier_id]);
 const order=(await db.query("insert into public.orders(owner_id,couple_name,email,phone,subtotal_pence,commission_pence,deposit_pence) values ($1,'Test customer','test@example.invalid','01234',0,0,0) returning id",[customer])).rows[0].id;
 for(const [vendor,product] of [[thread.supplier_id,'Arch'],[thread.supplier_id,'Flowers'],[other,'Private chairs']]){
   await db.query("insert into public.order_lines(order_id,supplier_id,product_name,supplier_name,unit_price_pence,quantity,line_total_pence) values ($1,$2,$3,'Test',100,2,200)",[order,vendor,product]);
 }
 const notice=(await db.query('select * from public.supplier_order_inbox where supplier_id=$1',[thread.supplier_id])).rows[0];
 assert.match(notice.summary,/2 × Arch/); assert.match(notice.summary,/01234/);assert.doesNotMatch(notice.summary,/Private chairs/);
 assert.equal((await db.query('select count(*)::int as n from public.supplier_order_notices where order_id=$1',[order])).rows[0].n,2);
 const approve=(version,channel,actor)=>db.query('select public.approve_supplier_order_notice($1,$2,$3,$4,$5) decision',[notice.id,thread.supplier_id,version,actor,channel]);
 await assert.rejects(approve(notice.version,'portal',outsider),/Access denied/);
 await assert.rejects(approve(notice.version,'whatsapp',null),/expired/);
 await db.query("update public.supplier_order_notices set delivery='sent',sent_version=$1 where id=$2",[notice.version,notice.id]);
 await db.query("update public.order_lines set needed_date='2028-01-12',return_date='2028-01-13' where order_id=$1 and supplier_id=$2",[order,thread.supplier_id]);
 assert.equal((await approve(notice.version,'whatsapp',null)).rows[0].decision,'changed');
 const latestVersion=(await db.query('select version from public.supplier_order_inbox where id=$1',[notice.id])).rows[0].version;
 await db.query('update public.supplier_order_notices set sent_version=$1 where id=$2',[latestVersion,notice.id]);
 assert.equal((await approve(latestVersion,'whatsapp',null)).rows[0].decision,'availability_confirmed');
 assert.equal((await approve(latestVersion,'portal',supplier)).rows[0].decision,'availability_confirmed');
 assert.equal((await db.query("select count(*)::int n from public.order_events where order_id=$1 and type='line_confirmed'",[order])).rows[0].n,1);
 assert.equal((await db.query('select supplier_status from public.order_lines where order_id=$1 and supplier_id=$2',[order,other])).rows[0].supplier_status,'pending');
 await db.exec('set role authenticated');
 await assert.rejects(db.query('select * from public.supplier_order_inbox'),/permission denied/);
 } finally {await db.close();}
});
