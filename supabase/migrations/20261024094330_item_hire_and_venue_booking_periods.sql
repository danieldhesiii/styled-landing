-- Additive migration for the active DEV-backed website. Legacy dates retain their meaning.
begin;
alter table public.order_lines add column return_date date;
alter table public.order_lines add constraint order_line_hire_dates check (
  return_date is null or (needed_date is not null and return_date >= needed_date and return_date - needed_date <= 31)
);
alter table public.venue_enquiries add column booking_start date, add column booking_end date;
-- One-time backfill for legacy single-day bookings. No records are removed.
update public.venue_enquiries set booking_start=preferred_date,booking_end=preferred_date where request_kind='booking';
alter table public.venue_enquiries add constraint venue_hire_period check (
 (request_kind='viewing' and booking_start is null and booking_end is null) or
 (request_kind='booking' and booking_start is not null and booking_end is not null and
  booking_start<=preferred_date and booking_end>=preferred_date and booking_end-booking_start<=31)
);
create index venue_hire_period_idx on public.venue_enquiries(venue_id,booking_start,booking_end) where request_kind='booking' and status='booked';
create or replace function public.product_availability(
  p_product_ids text[],
  p_day date,
  p_exclude_order uuid default null
)
returns table (
  product_id text,
  capacity integer,
  effective_capacity integer,
  reserved integer,
  available integer
)
language sql
stable
set search_path = ''
as $$
  with t as (
    select
      p.id,
      p.capacity,
      case
        when exists (select 1 from public.availability_overrides a
                     where a.supplier_id = p.supplier_id and a.day = p_day and a.blocked) then 0
        when exists (select 1 from public.availability_overrides a
                     where a.product_id = p.id and a.day = p_day and a.blocked) then 0
        when p.capacity is null then null
        else coalesce(
          (select a.units_available from public.availability_overrides a
           where a.product_id = p.id and a.day = p_day and not a.blocked),
          p.capacity)
      end as effective_capacity,
      coalesce((
        select sum(l.quantity)::integer
        from public.order_lines l
        join public.orders o on o.id = l.order_id
        where l.product_id = p.id
          and p_day between coalesce(l.needed_date, o.wedding_date) and coalesce(l.return_date, o.wedding_date)
          and o.status in ('requested', 'confirmed', 'deposit_paid')
          and l.supplier_status <> 'declined'
          and (p_exclude_order is null or o.id <> p_exclude_order)
      ), 0) as reserved
    from public.products p
    where p.id = any (p_product_ids)
  )
  select
    t.id,
    t.capacity,
    t.effective_capacity,
    t.reserved,
    case when t.effective_capacity is null then null
         else greatest(t.effective_capacity - t.reserved, 0) end
  from t;
$$;
revoke all on function public.product_availability(text[], date, uuid) from public, anon, authenticated;
grant execute on function public.product_availability(text[], date, uuid) to service_role;

