-- Catalogue in the database, and server-side orders.

-- ---------------------------------------------------------------- catalogue
-- The UI shows an emoji + colour swatch when a product has no photo, and lists
-- items in a fixed order within each category.
alter table public.products
  add column icon       text    not null default '',
  add column swatch     text    not null default '#cccccc',
  add column sort_order integer not null default 0;

create index products_sort_idx on public.products (category, sort_order);

-- ---------------------------------------------------------------- orders
alter table public.orders
  add column notes           text,
  add column idempotency_key uuid,   -- lets a retried or double-clicked submit return the same order
  add column client_ip_hash  text;   -- HMAC of the caller's IP, for abuse limits

create unique index orders_owner_idempotency_idx
  on public.orders (owner_id, idempotency_key)
  where idempotency_key is not null;
create index orders_ip_created_idx on public.orders (client_ip_hash, created_at);
create index orders_created_at_idx on public.orders (created_at);

alter table public.order_lines
  add column unit text;

-- Money can't be inconsistent, even if a bug slips past the server.
alter table public.order_lines
  add constraint order_lines_total_matches
  check (line_total_pence = unit_price_pence * quantity);
alter table public.orders
  add constraint orders_deposit_within_total
  check (deposit_pence <= subtotal_pence);

-- Guests can read their orders but not who they were rate limited as, or notes
-- Styled keeps internally. (They can read their own order and lines otherwise.)
revoke select on public.orders from anon, authenticated;
grant select (
  id, owner_id, brief_id, couple_name, email, phone, wedding_date, venue_label,
  style_id, guest_count, subtotal_pence, deposit_pence, status, notes,
  created_at, updated_at
) on public.orders to authenticated;
-- (commission_pence is Styled's margin: never shown to couples.)

-- ---------------------------------------------------------------- create_order
-- Writes an order and all its lines in ONE transaction, so there is never an
-- order without lines (or lines without an order). Called by the server with
-- already-validated, server-priced data; nothing else may execute it.
create or replace function public.create_order(p_owner uuid, p_order jsonb, p_lines jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
begin
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
    nullif(p_order->>'wedding_date', '')::date,
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

  return v_id;
end;
$$;

revoke all on function public.create_order(uuid, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.create_order(uuid, jsonb, jsonb) to service_role;
