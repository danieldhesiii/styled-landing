begin;
alter table public.venue_listings add column details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object');
create table public.venue_users (
 venue_id uuid not null references public.venue_listings(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(), primary key (venue_id,user_id)
);
create index venue_users_user_idx on public.venue_users(user_id);
create table public.venue_listing_drafts (
 venue_id uuid primary key references public.venue_listings(id) on delete cascade,
 payload jsonb not null check (jsonb_typeof(payload)='object'),
 status text not null default 'draft' check (status in ('draft','submitted')),
 updated_at timestamptz not null default now()
);
create table public.venue_date_blocks (
 venue_id uuid not null references public.venue_listings(id) on delete cascade,
 day date not null, note text check(length(note)<=300), primary key(venue_id,day)
);
alter table public.venue_enquiries
 add column owner_user_id uuid references auth.users(id) on delete set null,
 add column request_kind text not null default 'booking' check(request_kind in ('booking','viewing')),
 add column response text check(length(response)<=3000),
 add column alternative_dates date[] not null default '{}',
 add column responded_at timestamptz;
alter table public.venue_enquiries drop constraint venue_enquiries_status_check;
alter table public.venue_enquiries add constraint venue_enquiries_status_check check(status in ('new','contacted','booked','declined','cancelled'));
create index venue_enquiries_owner_idx on public.venue_enquiries(owner_user_id,created_at desc);
create unique index venue_confirmed_booking_day_idx on public.venue_enquiries(venue_id,preferred_date) where status='booked';
alter table public.venue_users enable row level security;
alter table public.venue_listing_drafts enable row level security;
alter table public.venue_date_blocks enable row level security;
revoke all on public.venue_users, public.venue_listing_drafts, public.venue_date_blocks from anon,authenticated;
grant select on public.venue_users, public.venue_listing_drafts, public.venue_date_blocks to authenticated;
grant all on public.venue_users, public.venue_listing_drafts, public.venue_date_blocks to service_role;
create policy "venue users see own membership or staff" on public.venue_users for select to authenticated using(user_id=(select auth.uid()) or (select public.is_staff()));
create policy "venue teams see own draft" on public.venue_listing_drafts for select to authenticated using((select public.is_staff()) or exists(select 1 from public.venue_users u where u.venue_id=venue_listing_drafts.venue_id and u.user_id=(select auth.uid())));
create policy "venue teams see own blocked dates" on public.venue_date_blocks for select to authenticated using((select public.is_staff()) or exists(select 1 from public.venue_users u where u.venue_id=venue_date_blocks.venue_id and u.user_id=(select auth.uid())));
create policy "couples read own venue requests" on public.venue_enquiries for select to authenticated using(owner_user_id=(select auth.uid()));
-- Service-only, invoker functions serialise confirmations and external date blocks.
-- Every caller must first authorise the venue membership or staff in the API.
create function public.respond_venue_enquiry(p_venue_id uuid,p_id uuid,p_status text,p_response text,p_dates date[])
returns void language plpgsql security invoker set search_path='' as $$
declare r public.venue_enquiries;
begin
 if p_status not in ('new','contacted','booked','declined') then raise exception 'Invalid status'; end if;
 perform 1 from public.venue_listings where id=p_venue_id for update;
 select * into r from public.venue_enquiries where id=p_id and venue_id=p_venue_id for update;
 if not found then raise exception 'Request not found'; end if;
 if r.status='cancelled' then raise exception 'This request was cancelled'; end if;
 if r.status='booked' and p_status<>'booked' then raise exception 'Contact Styled to change a confirmed booking'; end if;
 if p_status in ('booked','declined') and length(trim(coalesce(p_response,'')))=0 then raise exception 'Add a response for the couple'; end if;
 if p_status='booked' then
  if r.request_kind<>'booking' then raise exception 'Viewing requests cannot be confirmed as wedding bookings'; end if;
  if r.preferred_date < (now() at time zone 'Europe/London')::date then raise exception 'This date is in the past'; end if;
  if exists(select 1 from public.venue_date_blocks where venue_id=p_venue_id and day=r.preferred_date) then raise exception 'This date is blocked'; end if;
 end if;
 update public.venue_enquiries set status=p_status,response=nullif(trim(p_response),''),alternative_dates=coalesce(p_dates,'{}'),responded_at=now() where id=p_id and venue_id=p_venue_id;
end;
$$;
create function public.set_venue_date_block(p_venue_id uuid,p_day date,p_note text,p_block boolean)
returns void language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from public.venue_listings where id=p_venue_id for update;
 if p_block then
  if exists(select 1 from public.venue_enquiries where venue_id=p_venue_id and preferred_date=p_day and status='booked') then raise exception 'A confirmed booking already uses this date'; end if;
  insert into public.venue_date_blocks(venue_id,day,note) values(p_venue_id,p_day,p_note) on conflict(venue_id,day) do update set note=excluded.note;
 else delete from public.venue_date_blocks where venue_id=p_venue_id and day=p_day;
 end if;
end;
$$;
revoke all on function public.respond_venue_enquiry(uuid,uuid,text,text,date[]), public.set_venue_date_block(uuid,date,text,boolean) from public,anon,authenticated;
grant execute on function public.respond_venue_enquiry(uuid,uuid,text,text,date[]), public.set_venue_date_block(uuid,date,text,boolean) to service_role;
commit;
