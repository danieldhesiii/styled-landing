-- MAIN AGENT: reviewed DEV qkyeitvwscrxbiwamxan only, AFTER migration.
-- Run with ON_ERROR_STOP. Synthetic fixtures only; the entire script rolls back.
-- auth.users fixtures have random IDs only: no email, password, identities or usable credentials.
-- No staff accounts or staff membership grants are created. Nonparticipant staff denial is unit tested.
-- This file has NOT been executed by the venue agent.
begin;
select set_config('venue_test.customer',gen_random_uuid()::text,true);
select set_config('venue_test.team',gen_random_uuid()::text,true);
select set_config('venue_test.other',gen_random_uuid()::text,true);
select set_config('venue_test.venue',gen_random_uuid()::text,true);
select set_config('venue_test.other_venue',gen_random_uuid()::text,true);
select set_config('venue_test.viewing',gen_random_uuid()::text,true);
select set_config('venue_test.booking',gen_random_uuid()::text,true);
select set_config('venue_test.alternative',gen_random_uuid()::text,true);
insert into auth.users(id) values
 (current_setting('venue_test.customer')::uuid),(current_setting('venue_test.team')::uuid),
 (current_setting('venue_test.other')::uuid);
insert into public.venue_listings(id,slug,name,location,county,active) values
 (current_setting('venue_test.venue')::uuid,'test-'||current_setting('venue_test.venue'),'TEST ONLY','Test','Test',true),
 (current_setting('venue_test.other_venue')::uuid,'test-'||current_setting('venue_test.other_venue'),'TEST ONLY other','Test','Test',true);
insert into public.venue_users(venue_id,user_id) values
 (current_setting('venue_test.venue')::uuid,current_setting('venue_test.team')::uuid),
 (current_setting('venue_test.other_venue')::uuid,current_setting('venue_test.other')::uuid);
insert into public.venue_enquiries(id,venue_id,owner_user_id,name,email,preferred_date,request_kind,status,alternative_dates) values
 (current_setting('venue_test.viewing')::uuid,current_setting('venue_test.venue')::uuid,current_setting('venue_test.customer')::uuid,'TEST','test@example.invalid',current_date+30,'viewing','new','{}'),
 (current_setting('venue_test.booking')::uuid,current_setting('venue_test.venue')::uuid,current_setting('venue_test.customer')::uuid,'TEST','test@example.invalid',current_date+30,'booking','new','{}'),
 (current_setting('venue_test.alternative')::uuid,current_setting('venue_test.venue')::uuid,current_setting('venue_test.customer')::uuid,'TEST','test@example.invalid',current_date+30,'booking','declined',array[current_date+31]);
select public.set_venue_date_block(current_setting('venue_test.venue')::uuid,current_date+30,'Test block',true);
-- Appointment confirmation ignores wedding blocks.
select public.respond_venue_enquiry(current_setting('venue_test.venue')::uuid,current_setting('venue_test.viewing')::uuid,'viewing_confirmed','Appointment agreed','{}','14:30'::time);
do $$ declare rejected boolean:=false; begin
 if not exists(select 1 from public.venue_enquiries where id=current_setting('venue_test.viewing')::uuid and status='viewing_confirmed' and viewing_time='14:30'::time) then raise exception 'Viewing confirmation failed'; end if;
 begin
  perform public.respond_venue_enquiry(current_setting('venue_test.venue')::uuid,current_setting('venue_test.booking')::uuid,'booked','Agreed','{}',null::time);
 exception when raise_exception then rejected:=true;
 end;
 if not rejected then raise exception 'Wedding block ignored'; end if;
end $$;
select public.set_venue_date_block(current_setting('venue_test.venue')::uuid,current_date+30,null,false);
-- Same date can hold both a confirmed viewing and a confirmed wedding.
select public.respond_venue_enquiry(current_setting('venue_test.venue')::uuid,current_setting('venue_test.booking')::uuid,'booked','Wedding agreed','{}',null::time);
do $$ declare rejected boolean; begin
 rejected:=false;
 begin
  perform public.respond_venue_enquiry(current_setting('venue_test.venue')::uuid,current_setting('venue_test.viewing')::uuid,'booked','Wrong kind','{}',null::time);
 exception when raise_exception then rejected:=true; end;
 if not rejected then raise exception 'Viewing became a wedding booking'; end if;
 rejected:=false;
 begin
  perform public.respond_venue_enquiry(current_setting('venue_test.venue')::uuid,current_setting('venue_test.alternative')::uuid,'viewing_confirmed','Wrong kind','{}',null::time);
 exception when raise_exception then rejected:=true; end;
 if not rejected then raise exception 'Wedding became a viewing'; end if;
 rejected:=false;
 begin
  perform public.request_venue_alternative(current_setting('venue_test.alternative')::uuid,current_setting('venue_test.team')::uuid,current_date+31);
 exception when raise_exception then rejected:=true; end;
 if not rejected then raise exception 'Venue impersonated customer'; end if;
