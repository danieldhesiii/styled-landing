-- Stock-aware renders and bulk stock-list import. ADDITIVE ONLY: a new column, a
-- new table and a new function. Nothing existing is changed, so code that doesn't
-- know about them keeps working.

-- ================================================================ renders
-- What a render was built from: which catalogue pieces are in the picture, which
-- were left out (and why), what was substituted, and whether availability was
-- actually checked against the wedding date. Shown to the couple as "In this
-- picture" so what they see is exactly what they can order.
alter table public.renders add column look_report jsonb;
grant select (look_report) on public.renders to authenticated;

-- ================================================================ stock imports
-- One row per stock-list upload that was applied: who, for which supplier, and
-- what changed. Staff API only (row level security on, no policies).
create table public.stock_imports (
  id          uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
  actor_id    uuid references auth.users (id) on delete set null,
  actor_label text,
  source      text not null check (source in ('staff', 'vendor')),
  filename    text,
  rows_total  integer not null,
  created     integer not null,
  updated     integer not null,
  unchanged   integer not null,
  skipped     integer not null,
  created_at  timestamptz not null default now()
);
create index stock_imports_supplier_idx on public.stock_imports (supplier_id, created_at desc);
alter table public.stock_imports enable row level security;

-- Apply an already-validated, already-planned import in ONE transaction, so a
-- stock list is either fully applied or not at all. The server decides each row's
-- action; this only writes. A key that is absent from a row means "leave that
-- field alone"; a key present with null means "clear it" (capacity null = made
-- to order).
create or replace function public.apply_stock_import(
  p_supplier uuid,
  p_rows jsonb,
  p_actor uuid,
  p_actor_label text,
  p_filename text,
  p_source text,
  p_skipped integer
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  r jsonb;
  v_created integer := 0;
  v_updated integer := 0;
  v_unchanged integer := 0;
  v_n integer;
  v_import uuid;
begin
  for r in select * from jsonb_array_elements(p_rows)
  loop
    if r->>'action' = 'create' then
      insert into public.products (
        id, supplier_id, name, category, slot, unit_price_pence, unit, qty_rule,
        styles, image, icon, swatch, lead_time_days, stock, capacity, note,
        sort_order, active
      ) values (
        r->>'id',
        p_supplier,
        r->>'name',
        r->>'category',
        nullif(r->>'slot', ''),
        (r->>'unit_price_pence')::integer,
        r->>'unit',
        r->>'qty_rule',
        coalesce(array(select jsonb_array_elements_text(r->'styles')), '{}'),
        nullif(r->>'image', ''),
        coalesce(r->>'icon', ''),
        coalesce(nullif(r->>'swatch', ''), '#cccccc'),
        coalesce((r->>'lead_time_days')::integer, 0),
        case when nullif(r->>'capacity', '') is null then 'made_to_order' else 'in_stock' end,
        nullif(r->>'capacity', '')::integer,
        nullif(r->>'note', ''),
        coalesce((select max(sort_order) from public.products where category = r->>'category'), 0) + 1,
        coalesce((r->>'active')::boolean, true)
      );
      v_created := v_created + 1;

    elsif r->>'action' = 'update' then
      update public.products p set
        category         = case when r ? 'category' then r->>'category' else p.category end,
        slot             = case when r ? 'slot' then nullif(r->>'slot', '') else p.slot end,
        unit_price_pence = case when r ? 'unit_price_pence' then (r->>'unit_price_pence')::integer else p.unit_price_pence end,
        unit             = case when r ? 'unit' then r->>'unit' else p.unit end,
        qty_rule         = case when r ? 'qty_rule' then r->>'qty_rule' else p.qty_rule end,
        styles           = case when r ? 'styles' then coalesce(array(select jsonb_array_elements_text(r->'styles')), '{}') else p.styles end,
        image            = case when r ? 'image' then nullif(r->>'image', '') else p.image end,
        lead_time_days   = case when r ? 'lead_time_days' then coalesce((r->>'lead_time_days')::integer, 0) else p.lead_time_days end,
        note             = case when r ? 'note' then nullif(r->>'note', '') else p.note end,
        active           = case when r ? 'active' then (r->>'active')::boolean else p.active end,
        capacity         = case when r ? 'capacity' then nullif(r->>'capacity', '')::integer else p.capacity end,
        stock            = case when r ? 'capacity'
                                then (case when nullif(r->>'capacity', '') is null then 'made_to_order' else 'in_stock' end)
                                else p.stock end
      where p.id = r->>'id' and p.supplier_id = p_supplier;
      get diagnostics v_n = row_count;
      if v_n <> 1 then
        raise exception 'product % is not this supplier''s', r->>'id';
      end if;
      v_updated := v_updated + 1;

    else
      v_unchanged := v_unchanged + 1;
    end if;
  end loop;

  insert into public.stock_imports (supplier_id, actor_id, actor_label, source, filename, rows_total, created, updated, unchanged, skipped)
  values (p_supplier, p_actor, p_actor_label, p_source, p_filename, jsonb_array_length(p_rows) + p_skipped, v_created, v_updated, v_unchanged, p_skipped)
  returning id into v_import;

  return jsonb_build_object('importId', v_import, 'created', v_created, 'updated', v_updated, 'unchanged', v_unchanged);
end;
$$;
revoke all on function public.apply_stock_import(uuid, jsonb, uuid, text, text, text, integer) from public, anon, authenticated;
grant execute on function public.apply_stock_import(uuid, jsonb, uuid, text, text, text, integer) to service_role;
