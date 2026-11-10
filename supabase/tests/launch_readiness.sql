begin;
do $$
declare actor uuid; run uuid:=gen_random_uuid(); recipient text:=repeat('a',64); message text:='fictional-'||gen_random_uuid(); moment timestamptz:=date_trunc('second',now()); delivery uuid; before_revision integer;
begin
 select user_id into actor from public.staff limit 1;if actor is null then raise exception 'Existing development staff required';end if;
 execute 'set local role service_role';
 insert into public.booking_email_deliveries(run_id,check_user_id,recipient_hash,provider) values(run,actor,recipient,'brevo') returning id into delivery;
 if public.apply_booking_email_event(run,message,repeat('b',64),'delivered',moment,'wrong-recipient-'||run) then raise exception 'Unrelated recipient changed a delivery';end if;
 perform public.apply_booking_email_event(run,message,recipient,'delivered',moment,'delivered-'||run);
 perform public.apply_booking_email_event(run,message,recipient,'delivered',moment,'delivered-'||run);
 if (select count(*) from public.booking_email_events where delivery_id=delivery)<>1 then raise exception 'Repeated callback was not idempotent';end if;
 perform public.apply_booking_email_event(run,message,recipient,'deferred',moment-interval '1 minute','old-'||run);
 if (select status from public.booking_email_deliveries where id=delivery)<>'delivered' then raise exception 'Old event overwrote delivery';end if;
 perform public.apply_booking_email_event(null,message,recipient,'bounced',moment+interval '1 second','bounce-'||run);
 if (select status from public.booking_email_deliveries where id=delivery)<>'bounced' or (select delivered_at from public.booking_email_deliveries where id=delivery) is null then raise exception 'Bounce or delivery history lost';end if;
 select revision into before_revision from public.pilot_partners where slug='crescent-moon';
 update public.pilot_partners set revision=revision+1,evidence='Rollback-only audit fixture' where slug='crescent-moon';
 if not exists(select 1 from public.pilot_partner_history where partner_slug='crescent-moon' and (snapshot->>'revision')::integer=before_revision+1 and snapshot->>'evidence'='Rollback-only audit fixture') then raise exception 'Intake audit missing';end if;
 if has_table_privilege('anon','public.pilot_partners','select') or has_table_privilege('authenticated','public.booking_email_deliveries','select') or has_table_privilege('authenticated','public.operational_incidents','insert') or has_function_privilege('authenticated','public.apply_booking_email_event(uuid,text,text,text,timestamptz,text)','execute') then raise exception 'Private launch operations exposed';end if;
end;$$;
select 'Passed: private intake audit, recipient isolation, duplicate callbacks, out-of-order events, bounce history and service-only permissions' as result;
rollback;
