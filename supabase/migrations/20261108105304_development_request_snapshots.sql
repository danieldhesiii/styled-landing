begin;
-- Development sidecar requests never create or publish fictitious products/suppliers.
alter table public.order_lines add column request_snapshot jsonb;
alter table public.order_lines alter column unit_price_pence drop not null;
alter table public.order_lines alter column line_total_pence drop not null;
alter table public.order_lines add constraint order_line_request_snapshot_shape check ((
 (request_snapshot is null and unit_price_pence is not null and line_total_pence is not null)
 or (request_snapshot is not null and jsonb_typeof(request_snapshot)='object'
  and request_snapshot->>'requestOnly'='true' and request_snapshot->>'developmentOnly'='true'
  and request_snapshot->>'catalogueId' like 'demo-crescent-moon-%'
  and product_id is null and supplier_id is null and supplier_status='pending'
  and ((request_snapshot->>'priceOnRequest'='true' and unit_price_pence is null and line_total_pence is null)
    or (request_snapshot->>'priceOnRequest'='false' and unit_price_pence is not null and line_total_pence is not null)))
) is true);

create or replace function public.create_development_request_order(p_owner uuid, p_order jsonb, p_lines jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id    uuid;
  v_day   date := nullif(p_order->>'wedding_date', '')::date;
  v_short jsonb;
begin
  if not exists(select 1 from jsonb_array_elements(p_lines) l where l->'request_snapshot' is not null and l->'request_snapshot' <> 'null'::jsonb) then
    raise exception 'Development snapshot required';
  end if;
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
    unit_price_pence, quantity, line_total_pence, needed_date, return_date, request_snapshot
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
    coalesce(nullif(l->>'return_date', '')::date, v_day),
    l->'request_snapshot'
  from jsonb_array_elements(p_lines) as l;

  insert into public.order_events (order_id, type, detail)
  values (v_id, 'placed', jsonb_build_object('line_count', jsonb_array_length(p_lines)));

  -- Keep prototype requests in the staff inbox without sending real supplier emails.
  update public.booking_notifications set status='blocked',last_error='Development request only. Manual quotation required; no automatic notification.' where order_id=v_id;
  return v_id;
end;
$$;

revoke all on function public.create_development_request_order(uuid, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.create_development_request_order(uuid, jsonb, jsonb) to service_role;


-- Snapshot-only requests cannot acquire payable quotes or a booking/payment status.
create function public.guard_development_request_booking() returns trigger
language plpgsql security invoker set search_path='' as $$
declare v_order uuid;
begin
 if tg_table_name='orders' then v_order:=new.id; else v_order:=new.order_id; end if;
 if exists(select 1 from public.order_lines where order_id=v_order and request_snapshot is not null) then
  raise exception 'Development request only: map to verified supplier products and agree a manual quote first';
 end if;
 return new;
end;$$;
revoke all on function public.guard_development_request_booking() from public,anon,authenticated;
create trigger development_request_quote_guard before insert on public.booking_quotes
 for each row execute function public.guard_development_request_booking();
create trigger development_request_confirm_guard before update of status on public.orders
 for each row when (new.status in ('confirmed','deposit_paid')) execute function public.guard_development_request_booking();
commit;