create or replace function public.create_order(p_owner uuid, p_order jsonb, p_lines jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id    uuid;
  v_day   date := nullif(p_order->>'wedding_date', '')::date;
  v_short jsonb;
begin
  if v_day is not null then
    if exists (select 1 from jsonb_array_elements(p_lines) l
      where coalesce(nullif(l->>'needed_date','')::date,v_day) < current_date
         or coalesce(nullif(l->>'return_date','')::date,v_day) < coalesce(nullif(l->>'needed_date','')::date,v_day)
         or coalesce(nullif(l->>'return_date','')::date,v_day) - coalesce(nullif(l->>'needed_date','')::date,v_day) > 31) then
      raise exception 'invalid_hire_dates';
    end if;
    -- Serialise orders for the same products: whoever locks first books first.
    perform 1
    from public.products p
    where p.id in (select l->>'product_id' from jsonb_array_elements(p_lines) as l)
    order by p.id
    for update;

    select jsonb_agg(jsonb_build_object(
             'itemId', a.product_id, 'requested', req.q, 'available', a.available))
      into v_short
    from (
      select l->>'product_id' as pid, sum((l->>'quantity')::integer) as q,
             coalesce(nullif(l->>'needed_date','')::date, v_day) as delivery_day,
             coalesce(nullif(l->>'return_date','')::date, v_day) as return_day
      from jsonb_array_elements(p_lines) as l group by 1,3,4
    ) req
    cross join lateral public.product_availability_range(array[req.pid], req.delivery_day, req.return_day) a
    where a.effective_capacity is not null and req.q > a.available;

    if v_short is not null then
      raise exception 'unavailable' using errcode = 'P0001', detail = v_short::text;
    end if;
  end if;

  insert into public.orders (
    owner_id, brief_id, couple_name, email, phone, wedding_date, venue_label,
    style_id, guest_count, subtotal_pence, commission_pence, deposit_pence,
    notes, idempotency_key, client_ip_hash
  ) values (
    p_owner,
    nullif(p_order->>'brief_id', '')::uuid,
    p_order->>'couple_name',
    p_order->>'email',
    nullif(p_order->>'phone', ''),
    v_day,
    nullif(p_order->>'venue_label', ''),
    nullif(p_order->>'style_id', ''),
    nullif(p_order->>'guest_count', '')::integer,
    (p_order->>'subtotal_pence')::integer,
    (p_order->>'commission_pence')::integer,
    (p_order->>'deposit_pence')::integer,
    nullif(p_order->>'notes', ''),
    nullif(p_order->>'idempotency_key', '')::uuid,
    nullif(p_order->>'client_ip_hash', '')
  )
  returning id into v_id;

  insert into public.order_lines (
    order_id, product_id, supplier_id, product_name, supplier_name, unit,
    unit_price_pence, quantity, line_total_pence, needed_date, return_date
  )
  select
    v_id,
    l->>'product_id',
    (l->>'supplier_id')::uuid,
    l->>'product_name',
    l->>'supplier_name',
    l->>'unit',
    (l->>'unit_price_pence')::integer,
    (l->>'quantity')::integer,
    (l->>'line_total_pence')::integer,
    coalesce(nullif(l->>'needed_date', '')::date, v_day),
    coalesce(nullif(l->>'return_date', '')::date, v_day)
  from jsonb_array_elements(p_lines) as l;

  insert into public.order_events (order_id, type, detail)
  values (v_id, 'placed', jsonb_build_object('line_count', jsonb_array_length(p_lines)));

  return v_id;
end;
$$;

revoke all on function public.create_order(uuid, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.create_order(uuid, jsonb, jsonb) to service_role;

-- Existing authorized API/RPCs continue to work. Serialize every booking mutation on
-- the venue row, so a multi-day confirmation cannot race another confirmation/block.
create function public.guard_venue_hire_period() returns trigger
language plpgsql security invoker set search_path='' as $$
declare span_start date; span_end date; today date := (now() at time zone 'Europe/London')::date;
begin
 perform 1 from public.venue_listings where id=new.venue_id for update;
 if new.request_kind='viewing' then
   if new.booking_start is not null or new.booking_end is not null then raise exception 'Viewings do not reserve a hire period'; end if;
   return new;
 end if;
 -- A suggested alternative moves the entire requested period by the same offset.
 -- It does not silently discard setup and pack-down days.
 if tg_op='UPDATE' then
   if new.preferred_date is distinct from old.preferred_date and
      new.booking_start is not distinct from old.booking_start and new.booking_end is not distinct from old.booking_end then
     new.booking_start := old.booking_start + (new.preferred_date-old.preferred_date);
     new.booking_end := old.booking_end + (new.preferred_date-old.preferred_date);
   end if;
 end if;
 new.booking_start := coalesce(new.booking_start,new.preferred_date);
 new.booking_end := coalesce(new.booking_end,new.preferred_date);
 span_start:=new.booking_start; span_end:=new.booking_end;
 if span_start>new.preferred_date or span_end<new.preferred_date or span_end<span_start or span_end-span_start>31 then
   raise exception 'Invalid venue hire period';
 end if;
 if new.status in ('new','contacted','booked') then
   if (tg_op='INSERT' or new.status='booked' or new.preferred_date is distinct from old.preferred_date) and span_start<today then
     raise exception 'Venue hire starts in the past';
   end if;
   if exists(select 1 from public.venue_date_blocks b where b.venue_id=new.venue_id and b.day between span_start and span_end) then
     raise exception 'Part of this venue hire period is blocked';
   end if;
   if exists(select 1 from public.venue_enquiries e where e.venue_id=new.venue_id and e.id is distinct from new.id
     and e.request_kind='booking' and e.status='booked' and e.booking_start<=span_end and e.booking_end>=span_start) then
     raise exception 'Part of this venue hire period is already booked';
   end if;
 end if;
 return new;
end;
$$;
revoke all on function public.guard_venue_hire_period() from public,anon,authenticated;
grant execute on function public.guard_venue_hire_period() to service_role;
create trigger venue_hire_period_guard before insert or update of preferred_date,booking_start,booking_end,status,venue_id,request_kind
 on public.venue_enquiries for each row execute function public.guard_venue_hire_period();
-- Blocking setup/pack-down must be rejected just like blocking the event day.
create or replace function public.set_venue_date_block(p_venue_id uuid,p_day date,p_note text,p_block boolean)
returns void language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from public.venue_listings where id=p_venue_id for update;
 if p_block then
  if exists(select 1 from public.venue_enquiries where venue_id=p_venue_id and
    p_day between booking_start and booking_end and status='booked' and request_kind='booking') then
    raise exception 'A confirmed booking uses this date'; end if;
  insert into public.venue_date_blocks(venue_id,day,note) values(p_venue_id,p_day,p_note) on conflict(venue_id,day) do update set note=excluded.note;
 else delete from public.venue_date_blocks where venue_id=p_venue_id and day=p_day;
 end if;
end;
$$;
revoke all on function public.set_venue_date_block(uuid,date,text,boolean) from public,anon,authenticated;
grant execute on function public.set_venue_date_block(uuid,date,text,boolean) to service_role;
commit;
