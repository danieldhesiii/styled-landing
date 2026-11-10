begin;

create function public.apply_booking_email_event(p_provider text,p_run uuid,p_message text,p_recipient text,p_status text,p_at timestamptz,p_key text) returns boolean
language plpgsql security invoker set search_path='' as $$
declare d public.booking_email_deliveries; inserted integer; v_event_key text; ranks text[]:=array['accepted','deferred','delivered','failed','blocked','bounced','complaint'];
begin
 if p_provider is null or p_provider not in ('brevo','resend')
 or p_message is null or length(p_message) not between 1 and 500
 or p_recipient is null or p_recipient !~ '^[a-f0-9]{64}$'
 or p_key is null or length(p_key) not between 1 and 500
 or p_status is null or not(p_status=any(ranks))
 or p_at is null or p_at>now()+interval '5 minutes' or p_at<now()-interval '90 days'
 then raise exception 'Invalid delivery event';end if;

 -- Require every supplied correlation field to agree. A run may bind an early
 -- callback only while the message is unset; never fall back after a mismatch.
 -- STRICT also refuses ambiguous message/recipient matches instead of choosing
 -- the newest row. Lock before binding so concurrent callbacks cannot rebind it.
 begin
  select * into strict d from public.booking_email_deliveries
  where provider=p_provider and recipient_hash=p_recipient
   and (p_run is null or run_id=p_run)
   and (message_id=p_message or (p_run is not null and message_id is null))
  for update;
 exception when no_data_found or too_many_rows then return false;
 end;
 v_event_key:=case when p_provider='brevo' then p_key else p_provider||':'||p_key end;
 insert into public.booking_email_events(event_key,delivery_id,status,occurred_at)
 values(v_event_key,d.id,p_status,p_at) on conflict do nothing;
 get diagnostics inserted=row_count;
 if inserted=0 then
  return exists(select 1 from public.booking_email_events e where e.event_key=v_event_key and e.delivery_id=d.id and e.status=p_status and e.occurred_at=p_at);
 end if;

 update public.booking_email_deliveries set message_id=coalesce(message_id,p_message),
 -- Do not regress delivered/terminal outcomes to sent or delayed, even if the
 -- provider emits those later. Terminal failures remain visible even when
 -- callbacks arrive out of order; severity makes equal timestamps deterministic.
 status=case when coalesce(array_position(ranks,p_status),0)>=coalesce(array_position(ranks,status),0)
   then p_status else status end,
 last_event_at=greatest(last_event_at,p_at),
 delivered_at=case when p_status='delivered' then least(delivered_at,p_at) else delivered_at end
 where id=d.id;
 return true;
end;$$;
revoke all on function public.apply_booking_email_event(text,uuid,text,text,text,timestamptz,text) from public,anon,authenticated;
grant execute on function public.apply_booking_email_event(text,uuid,text,text,text,timestamptz,text) to service_role;

-- Preserve existing Brevo callers during rollout. This overload can never
-- correlate a Resend delivery, including when both providers reuse an ID.
create or replace function public.apply_booking_email_event(p_run uuid,p_message text,p_recipient text,p_status text,p_at timestamptz,p_key text) returns boolean
language sql security invoker set search_path='' as $$
 select public.apply_booking_email_event('brevo',p_run,p_message,p_recipient,p_status,p_at,p_key);
$$;
revoke all on function public.apply_booking_email_event(uuid,text,text,text,timestamptz,text) from public,anon,authenticated;
grant execute on function public.apply_booking_email_event(uuid,text,text,text,timestamptz,text) to service_role;

commit;
