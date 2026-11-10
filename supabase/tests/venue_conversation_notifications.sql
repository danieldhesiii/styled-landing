-- Isolated/local test only. No provider/network calls. Synthetic data rolls back.
begin;
select set_config('outbox.owner',gen_random_uuid()::text,true);
select set_config('outbox.team',gen_random_uuid()::text,true);
select set_config('outbox.venue',gen_random_uuid()::text,true);
select set_config('outbox.request',gen_random_uuid()::text,true);
insert into auth.users(id) values (current_setting('outbox.owner')::uuid),(current_setting('outbox.team')::uuid);
insert into public.venue_listings(id,slug,name,location,county,active)
 values(current_setting('outbox.venue')::uuid,'outbox-'||current_setting('outbox.venue'),'TEST ONLY','Test','Test',true);
insert into public.venue_users(venue_id,user_id) values(current_setting('outbox.venue')::uuid,current_setting('outbox.team')::uuid);
insert into public.venue_enquiries(id,venue_id,owner_user_id,name,email,preferred_date,request_kind,status)
 values(current_setting('outbox.request')::uuid,current_setting('outbox.venue')::uuid,current_setting('outbox.owner')::uuid,'TEST','test@example.invalid',current_date+30,'viewing','new');
set local role service_role;
select public.send_venue_request_message(current_setting('outbox.request')::uuid,current_setting('outbox.owner')::uuid,'PRIVATE customer fixture');
select public.send_venue_request_message(current_setting('outbox.request')::uuid,current_setting('outbox.team')::uuid,'PRIVATE venue fixture');
reset role;
do $$ declare before_messages integer; before_jobs integer; rejected boolean:=false; begin
 if (select count(*) from public.venue_conversation_notifications where request_id=current_setting('outbox.request')::uuid)<>2 then raise exception 'Missing transactional jobs'; end if;
 if exists(select 1 from public.venue_conversation_notifications n join public.venue_request_messages m on m.id=n.message_id
   where n.request_id=current_setting('outbox.request')::uuid and n.audience<>case m.sender_kind when 'customer' then 'venue' else 'customer' end)
 then raise exception 'Wrong routing'; end if;
 if exists(select 1 from public.venue_conversation_notifications where request_id=current_setting('outbox.request')::uuid and (status<>'queued' or attempts<>0)) then raise exception 'Unexpected initial state'; end if;
 if not (select relrowsecurity from pg_class where oid='public.venue_conversation_notifications'::regclass) then raise exception 'RLS disabled'; end if;
 if exists(select 1 from pg_policies where schemaname='public' and tablename='venue_conversation_notifications') then raise exception 'Queue must have no client policies'; end if;
 select count(*) into before_messages from public.venue_request_messages;
 select count(*) into before_jobs from public.venue_conversation_notifications;
 begin
   perform public.send_venue_request_message(current_setting('outbox.request')::uuid,current_setting('outbox.owner')::uuid,'Rolled back');
   if (select count(*) from public.venue_conversation_notifications)<>before_jobs+1 then raise exception 'Enqueue not in message transaction'; end if;
   raise exception using errcode='ZX001',message='Simulated later workflow failure';
 exception when sqlstate 'ZX001' then null; end;
 if (select count(*) from public.venue_request_messages)<>before_messages or (select count(*) from public.venue_conversation_notifications)<>before_jobs then raise exception 'Message/outbox rollback failed'; end if;
 begin
   insert into public.venue_conversation_notifications(message_id,request_id,audience)
    select message_id,request_id,audience from public.venue_conversation_notifications where request_id=current_setting('outbox.request')::uuid limit 1;
 exception when unique_violation then rejected:=true; end;
 if not rejected then raise exception 'Duplicate job permitted'; end if;
end $$;
-- Force the outbox insert to fail, proving the enclosing message cannot persist.
create function public.outbox_fixture_fail() returns trigger language plpgsql as $$begin raise exception using errcode='ZX002',message='Synthetic outbox failure'; end$$;
create trigger outbox_fixture_fail before insert on public.venue_conversation_notifications for each row execute function public.outbox_fixture_fail();
do $$ declare before_messages integer; rejected boolean:=false; begin
 select count(*) into before_messages from public.venue_request_messages;
 begin perform public.send_venue_request_message(current_setting('outbox.request')::uuid,current_setting('outbox.owner')::uuid,'Must not persist');
 exception when sqlstate 'ZX002' then rejected:=true; end;
 if not rejected or (select count(*) from public.venue_request_messages)<>before_messages then raise exception 'Queue failure did not roll back message'; end if;
