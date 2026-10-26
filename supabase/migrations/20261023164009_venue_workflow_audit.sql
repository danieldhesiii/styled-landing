-- REVIEW/APPLY ONLY ON DEV qkyeitvwscrxbiwamxan. Never applied by this task.
-- Requires venue_foundation and venue_marketplace. No legacy request data is rewritten.
begin;
alter table public.venue_enquiries
  add column viewing_time time without time zone,
  add column next_actor text check (next_actor in ('venue','customer','none'));
alter table public.venue_enquiries drop constraint venue_enquiries_status_check;
alter table public.venue_enquiries add constraint venue_enquiries_status_check
  check (status in ('new','contacted','booked','viewing_confirmed','declined','cancelled'));
-- Stage the constraint, then verify legacy rows and validate it in this transaction.
-- Any legacy mismatch aborts application for manual review; no user rows are rewritten.
alter table public.venue_enquiries add constraint venue_request_kind_status_check check (
  (status <> 'booked' or request_kind = 'booking') and
  (status <> 'viewing_confirmed' or request_kind = 'viewing') and
  (viewing_time is null or request_kind = 'viewing')
) not valid;
-- Main applies only after reviewing DEV preflight counts. Fail closed if data differs.
do $$
begin
 if exists(select 1 from public.venue_enquiries where
   (status='booked' and request_kind<>'booking') or
   (status='viewing_confirmed' and request_kind<>'viewing') or
   (viewing_time is not null and request_kind<>'viewing')
 ) then
  raise exception 'Legacy venue request kind/status mismatch: review DEV rows before applying; no automatic data correction';
 end if;
end;
$$;
alter table public.venue_enquiries validate constraint venue_request_kind_status_check;
drop index public.venue_confirmed_booking_day_idx;
create unique index venue_confirmed_booking_day_idx
  on public.venue_enquiries(venue_id,preferred_date) where status='booked' and request_kind='booking';

-- Existing customer/staff SELECT policies remain; add venue-team visibility for scoped threads.
create policy "venue teams read own requests" on public.venue_enquiries for select to authenticated
  using (exists(select 1 from public.venue_users u where u.venue_id=venue_enquiries.venue_id and u.user_id=(select auth.uid())));
create table public.venue_request_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.venue_enquiries(id) on delete cascade,
  sender_kind text not null check(sender_kind in ('customer','venue')),
  body text not null check(length(trim(body)) between 1 and 3000),
  created_at timestamptz not null default now()
);
create index venue_request_messages_thread_idx on public.venue_request_messages(request_id,created_at,id);
alter table public.venue_request_messages enable row level security;
revoke all on public.venue_request_messages from public,anon,authenticated;
grant select on public.venue_request_messages to authenticated;
grant all on public.venue_request_messages to service_role;
-- No public contacts or unscoped staff access. RLS on enquiries and memberships also applies.
create policy "request participants read messages" on public.venue_request_messages for select to authenticated using (
  exists(select 1 from public.venue_enquiries e where e.id=request_id and (
    e.owner_user_id=(select auth.uid()) or exists(select 1 from public.venue_users u
      where u.venue_id=e.venue_id and u.user_id=(select auth.uid()))
  ))
);

