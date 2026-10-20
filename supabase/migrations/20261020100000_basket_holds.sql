-- Basket holds: stock in one couple's basket can't be taken by another.
--
-- Until now only placed orders reserved stock, so two couples could both put the
-- last arch in their basket and the second only found out at checkout. Now a
-- basket holds what's in it, for its wedding date, for a short while:
--
--   - the studio re-syncs the basket whenever it changes and every minute while
--     the page is open, which renews the hold;
--   - a closed or abandoned tab lets the hold lapse after HOLD_TTL (15 minutes);
--   - removing an item, emptying the basket or changing the date drops the hold
--     straight away;
--   - placing an order turns the hold into the order's reservation, and an order
--     that is declined or cancelled stops reserving (as before).
--
-- Backwards compatible: product_availability gains an optional argument and an
-- extra column, so callers that don't know about holds keep working.

-- ================================================================ basket_holds
-- One row per product in a couple's basket. Expired rows are ignored everywhere
-- and tidied up the next time anyone holds that product.
create table public.basket_holds (
  owner_id   uuid not null references auth.users (id) on delete cascade,
  product_id text not null references public.products (id) on delete cascade,
  day        date not null,
  quantity   integer not null check (quantity > 0),
  expires_at timestamptz not null,
  primary key (owner_id, product_id)
);
create index basket_holds_product_day_idx on public.basket_holds (product_id, day);
alter table public.basket_holds enable row level security;  -- server API only (service role)

-- ================================================================ availability v2
-- As before, plus: units in other couples' live basket holds are taken out of
-- what's available. p_exclude_owner leaves out the caller's own holds, so their
-- basket never counts against itself.
--
--   held      = units in unexpired basket holds for that day (not the excluded owner's)
--   available = effective capacity - reserved - held (never below 0)
drop function public.product_availability(text[], date, uuid);
create function public.product_availability(
  p_product_ids text[],
  p_day date,
  p_exclude_order uuid default null,
  p_exclude_owner uuid default null
)
returns table (
  product_id text,
  capacity integer,
  effective_capacity integer,
  reserved integer,
  held integer,
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
          and o.wedding_date = p_day
          and o.status in ('requested', 'confirmed', 'deposit_paid')
          and l.supplier_status <> 'declined'
          and (p_exclude_order is null or o.id <> p_exclude_order)
      ), 0) as reserved,
      coalesce((
        select sum(h.quantity)::integer
        from public.basket_holds h
        where h.product_id = p.id
          and h.day = p_day
          and h.expires_at > now()
          and (p_exclude_owner is null or h.owner_id <> p_exclude_owner)
      ), 0) as held
    from public.products p
    where p.id = any (p_product_ids)
  )
  select
    t.id,
    t.capacity,
    t.effective_capacity,
    t.reserved,
    t.held,
    case when t.effective_capacity is null then null
         else greatest(t.effective_capacity - t.reserved - t.held, 0) end
  from t;
$$;
revoke all on function public.product_availability(text[], date, uuid, uuid) from public, anon, authenticated;
grant execute on function public.product_availability(text[], date, uuid, uuid) to service_role;

-- ================================================================ set_basket_holds
-- Replace a couple's holds with their current basket. Takes the same product
-- locks as create_order, so two couples can't both hold the last unit: whoever
-- locks first holds it, and the other's line isn't held (the API then reports it
-- as unavailable). A line asking for more than is free holds what is free, so
-- raising a quantity too far never loses the units the couple already had.
-- Made-to-order products need no hold. A null day or an empty basket just
-- releases everything.
--
-- p_lines: [{ "product_id": text, "quantity": int }]
create or replace function public.set_basket_holds(
  p_owner uuid,
  p_day date,
  p_lines jsonb,
  p_ttl_seconds integer default 900
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_ids text[] := array(select l->>'product_id' from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb)) as l);
begin
  delete from public.basket_holds where owner_id = p_owner;
  if p_day is null or cardinality(v_ids) = 0 then
    return;
  end if;

  -- Serialise with orders and other baskets for the same products.
  perform 1
  from public.products p
  where p.id = any (v_ids)
  order by p.id
  for update;

  delete from public.basket_holds where product_id = any (v_ids) and expires_at <= now();

  insert into public.basket_holds (owner_id, product_id, day, quantity, expires_at)
  select p_owner, a.product_id, p_day, least(req.q, a.available), now() + make_interval(secs => p_ttl_seconds)
  from public.product_availability(v_ids, p_day, null, p_owner) a
  join (
    select l->>'product_id' as pid, sum((l->>'quantity')::integer) as q
    from jsonb_array_elements(p_lines) as l
    group by 1
  ) req on req.pid = a.product_id
  where a.effective_capacity is not null and req.q > 0 and a.available > 0;
end;
$$;
revoke all on function public.set_basket_holds(uuid, date, jsonb, integer) from public, anon, authenticated;
grant execute on function public.set_basket_holds(uuid, date, jsonb, integer) to service_role;

-- ================================================================ create_order v4
-- Identical to before, except: the couple's own basket holds don't count against
-- their order, and once the order is written their holds are released (the order
-- now reserves the stock instead).
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
    -- Serialise orders for the same products: whoever locks first books first.
    perform 1
    from public.products p
    where p.id in (select l->>'product_id' from jsonb_array_elements(p_lines) as l)
    order by p.id
    for update;

    select jsonb_agg(jsonb_build_object(
             'itemId', a.product_id, 'requested', req.q, 'available', a.available))
      into v_short
    from public.product_availability(
           array(select l->>'product_id' from jsonb_array_elements(p_lines) as l), v_day, null, p_owner) a
    join (
      select l->>'product_id' as pid, sum((l->>'quantity')::integer) as q
      from jsonb_array_elements(p_lines) as l
      group by 1
    ) req on req.pid = a.product_id
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

  -- The order reserves the stock now; the basket's holds are no longer needed.
  delete from public.basket_holds where owner_id = p_owner;

  return v_id;
end;
$$;

revoke all on function public.create_order(uuid, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.create_order(uuid, jsonb, jsonb) to service_role;
