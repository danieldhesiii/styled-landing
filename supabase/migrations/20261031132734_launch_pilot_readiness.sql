begin;
create table public.pilot_partners (
 slug text primary key, name text not null, website text not null, contact_email text not null default '',
 supplier_id uuid references public.suppliers(id) on delete set null,
 scope_note text not null, source_note text not null, checklist jsonb not null default '{}',
 commercial jsonb not null default '{}', evidence text not null default '', next_step text not null default '',
 revision integer not null default 0, updated_by uuid, updated_at timestamptz not null default now()
);
create index pilot_partners_supplier_idx on public.pilot_partners(supplier_id);
create table public.pilot_partner_history (
 id uuid primary key default gen_random_uuid(), partner_slug text not null references public.pilot_partners(slug),
 snapshot jsonb not null, recorded_at timestamptz not null default now()
);
create index pilot_partner_history_partner_idx on public.pilot_partner_history(partner_slug,recorded_at desc);
create function public.record_pilot_partner() returns trigger language plpgsql security invoker set search_path='' as $$
begin insert into public.pilot_partner_history(partner_slug,snapshot) values(new.slug,to_jsonb(new));return new;end;$$;
create trigger pilot_partner_history after update on public.pilot_partners for each row execute function public.record_pilot_partner();
create table public.launch_check_records (
 key text primary key, evidence text not null, checked_by uuid not null, checked_at timestamptz not null default now()
);
create table public.operational_incidents (
 id uuid primary key default gen_random_uuid(), section text not null, digest text, state text not null default 'open' check(state in ('open','resolved')),
 created_at timestamptz not null default now(), resolved_at timestamptz, resolved_by uuid
);
create index operational_incidents_state_idx on public.operational_incidents(state,created_at desc);
create table public.booking_email_deliveries (
 id uuid primary key default gen_random_uuid(), run_id uuid not null,
 job_id uuid references public.booking_notifications(id) on delete cascade, check_user_id uuid,
 recipient_hash text not null check(length(recipient_hash)=64), provider text not null check(provider in ('brevo','resend')),
 message_id text, status text not null default 'pending' check(status in ('pending','accepted','delivered','deferred','bounced','blocked','complaint','failed','unknown')),
 last_event_at timestamptz, delivered_at timestamptz, created_at timestamptz not null default now(),
 check ((job_id is not null) <> (check_user_id is not null)), unique(run_id,recipient_hash)
);
create index booking_email_deliveries_job_idx on public.booking_email_deliveries(job_id);
create index booking_email_deliveries_check_idx on public.booking_email_deliveries(check_user_id,created_at desc);
create index booking_email_deliveries_message_idx on public.booking_email_deliveries(provider,message_id,recipient_hash);
create table public.booking_email_events (
 event_key text primary key, delivery_id uuid not null references public.booking_email_deliveries(id) on delete cascade,
 status text not null, occurred_at timestamptz not null, recorded_at timestamptz not null default now()
);
create index booking_email_events_delivery_idx on public.booking_email_events(delivery_id,occurred_at desc);
do $$ declare t text;begin
 foreach t in array array['pilot_partners','pilot_partner_history','launch_check_records','operational_incidents','booking_email_deliveries','booking_email_events'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant select,insert,update,delete on public.%I to service_role',t);
 end loop;
end;$$;
revoke all on function public.record_pilot_partner() from public,anon,authenticated;
create function public.apply_booking_email_event(p_run uuid,p_message text,p_recipient text,p_status text,p_at timestamptz,p_key text) returns boolean
language plpgsql security invoker set search_path='' as $$
declare d public.booking_email_deliveries; inserted integer;
begin
 if p_status not in ('delivered','deferred','bounced','blocked','complaint','failed','accepted') or p_at>now()+interval '5 minutes' or p_at<now()-interval '90 days' then raise exception 'Invalid delivery event';end if;
 select * into d from public.booking_email_deliveries where provider='brevo' and recipient_hash=p_recipient
 and ((p_run is not null and run_id=p_run and (message_id is null or message_id=p_message)) or (p_run is null and message_id=p_message)) order by created_at desc limit 1 for update;
 if not found then return false;end if;
 insert into public.booking_email_events(event_key,delivery_id,status,occurred_at) values(p_key,d.id,p_status,p_at) on conflict do nothing;
 get diagnostics inserted=row_count;if inserted=0 then return true;end if;
 update public.booking_email_deliveries set message_id=coalesce(message_id,p_message),
 status=case when last_event_at is null or p_at>last_event_at or (p_at=last_event_at and p_status in ('bounced','blocked','complaint','failed')) then p_status else status end,
 last_event_at=greatest(last_event_at,p_at),delivered_at=case when p_status='delivered' then coalesce(delivered_at,p_at) else delivered_at end where id=d.id;
 return true;
end;$$;
revoke all on function public.apply_booking_email_event(uuid,text,text,text,timestamptz,text) from public,anon,authenticated;
grant execute on function public.apply_booking_email_event(uuid,text,text,text,timestamptz,text) to service_role;
insert into public.pilot_partners(slug,name,website,contact_email,scope_note,source_note,next_step) values
 ('crescent-moon','Crescent Moon','https://www.crescent-moon.co.uk/','info@crescent-moon.co.uk','Simon to select six popular products. Manual availability checks in his own system; hire-only or supplier installation. No customer money before supplier agreement.','30 October meeting transcript, machine transcription. Supplier to verify all listing and commercial details.','Receive the six chosen products, specifications, images, hire prices and service fees. Confirm the next review date and time.'),
 ('sarah-mae','Sarah Mae Flowers','https://sarahmaeflowers.co.uk/','','Agree a small artificial-floral range or package selection, inclusions, colour options, minimum order and Scotland delivery/setup rules. Existing booking system remains authoritative.','First meeting transcript, machine transcription. Contact name and all prices/permissions still need verification.','Confirm the contact and starting packages; request real photographs, package contents, prices, minimums, travel/setup rules and terms.');
commit;