-- Service-only INVOKER RPCs follow the existing authorized API pattern.
-- No permissions are elevated inside these functions.
create function public.respond_venue_enquiry(p_venue_id uuid,p_id uuid,p_status text,p_response text,p_dates date[],p_viewing_time time without time zone)
returns void language plpgsql security invoker set search_path='' as $$
declare r public.venue_enquiries; today date := (now() at time zone 'Europe/London')::date;
begin
 if p_status is null or p_status not in ('new','contacted','booked','viewing_confirmed','declined') then raise exception 'Invalid status'; end if;
 perform 1 from public.venue_listings where id=p_venue_id for update;
 select * into r from public.venue_enquiries where id=p_id and venue_id=p_venue_id for update;
 if not found then raise exception 'Request not found'; end if;
 if r.status='cancelled' then raise exception 'This request was cancelled'; end if;
 if r.status in ('booked','viewing_confirmed') and p_status<>r.status then raise exception 'Contact Styled to change a confirmed request'; end if;
 if length(coalesce(p_response,''))>3000 then raise exception 'Response too long'; end if;
 if p_status in ('booked','viewing_confirmed','declined') and length(trim(coalesce(p_response,'')))=0 then raise exception 'Add a response'; end if;
 if cardinality(coalesce(p_dates,'{}'))>5 or exists(select 1 from unnest(p_dates) d where d is null or d<today) then raise exception 'Invalid alternative dates'; end if;
 if p_viewing_time is not null and r.request_kind<>'viewing' then raise exception 'Only viewings have appointment times'; end if;
 if p_status='viewing_confirmed' and r.request_kind<>'viewing' then raise exception 'Only a viewing can be confirmed as a viewing'; end if;
 if p_status in ('booked','viewing_confirmed') and (r.preferred_date is null or r.preferred_date<today) then raise exception 'Choose a future date'; end if;
 if p_status='booked' then
  if r.request_kind<>'booking' then raise exception 'Viewing requests cannot reserve wedding dates'; end if;
  if exists(select 1 from public.venue_date_blocks where venue_id=p_venue_id and day=r.preferred_date) then raise exception 'Wedding date is blocked'; end if;
 end if;
 -- Preserve legacy replies that predate the thread table, or were written by older tooling.
 -- New responses use the same transaction timestamp for responded_at and the message.
 -- Match both timestamp and body so already-recorded replies are not duplicated.
 if length(trim(coalesce(r.response,'')))>0 and not exists(
   select 1 from public.venue_request_messages m where m.request_id=r.id and m.sender_kind='venue'
     and trim(m.body)=trim(r.response) and m.created_at=coalesce(r.responded_at,r.created_at)
 ) then
  insert into public.venue_request_messages(request_id,sender_kind,body,created_at)
   values(r.id,'venue',trim(r.response),coalesce(r.responded_at,r.created_at));
 end if;
 update public.venue_enquiries set status=p_status,response=nullif(trim(p_response),''),alternative_dates=coalesce(p_dates,'{}'),
   viewing_time=case when r.request_kind='viewing' then p_viewing_time else null end,
   next_actor=case when p_status in ('booked','viewing_confirmed') then 'none' when p_status='new' then 'venue' else 'customer' end,
   responded_at=now() where id=p_id and venue_id=p_venue_id;
 if length(trim(coalesce(p_response,'')))>0 then
  insert into public.venue_request_messages(request_id,sender_kind,body) values(p_id,'venue',trim(p_response));
 end if;
end;
$$;
-- Retain compatibility for older callers without leaving the old validation path active.
create or replace function public.respond_venue_enquiry(p_venue_id uuid,p_id uuid,p_status text,p_response text,p_dates date[])
returns void language plpgsql security invoker set search_path='' as $$
begin
 perform public.respond_venue_enquiry(p_venue_id,p_id,p_status,p_response,p_dates,
   (select viewing_time from public.venue_enquiries where id=p_id and venue_id=p_venue_id));
end;
$$;

create function public.send_venue_request_message(p_id uuid,p_user_id uuid,p_body text)
returns void language plpgsql security invoker set search_path='' as $$
declare r public.venue_enquiries; sender text;
begin
 select * into r from public.venue_enquiries where id=p_id for update;
 if not found or p_user_id is null then raise exception 'Request not found'; end if;
 if r.owner_user_id=p_user_id then sender:='customer';
 elsif exists(select 1 from public.venue_users where venue_id=r.venue_id and user_id=p_user_id) then sender:='venue';
 else raise exception 'Request not found'; end if;
 if r.status='cancelled' then raise exception 'Request is closed'; end if;
 if p_body is null or length(trim(p_body)) not between 1 and 3000 then raise exception 'Invalid message'; end if;
 insert into public.venue_request_messages(request_id,sender_kind,body) values(p_id,sender,trim(p_body));
 update public.venue_enquiries set next_actor=case when sender='customer' then 'venue' else 'customer' end where id=p_id;
