-- Preserve legacy callers that pass all four arguments, while removing
-- defaults that collide with the newer three-argument hire-date function.
-- The existing function has no dependent database objects; no stock rows change.
do $compat$
declare definition text;
begin
 if exists(select 1 from pg_proc where oid=to_regprocedure('public.product_availability(text[],date,uuid,uuid)') and pronargdefaults>0) then
  select replace(pg_get_functiondef('public.product_availability(text[],date,uuid,uuid)'::regprocedure), ' DEFAULT NULL::uuid', '') into definition;
  drop function public.product_availability(text[],date,uuid,uuid);
  execute definition;
  revoke all on function public.product_availability(text[],date,uuid,uuid) from public,anon,authenticated;
  grant execute on function public.product_availability(text[],date,uuid,uuid) to service_role;
 end if;
end;
$compat$;

-- Private planning workspace. JSON contains validated wedding details and boards,
-- never public listings or signed image URLs. Optimistic revision prevents stale overwrites.
create table public.wedding_workspaces (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 200000),
  revision integer not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);
alter table public.wedding_workspaces enable row level security;
revoke all on public.wedding_workspaces from public, anon, authenticated;
grant select, insert, update, delete on public.wedding_workspaces to authenticated;
grant all on public.wedding_workspaces to service_role;
create policy workspace_owner_select on public.wedding_workspaces for select to authenticated using ((select auth.uid()) = owner_id);
create policy workspace_owner_insert on public.wedding_workspaces for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy workspace_owner_update on public.wedding_workspaces for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy workspace_owner_delete on public.wedding_workspaces for delete to authenticated using ((select auth.uid()) = owner_id);
create trigger wedding_workspace_updated before update on public.wedding_workspaces for each row execute function public.set_updated_at();

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
          and p_day between least(coalesce(l.needed_date, o.wedding_date), o.wedding_date) and greatest(coalesce(l.needed_date, o.wedding_date), o.wedding_date)
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

-- Worst daily availability across the delivery-to-event interval. Stock used on
-- different days is not summed together. Unknown return/collection rules stay out.
create or replace function public.product_availability_range(p_product_ids text[], p_start date, p_end date, p_exclude_order uuid default null)
returns table (product_id text, capacity integer, effective_capacity integer, reserved integer, available integer)
language sql stable set search_path = '' as $$
  select a.product_id, max(a.capacity), min(a.effective_capacity), max(a.reserved), min(a.available)
  from generate_series(p_start, p_end, interval '1 day') d(day)
  cross join lateral public.product_availability(p_product_ids, d.day::date, p_exclude_order) a
  where p_end >= p_start and p_end - p_start <= 31
  group by a.product_id;
$$;
revoke all on function public.product_availability_range(text[], date, date, uuid) from public, anon, authenticated;
grant execute on function public.product_availability_range(text[], date, date, uuid) to service_role;

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
      where coalesce(nullif(l->>'needed_date','')::date,v_day) > v_day
         or v_day - coalesce(nullif(l->>'needed_date','')::date,v_day) > 31) then
      raise exception 'invalid_delivery_date';
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
             coalesce(nullif(l->>'needed_date','')::date, v_day) as delivery_day
      from jsonb_array_elements(p_lines) as l group by 1,3
    ) req
    cross join lateral public.product_availability_range(array[req.pid], req.delivery_day, v_day) a
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
    unit_price_pence, quantity, line_total_pence, needed_date
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
    coalesce(nullif(l->>'needed_date', '')::date, v_day)
  from jsonb_array_elements(p_lines) as l;

  insert into public.order_events (order_id, type, detail)
  values (v_id, 'placed', jsonb_build_object('line_count', jsonb_array_length(p_lines)));

  return v_id;
end;
$$;

revoke all on function public.create_order(uuid, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.create_order(uuid, jsonb, jsonb) to service_role;
