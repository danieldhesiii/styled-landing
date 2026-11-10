-- Rollback-only fixtures: no existing users, provider calls or private payloads.
begin;
do $$
declare
 actor uuid:=gen_random_uuid(); resend_run uuid:=gen_random_uuid(); brevo_run uuid:=gen_random_uuid();
 recipient text:=repeat('c',64); message text:=gen_random_uuid()::text;
 moment timestamptz:=date_trunc('second',now())-interval '10 minutes';
 resend_id uuid; brevo_id uuid; other_id uuid; second_run uuid:=gen_random_uuid();
 row_before jsonb; row_after jsonb; event_count integer;
begin
 execute 'set local role service_role';
 insert into public.booking_email_deliveries(run_id,check_user_id,provider,recipient_hash)
 values(resend_run,actor,'resend',recipient) returning id into resend_id;
 insert into public.booking_email_deliveries(run_id,check_user_id,provider,recipient_hash,message_id)
 values(brevo_run,actor,'brevo',recipient,message) returning id into brevo_id;

 if public.apply_booking_email_event('resend',null,message,recipient,'delivered',moment,'no-guess') then raise exception 'Guessed an unbound message without a run';end if;
 if public.apply_booking_email_event('resend',resend_run,message,repeat('d',64),'delivered',moment,'wrong-recipient') then raise exception 'Matched wrong recipient';end if;
 if public.apply_booking_email_event('brevo',resend_run,message,recipient,'delivered',moment,'wrong-provider') then raise exception 'Crossed provider boundary';end if;
 if public.apply_booking_email_event('resend',brevo_run,message,recipient,'delivered',moment,'wrong-run') then raise exception 'Fell back from mismatched run';end if;
 if not public.apply_booking_email_event('resend',resend_run,message,recipient,'delivered',moment,'shared-key') then raise exception 'Early callback did not bind';end if;
 if (select message_id from public.booking_email_deliveries where id=resend_id)<>message then raise exception 'Early message binding lost';end if;
 if (select status from public.booking_email_deliveries where id=brevo_id)<>'pending' then raise exception 'Resend callback touched Brevo';end if;

 select to_jsonb(d) into row_before from public.booking_email_deliveries d where id=resend_id;
 perform public.apply_booking_email_event('resend',resend_run,message,recipient,'delivered',moment,'shared-key');
 select to_jsonb(d) into row_after from public.booking_email_deliveries d where id=resend_id;
 if row_before is distinct from row_after or (select count(*) from public.booking_email_events where delivery_id=resend_id)<>1 then raise exception 'Duplicate changed ledger';end if;
 if public.apply_booking_email_event('resend',resend_run,gen_random_uuid()::text,recipient,'bounced',moment,'wrong-message') then raise exception 'Rebound a known message';end if;
 if public.apply_booking_email_event('resend',gen_random_uuid(),message,recipient,'bounced',moment,'wrong-known-run') then raise exception 'Ignored supplied wrong run';end if;

 -- A legacy six-argument call remains Brevo-only; its key can safely overlap
 -- the Resend key without losing either event.
 if not public.apply_booking_email_event(null,message,recipient,'delivered',moment,'shared-key') then raise exception 'Legacy Brevo caller broken';end if;
 if (select count(*) from public.booking_email_events where delivery_id in (resend_id,brevo_id))<>2 then raise exception 'Provider event keys collided';end if;
 perform public.apply_booking_email_event('resend',null,message,recipient,'deferred',moment-interval '1 minute','old-delay');
 perform public.apply_booking_email_event('resend',null,message,recipient,'accepted',moment+interval '1 minute','late-sent');
 perform public.apply_booking_email_event('resend',null,message,recipient,'deferred',moment+interval '2 minutes','late-delay');
 if (select status from public.booking_email_deliveries where id=resend_id)<>'delivered' then raise exception 'Sent/delayed regressed delivery';end if;
 perform public.apply_booking_email_event('resend',null,message,recipient,'bounced',moment+interval '3 minutes','bounce');
 perform public.apply_booking_email_event('resend',null,message,recipient,'delivered',moment+interval '3 minutes','same-time-delivery');
 if (select status from public.booking_email_deliveries where id=resend_id)<>'bounced' or (select delivered_at from public.booking_email_deliveries where id=resend_id)<>moment then raise exception 'Failure/delivery history lost';end if;
 perform public.apply_booking_email_event('resend',null,message,recipient,'complaint',moment+interval '3 minutes','complaint');
 perform public.apply_booking_email_event('resend',null,message,recipient,'bounced',moment+interval '3 minutes','same-time-bounce');
 if (select status from public.booking_email_deliveries where id=resend_id)<>'complaint' then raise exception 'Tie was not deterministic';end if;

 -- A replay key must not suppress a distinct transition or be reused for a
 -- different row. Neither conflict should insert an event or update status.
 select count(*) into event_count from public.booking_email_events;
 if public.apply_booking_email_event('resend',resend_run,message,recipient,'failed',moment,'shared-key') then raise exception 'Accepted reused key with different content';end if;
 insert into public.booking_email_deliveries(run_id,check_user_id,provider,recipient_hash,message_id)
 values(second_run,actor,'resend',recipient,message) returning id into other_id;
 if public.apply_booking_email_event('resend',second_run,message,recipient,'delivered',moment,'shared-key') then raise exception 'Reused event key on a different delivery';end if;
 if public.apply_booking_email_event('resend',null,message,recipient,'delivered',moment,'ambiguous') then raise exception 'Chose one of ambiguous messages';end if;
 if (select count(*) from public.booking_email_events)<>event_count then raise exception 'Rejected events were stored';end if;
 if (select status from public.booking_email_deliveries where id=other_id)<>'pending' then raise exception 'Rejected match changed delivery';end if;

 -- Reverse arrival order produces the same lifecycle outcome, including
 -- identical provider timestamps and an accepted event emitted later.
 perform public.apply_booking_email_event('resend',second_run,message,recipient,'accepted',moment+interval '1 minute','reverse-sent');
 perform public.apply_booking_email_event('resend',second_run,message,recipient,'complaint',moment+interval '3 minutes','reverse-complaint');
 perform public.apply_booking_email_event('resend',second_run,message,recipient,'bounced',moment+interval '3 minutes','reverse-bounce');
 perform public.apply_booking_email_event('resend',second_run,message,recipient,'delivered',moment,'reverse-delivery');
 if (select status from public.booking_email_deliveries where id=other_id)<>'complaint' or (select delivered_at from public.booking_email_deliveries where id=other_id)<>moment then raise exception 'Reverse arrival order changed outcome';end if;

 if has_function_privilege('anon','public.apply_booking_email_event(text,uuid,text,text,text,timestamptz,text)','execute')
 or has_function_privilege('authenticated','public.apply_booking_email_event(text,uuid,text,text,text,timestamptz,text)','execute')
 or has_function_privilege('authenticated','public.apply_booking_email_event(uuid,text,text,text,timestamptz,text)','execute')
 then raise exception 'Private RPC exposed';end if;
end;$$;
select 'Passed: Resend/Brevo isolation, early binding, strict correlation, duplicate keys, ambiguity refusal, ordering and private RPC permissions' as result;
rollback;