end;
$$;
create function public.request_venue_alternative(p_id uuid,p_user_id uuid,p_day date)
returns void language plpgsql security invoker set search_path='' as $$
declare r public.venue_enquiries; vid uuid;
begin
 -- Same lock order as confirmations and wedding blocks; re-check after taking locks.
 select venue_id into vid from public.venue_enquiries where id=p_id;
 perform 1 from public.venue_listings where id=vid for update;
 select * into r from public.venue_enquiries where id=p_id for update;
 if not found or p_user_id is null or r.owner_user_id is distinct from p_user_id then raise exception 'Request not found'; end if;
 if r.status not in ('contacted','declined') or p_day is null or not (p_day=any(r.alternative_dates))
   or p_day < (now() at time zone 'Europe/London')::date then raise exception 'Choose a current suggested date'; end if;
 if r.request_kind='booking' and (
   exists(select 1 from public.venue_date_blocks where venue_id=r.venue_id and day=p_day) or
   exists(select 1 from public.venue_enquiries where venue_id=r.venue_id and preferred_date=p_day and status='booked' and request_kind='booking')
 ) then raise exception 'Wedding date unavailable'; end if;
 -- Preserve legacy replies that predate the thread table, or were written by older tooling.
 -- New responses use the same transaction timestamp for responded_at and the message.
 -- Match both timestamp and body so already-recorded replies are not duplicated.
 if length(trim(coalesce(r.response,'')))>0 and not exists(
   select 1 from public.venue_request_messages m where m.request_id=r.id and m.sender_kind='venue'
     and trim(m.body)=trim(r.response) and m.created_at=coalesce(r.responded_at,r.created_at)
 ) then
  insert into public.venue_request_messages(request_id,sender_kind,body,created_at)
   values(r.id,'venue',trim(r.response),coalesce(r.responded_at,r.created_at));
 end if;
 insert into public.venue_request_messages(request_id,sender_kind,body)
   values(p_id,'customer','Please consider '||p_day::text||' for this '||r.request_kind||' request. This is not a confirmation.');
 -- The customer may request a date, never confirm it. Kind/owner/venue cannot change.
 update public.venue_enquiries set preferred_date=p_day,viewing_time=null,status='new',next_actor='venue',
   response=null,alternative_dates='{}',responded_at=null where id=p_id;
end;
$$;
-- Keep external wedding blocks independent of viewing appointments, including legacy rows.
create or replace function public.set_venue_date_block(p_venue_id uuid,p_day date,p_note text,p_block boolean)
returns void language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from public.venue_listings where id=p_venue_id for update;
 if p_block then
  if exists(select 1 from public.venue_enquiries where venue_id=p_venue_id and preferred_date=p_day and status='booked' and request_kind='booking') then raise exception 'A confirmed wedding uses this date'; end if;
  insert into public.venue_date_blocks(venue_id,day,note) values(p_venue_id,p_day,p_note) on conflict(venue_id,day) do update set note=excluded.note;
 else delete from public.venue_date_blocks where venue_id=p_venue_id and day=p_day;
 end if;
end;
$$;
revoke all on function public.respond_venue_enquiry(uuid,uuid,text,text,date[],time without time zone),public.respond_venue_enquiry(uuid,uuid,text,text,date[]),public.send_venue_request_message(uuid,uuid,text),public.request_venue_alternative(uuid,uuid,date),public.set_venue_date_block(uuid,date,text,boolean) from public,anon,authenticated;
grant execute on function public.respond_venue_enquiry(uuid,uuid,text,text,date[],time without time zone),public.respond_venue_enquiry(uuid,uuid,text,text,date[]),public.send_venue_request_message(uuid,uuid,text),public.request_venue_alternative(uuid,uuid,date),public.set_venue_date_block(uuid,date,text,boolean) to service_role;
commit;
