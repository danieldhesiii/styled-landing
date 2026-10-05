-- Staff workflow, real supplier availability, order tracking.

-- ================================================================ capacity
-- Units of a product a supplier can provide on any one day (chairs in stock,
-- arches they own). NULL = not limited by stock (made to order). Staff edit it;
-- supplier inventory feeds can write it later.
alter table public.products
  add column capacity integer check (capacity is null or capacity >= 0);

-- One-time starting point, so the shop works before staff enter real stock.
-- These are placeholders to be replaced with each supplier's real numbers.
update public.products
set capacity = case
  when stock = 'made_to_order' then null
  when qty_rule = 'per_guest' then case when stock = 'low_stock' then 120 else 600 end
  when qty_rule = 'per_table' then case when stock = 'low_stock' then 12 else 40 end
  else case when stock = 'low_stock' then 1 else 2 end
end
where capacity is null;

-- Blocked dates and per-day capacity changes, for one product OR a whole supplier.
create table public.availability_overrides (
  id              uuid primary key default gen_random_uuid(),
  product_id      text references public.products (id) on delete cascade,
  supplier_id     uuid references public.suppliers (id) on delete cascade,
  day             date not null,
  blocked         boolean not null default true,
  units_available integer check (units_available is null or units_available >= 0),
  note            text,
  created_by      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  constraint override_has_one_target check (num_nonnulls(product_id, supplier_id) = 1),
  constraint override_units_only_for_products check (supplier_id is null or units_available is null),
  constraint override_not_blocked_needs_units check (blocked or units_available is not null)
);
create unique index availability_overrides_product_day on public.availability_overrides (product_id, day) where product_id is not null;
create unique index availability_overrides_supplier_day on public.availability_overrides (supplier_id, day) where supplier_id is not null;
create index availability_overrides_day_idx on public.availability_overrides (day);
alter table public.availability_overrides enable row level security;  -- staff API only (service role)

-- ================================================================ orders
alter table public.orders
  add column reference       text generated always as ('STY-' || upper(substr(id::text, 1, 8))) stored,
  add column staff_notes     text,   -- internal, never shown to couples
  add column couple_message  text,   -- staff's note to the couple, shown on their order page
  add column decided_at      timestamptz,
  add column decided_by      uuid references auth.users (id) on delete set null;
create index orders_reference_idx on public.orders (reference);
create index orders_wedding_status_idx on public.orders (wedding_date)
  where status in ('requested', 'confirmed', 'deposit_paid');

alter table public.order_lines
  add column supplier_note       text,  -- internal
  add column supplier_decided_at timestamptz;

-- Couples see their order (and the message staff wrote them), not staff notes.
revoke select on public.orders from anon, authenticated;
grant select (
  id, owner_id, brief_id, reference, couple_name, email, phone, wedding_date, venue_label,
  style_id, guest_count, subtotal_pence, deposit_pence, status, notes, couple_message,
  created_at, updated_at
) on public.orders to authenticated;

revoke select on public.order_lines from anon, authenticated;
grant select (
  id, order_id, product_id, supplier_id, product_name, supplier_name, unit,
  unit_price_pence, quantity, line_total_pence, supplier_status, created_at
) on public.order_lines to authenticated;

-- Everything staff do to an order, and when. Staff API only.
create table public.order_events (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete cascade,
  actor_id    uuid references auth.users (id) on delete set null,
  actor_label text,                       -- the person's email at the time
  type        text not null,
  detail      jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
create index order_events_order_idx on public.order_events (order_id, created_at);
alter table public.order_events enable row level security;

-- ================================================================ rate limiting
-- Small fixed-window counter for endpoints that take guesses (order lookup).
create table public.rate_limits (
  key          text primary key,
  window_start timestamptz not null,
  hits         integer not null
);
alter table public.rate_limits enable row level security;

create or replace function public.hit_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_hits integer;
begin
  insert into public.rate_limits as r (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update set
    window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end,
    hits         = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end
  returning hits into v_hits;
  return v_hits <= p_limit;
end;
$$;
revoke all on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;

-- ================================================================ availability
-- THE definition of what's available on a day. Used by the shop, checkout, the
-- order itself and the staff screens, so they can never disagree.
--
--   effective capacity = 0 if the supplier or product is blocked that day,
--                        else the day's override, else the product's capacity
--                        (NULL = unlimited / made to order)
--   reserved           = units on other orders for that wedding date that are
--                        requested, confirmed or paid, and whose supplier hasn't declined
--   available          = effective capacity - reserved (never below 0)
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
          and o.wedding_date = p_day
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

-- ================================================================ create_order v2
-- Same as before, plus: for a dated order it LOCKS the products being ordered,
-- re-checks availability inside the transaction and refuses if anything is short,
-- so two couples can never both take the last unit. Also writes the first event.
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
           array(select l->>'product_id' from jsonb_array_elements(p_lines) as l), v_day) a
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
    unit_price_pence, quantity, line_total_pence
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
    (l->>'line_total_pence')::integer
  from jsonb_array_elements(p_lines) as l;

  insert into public.order_events (order_id, type, detail)
  values (v_id, 'placed', jsonb_build_object('lines', jsonb_array_length(p_lines)));

  return v_id;
end;
$$;
revoke all on function public.create_order(uuid, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.create_order(uuid, jsonb, jsonb) to service_role;
