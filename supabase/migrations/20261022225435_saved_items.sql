begin;
create table public.saved_items (
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, product_id)
);
alter table public.saved_items enable row level security;
revoke all on public.saved_items from anon, authenticated;
grant select, insert, delete on public.saved_items to authenticated;
grant all on public.saved_items to service_role;
create policy "owners read saved items" on public.saved_items for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy "owners save available items" on public.saved_items for insert to authenticated
  with check ((select auth.uid()) = owner_id and exists (select 1 from public.products where id = product_id));
create policy "owners remove saved items" on public.saved_items for delete to authenticated
  using ((select auth.uid()) = owner_id);
create index saved_items_product_idx on public.saved_items(product_id);
commit;