end $$;
drop trigger outbox_fixture_fail on public.venue_conversation_notifications;
drop function public.outbox_fixture_fail();
-- Legacy history copied by a workflow is preserved without emailing old replies.
insert into public.venue_request_messages(request_id,sender_kind,body,created_at)
 values(current_setting('outbox.request')::uuid,'venue','Historical private reply',now()-interval '1 day');
do $$ begin
 if (select count(*) from public.venue_conversation_notifications where request_id=current_setting('outbox.request')::uuid)<>2 then raise exception 'Historical reply was queued'; end if;
end $$;
-- Exercise the real response RPC: it copies an unrecorded old reply and adds
-- a fresh reply. Only the fresh message receives a notice.
update public.venue_enquiries set response='Unrecorded historical reply',responded_at=now()-interval '2 days'
 where id=current_setting('outbox.request')::uuid;
set local role service_role;
select public.respond_venue_enquiry(current_setting('outbox.venue')::uuid,current_setting('outbox.request')::uuid,'contacted','Current reply','{}'::date[],null::time);
reset role;
do $$ begin
 if not exists(select 1 from public.venue_request_messages where request_id=current_setting('outbox.request')::uuid and body='Unrecorded historical reply') then raise exception 'RPC did not preserve old reply'; end if;
 if exists(select 1 from public.venue_conversation_notifications n join public.venue_request_messages m on m.id=n.message_id where n.request_id=current_setting('outbox.request')::uuid and m.body='Unrecorded historical reply') then raise exception 'RPC historical copy was queued'; end if;
 if (select count(*) from public.venue_conversation_notifications where request_id=current_setting('outbox.request')::uuid)<>3 then raise exception 'RPC must queue only its current reply'; end if;
end $$;
-- Neither ordinary users nor staff browser sessions can access this service-only table.
set local role anon;
do $$ declare denied boolean:=false; begin
 begin perform 1 from public.venue_conversation_notifications; exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Anon queue access'; end if;
end $$;
reset role;
insert into public.staff(user_id) values(current_setting('outbox.team')::uuid);
select set_config('request.jwt.claim.sub',current_setting('outbox.team'),true);
set local role authenticated;
do $$ declare denied boolean:=false; begin
 begin perform 1 from public.venue_conversation_notifications; exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Staff browser queue access bypasses API'; end if;
 denied:=false;
 begin insert into public.venue_conversation_notifications(message_id,request_id,audience) values(gen_random_uuid(),gen_random_uuid(),'venue'); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Authenticated queue mutation'; end if;
end $$;
reset role;
-- Venue deliveries use their own FK and retain provider/run/recipient correlation.
select set_config('outbox.run',gen_random_uuid()::text,true);
select set_config('outbox.provider_id',gen_random_uuid()::text,true);
insert into public.booking_email_deliveries(run_id,venue_job_id,provider,recipient_hash)
 select current_setting('outbox.run')::uuid,id,'resend',repeat('a',64) from public.venue_conversation_notifications
 where request_id=current_setting('outbox.request')::uuid and audience='customer' limit 1;
do $$ declare rejected boolean:=false; begin
 begin insert into public.booking_email_deliveries(run_id,provider,recipient_hash) values(gen_random_uuid(),'resend',repeat('b',64)); exception when check_violation then rejected:=true; end;
 if not rejected then raise exception 'Unlinked ledger row allowed'; end if;
 rejected:=false;
 begin insert into public.booking_email_deliveries(run_id,venue_job_id,check_user_id,provider,recipient_hash)
  select gen_random_uuid(),id,current_setting('outbox.owner')::uuid,'resend',repeat('b',64) from public.venue_conversation_notifications where request_id=current_setting('outbox.request')::uuid limit 1;
 exception when check_violation then rejected:=true; end;
 if not rejected then raise exception 'Multiple ledger links allowed'; end if;
 if not public.apply_booking_email_event('resend',current_setting('outbox.run')::uuid,current_setting('outbox.provider_id'),repeat('a',64),'delivered',now(),'outbox-fixture') then raise exception 'Early Resend callback did not correlate'; end if;
 if not exists(select 1 from public.booking_email_deliveries where run_id=current_setting('outbox.run')::uuid and status='delivered' and message_id=current_setting('outbox.provider_id') and job_id is null and venue_job_id is not null) then raise exception 'Venue ledger delivery binding failed'; end if;
end $$;
rollback;
