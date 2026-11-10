-- Isolated test / rollback-only development fixture. Never invokes a provider.
begin;
select set_config('support.owner',gen_random_uuid()::text,true);
select set_config('support.other',gen_random_uuid()::text,true);
select set_config('support.client',gen_random_uuid()::text,true);
insert into auth.users(id,email) values(current_setting('support.owner')::uuid,'support-owner@example.invalid'),(current_setting('support.other')::uuid,'support-other@example.invalid');
set local role service_role;
select public.submit_support_request(current_setting('support.owner')::uuid,'support-owner@example.invalid',current_setting('support.client')::uuid,'problem','','PRIVATE support fixture');
select public.submit_support_request(current_setting('support.owner')::uuid,'support-owner@example.invalid',current_setting('support.client')::uuid,'problem','','PRIVATE support fixture');
do $$ declare req uuid; job uuid; run uuid:=gen_random_uuid(); before_count integer; begin
 select id into req from public.support_requests where user_id=current_setting('support.owner')::uuid;
 if (select count(*) from public.support_requests where user_id=current_setting('support.owner')::uuid)<>1 then raise exception 'Duplicate saved request'; end if;
 if (select count(*) from public.support_notifications where request_id=req)<>1 then raise exception 'Missing/duplicate transactional outbox'; end if;
 select id into job from public.support_notifications where request_id=req;
 insert into public.booking_email_deliveries(run_id,support_job_id,provider,recipient_hash) values(run,job,'resend',repeat('a',64));
 if not public.apply_booking_email_event('resend',run,'support-fixture-message',repeat('a',64),'delivered',now(),'support-fixture-event') then raise exception 'Support delivery callback failed'; end if;
 if not exists(select 1 from public.booking_email_deliveries where support_job_id=job and status='delivered') then raise exception 'Support delivery not recorded'; end if;
 select count(*) into before_count from public.support_requests;
 begin
  perform public.submit_support_request(current_setting('support.owner')::uuid,'support-owner@example.invalid',gen_random_uuid(),'problem','','Rollback support fixture');
  raise exception using errcode='ZX001',message='Rollback fixture';
 exception when sqlstate 'ZX001' then null;
 end;
 if (select count(*) from public.support_requests)<>before_count then raise exception 'Request transaction failed to roll back'; end if;
 if (select count(*) from public.support_notifications where request_id in(select id from public.support_requests where user_id=current_setting('support.owner')::uuid))<>1 then raise exception 'Outbox transaction failed to roll back'; end if;
 if has_table_privilege('authenticated','public.support_notifications','SELECT') or has_table_privilege('anon','public.support_notifications','SELECT') then raise exception 'Client queue access'; end if;
 if has_function_privilege('authenticated','public.submit_support_request(uuid,text,uuid,text,text,text)','execute') then raise exception 'Client write access'; end if;
end;$$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('support.owner'),true);
set local role authenticated;
do $$ begin if (select count(*) from public.support_requests)<>1 then raise exception 'Owner cannot see saved support'; end if;end;$$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('support.other'),true);
set local role authenticated;
do $$ begin if exists(select 1 from public.support_requests) then raise exception 'Support body leaked across accounts'; end if;end;$$;
reset role;
rollback;
