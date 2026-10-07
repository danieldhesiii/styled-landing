-- Vendor self-serve portal: link login accounts to a supplier.
--
-- A supplier_user is a real (non-guest) auth user who may sign in to /portal and
-- act for exactly one supplier — confirm their order lines, manage their
-- products. Created by staff from the admin (service role); there is no way to
-- self-register. Mirrors how `staff` gates the admin area.

create table public.supplier_users (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
  created_at  timestamptz not null default now()
);
create index supplier_users_supplier_idx on public.supplier_users (supplier_id);

-- RLS on, no client policies: only the service role touches this table, exactly
-- like public.staff. The portal reads/writes through server routes that resolve
-- the user here and scope every query to their supplier_id.
alter table public.supplier_users enable row level security;
