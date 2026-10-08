-- Per-line delivery date.
--
-- Couples can have different suppliers deliver on different days (e.g. furniture
-- set up the day before), or everything on the wedding day (the default). This is
-- a logistics/delivery date only: availability is still reserved against the
-- order's wedding_date (the event date), because that's when the items are in use
-- — a supplier can't lend the same stock to two weddings that weekend regardless
-- of when it's dropped off. NULL = delivered on the wedding day.

alter table public.order_lines add column needed_date date;

-- create_order: identical to before, but each line now also records its
-- needed_date (defaulting to the wedding date). The availability lock and check
-- are unchanged — they still work off the order's wedding_date.
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