end $$;
-- A genuine stored reply predating the message table must survive choosing another date.
update public.venue_enquiries set response='Previously suggested dates',responded_at=now()-interval '1 day'
 where id=current_setting('venue_test.alternative')::uuid;
select public.request_venue_alternative(current_setting('venue_test.alternative')::uuid,current_setting('venue_test.customer')::uuid,current_date+31);
do $$ begin
 if not exists(select 1 from public.venue_enquiries where id=current_setting('venue_test.alternative')::uuid and status='new' and request_kind='booking' and preferred_date=current_date+31 and next_actor='venue' and cardinality(alternative_dates)=0) then raise exception 'Alternative did not preserve identity/type or was auto-confirmed'; end if;
end $$;
do $$ begin
 if (select count(*) from public.venue_request_messages where request_id=current_setting('venue_test.alternative')::uuid
   and sender_kind='venue' and body='Previously suggested dates' and created_at=now()-interval '1 day')<>1 then
  raise exception 'Legacy response or original response time was lost';
 end if;
end $$;
-- An already-recorded venue reply must not be copied again on a later suggestion.
update public.venue_enquiries set status='declined',response='  Previously suggested dates  ',
 alternative_dates=array[current_date+32],responded_at=now()-interval '1 day'
 where id=current_setting('venue_test.alternative')::uuid;
select public.request_venue_alternative(current_setting('venue_test.alternative')::uuid,current_setting('venue_test.customer')::uuid,current_date+32);
do $$ begin
 if (select count(*) from public.venue_request_messages where request_id=current_setting('venue_test.alternative')::uuid
   and sender_kind='venue' and body='Previously suggested dates')<>1 then raise exception 'Legacy response duplicated'; end if;
end $$;
-- The same text at a different recorded time is a distinct reply and must survive.
update public.venue_enquiries set status='declined',response='Previously suggested dates',
 alternative_dates=array[current_date+33],responded_at=now()
 where id=current_setting('venue_test.alternative')::uuid;
select public.request_venue_alternative(current_setting('venue_test.alternative')::uuid,current_setting('venue_test.customer')::uuid,current_date+33);
do $$ begin
 if (select count(*) from public.venue_request_messages where request_id=current_setting('venue_test.alternative')::uuid
   and sender_kind='venue' and body='Previously suggested dates')<>2 then raise exception 'Distinct timestamp reply lost'; end if;
end $$;
select public.send_venue_request_message(current_setting('venue_test.alternative')::uuid,current_setting('venue_test.customer')::uuid,'Please check this date');
select public.send_venue_request_message(current_setting('venue_test.alternative')::uuid,current_setting('venue_test.team')::uuid,'We will check');
-- Participant reads through RLS, no direct writes or service-only RPC execution.
select set_config('request.jwt.claim.sub',current_setting('venue_test.customer'),true);
set local role authenticated;
do $$ declare rejected boolean:=false; begin
 if (select count(*) from public.venue_request_messages where request_id=current_setting('venue_test.alternative')::uuid)<>7 then raise exception 'Customer cannot read own thread'; end if;
 begin
  perform public.request_venue_alternative(current_setting('venue_test.alternative')::uuid,current_setting('venue_test.customer')::uuid,current_date+31);
 exception when insufficient_privilege then rejected:=true; end;
 if not rejected then raise exception 'Client can call trusted RPC directly'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('venue_test.team'),true);
set local role authenticated;
do $$ begin
 if (select count(*) from public.venue_request_messages where request_id=current_setting('venue_test.alternative')::uuid)<>7 then raise exception 'Venue team cannot read own thread'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('venue_test.other'),true);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.venue_request_messages where request_id=current_setting('venue_test.alternative')::uuid) then raise exception 'Other venue can read thread'; end if;
end $$;
reset role;
set local role anon;
do $$ declare rejected boolean:=false; begin
 begin perform 1 from public.venue_request_messages; exception when insufficient_privilege then rejected:=true; end;
 if not rejected then raise exception 'Public thread access granted'; end if;
end $$;
reset role;
rollback;
select 'PASS: viewing/wedding separation, alternative re-review, participant RLS; synthetic fixtures rolled back' as result;
