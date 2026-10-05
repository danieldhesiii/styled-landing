-- Styled backend schema.
--
-- Access model:
--   * Couples use Supabase anonymous sign-in (role `authenticated`, auth.uid() set),
--     so their briefs, venues and renders survive refreshes and can be upgraded to
--     real accounts later.
--   * Anything that costs money or must be trusted (creating renders, creating
--     orders, quoting) is written by server routes using the service-role key.
--     Those tables only grant clients SELECT.
--   * Money is stored in integer pence.

-- Replace the earlier planner prototype (confirmed disposable).
drop table if exists public.weddings cascade;

-- ---------------------------------------------------------------- helpers
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Stylists / Styled staff. No client policies: managed with the service role.
create table public.staff (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.staff enable row level security;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.staff where user_id = (select auth.uid())
  );
$$;

-- ---------------------------------------------------------------- catalogue
create table public.suppliers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  area          text not null,
  contact_email text,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- `id` is text so it matches the ids already used in lib/catalogue.ts.
create table public.products (
  id              text primary key,
  supplier_id     uuid not null references public.suppliers (id) on delete restrict,
  name            text not null,
  category        text not null,
  slot            text,
  unit_price_pence integer not null check (unit_price_pence >= 0),
  unit            text not null,
  qty_rule        text not null check (qty_rule in ('per_guest', 'per_table', 'fixed', 'per_venue')),
  styles          text[] not null default '{}',
  image           text,
  rating          numeric(2, 1),
  review_count    integer not null default 0,
  lead_time_days  integer not null default 0,
  stock           text not null default 'in_stock'
                  check (stock in ('in_stock', 'low_stock', 'made_to_order')),
  note            text,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index products_supplier_id_idx on public.products (supplier_id);
create index products_category_idx on public.products (category);
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- couples' data
create table public.venues (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind       text not null check (kind in ('sample', 'upload')),
  sample_id  text,
  name       text,
  created_at timestamptz not null default now()
);
create index venues_owner_id_idx on public.venues (owner_id);

create table public.venue_photos (
  id           uuid primary key default gen_random_uuid(),
  venue_id     uuid not null references public.venues (id) on delete cascade,
  owner_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  storage_path text not null,
  position     integer not null default 0,
  width        integer,
  height       integer,
  created_at   timestamptz not null default now()
);
create index venue_photos_venue_id_idx on public.venue_photos (venue_id);
create index venue_photos_owner_id_idx on public.venue_photos (owner_id);

create table public.briefs (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  venue_id     uuid references public.venues (id) on delete set null,
  style_id     text not null default 'garden_romance',
  guest_count  integer not null default 80 check (guest_count > 0),
  wedding_date date,
  budget_pence integer not null default 600000 check (budget_pence >= 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index briefs_owner_id_idx on public.briefs (owner_id);
create index briefs_venue_id_idx on public.briefs (venue_id);
create trigger briefs_updated_at before update on public.briefs
  for each row execute function public.set_updated_at();

create table public.basket_lines (
  brief_id   uuid not null references public.briefs (id) on delete cascade,
  product_id text not null references public.products (id) on delete cascade,
  owner_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  quantity   integer not null check (quantity > 0),
  primary key (brief_id, product_id)
);
create index basket_lines_product_id_idx on public.basket_lines (product_id);
create index basket_lines_owner_id_idx on public.basket_lines (owner_id);

-- Renders form a chain: each refinement points at the render it edited.
-- Written by the server only (rate limits, cost control), read by the owner.
create table public.renders (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references auth.users (id) on delete cascade,
  brief_id         uuid not null references public.briefs (id) on delete cascade,
  parent_render_id uuid references public.renders (id) on delete set null,
  prompt           text,
  status           text not null default 'queued'
                   check (status in ('queued', 'running', 'succeeded', 'failed')),
  model            text,
  image_path       text,
  error            text,
  cost_pence       integer,
  created_at       timestamptz not null default now(),
  completed_at     timestamptz
);
create index renders_owner_id_idx on public.renders (owner_id);
create index renders_brief_id_idx on public.renders (brief_id);
create index renders_parent_render_id_idx on public.renders (parent_render_id);

-- ---------------------------------------------------------------- orders
-- Written by the server only, from a server-side quote. Lines snapshot the
-- price and names so later catalogue edits never change a placed order.
create table public.orders (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references auth.users (id) on delete restrict,
  brief_id         uuid references public.briefs (id) on delete set null,
  couple_name      text not null,
  email            text not null,
  phone            text,
  wedding_date     date,
  venue_label      text,
  style_id         text,
  guest_count      integer,
  subtotal_pence   integer not null check (subtotal_pence >= 0),
  commission_pence integer not null check (commission_pence >= 0),
  deposit_pence    integer not null check (deposit_pence >= 0),
  status           text not null default 'requested'
                   check (status in ('requested', 'confirmed', 'declined', 'deposit_paid', 'cancelled')),
  stripe_payment_intent_id text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index orders_owner_id_idx on public.orders (owner_id);
create index orders_brief_id_idx on public.orders (brief_id);
create index orders_status_idx on public.orders (status);
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_lines (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references public.orders (id) on delete cascade,
  product_id        text references public.products (id) on delete set null,
  supplier_id       uuid references public.suppliers (id) on delete set null,
  product_name      text not null,
  supplier_name     text not null,
  unit_price_pence  integer not null check (unit_price_pence >= 0),
  quantity          integer not null check (quantity > 0),
  line_total_pence  integer not null check (line_total_pence >= 0),
  supplier_status   text not null default 'pending'
                    check (supplier_status in ('pending', 'confirmed', 'declined')),
  created_at        timestamptz not null default now()
);
create index order_lines_order_id_idx on public.order_lines (order_id);
create index order_lines_product_id_idx on public.order_lines (product_id);
create index order_lines_supplier_id_idx on public.order_lines (supplier_id);

-- ---------------------------------------------------------------- marketing forms
-- Inserted by server routes only (validation, rate limiting, spam control).
create table public.email_signups (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  source     text,
  created_at timestamptz not null default now()
);
create unique index email_signups_email_idx on public.email_signups (lower(email));

create table public.vendor_applications (
  id            uuid primary key default gen_random_uuid(),
  business_name text not null,
  contact_name  text,
  email         text not null,
  phone         text,
  category      text,
  area          text,
  website       text,
  message       text,
  status        text not null default 'new' check (status in ('new', 'reviewing', 'accepted', 'declined')),
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------- row level security
alter table public.suppliers           enable row level security;
alter table public.products            enable row level security;
alter table public.venues              enable row level security;
alter table public.venue_photos        enable row level security;
alter table public.briefs              enable row level security;
alter table public.basket_lines        enable row level security;
alter table public.renders             enable row level security;
alter table public.orders              enable row level security;
alter table public.order_lines         enable row level security;
alter table public.email_signups       enable row level security;
alter table public.vendor_applications enable row level security;

-- Catalogue: anyone can read active rows; writes are service-role only.
create policy "catalogue suppliers are public" on public.suppliers
  for select to anon, authenticated using (active);
create policy "catalogue products are public" on public.products
  for select to anon, authenticated using (active);

-- Couples manage their own venue, photos, brief and basket.
create policy "owner manages venues" on public.venues
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "owner manages venue photos" on public.venue_photos
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "owner manages briefs" on public.briefs
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "owner manages basket lines" on public.basket_lines
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

-- Renders and orders: owners read; staff read; writes via the service role.
create policy "owner reads renders" on public.renders
  for select to authenticated
  using ((select auth.uid()) = owner_id or public.is_staff());

create policy "owner reads orders" on public.orders
  for select to authenticated
  using ((select auth.uid()) = owner_id or public.is_staff());

create policy "owner reads order lines" on public.order_lines
  for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.owner_id = (select auth.uid()) or public.is_staff())
    )
  );

-- email_signups, vendor_applications, staff: RLS on with no policies, so only
-- the service role can touch them.

-- ---------------------------------------------------------------- storage
-- Private buckets. Objects live under "<user id>/..." so owners can be matched
-- by folder. Renders are written by the server (service role) only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('venue-uploads', 'venue-uploads', false, 15728640,
   array['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('renders', 'renders', false, 15728640,
   array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "owner uploads venue photos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'venue-uploads'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "owner reads venue photos" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'venue-uploads'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "owner deletes venue photos" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'venue-uploads'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "owner reads renders" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'renders'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
