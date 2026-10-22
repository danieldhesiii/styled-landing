begin;

create table public.venue_listings (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(trim(name)) > 0),
  location text not null,
  county text not null,
  capacity_min integer check (capacity_min > 0),
  capacity_max integer check (capacity_max > 0),
  indoor_outdoor text check (indoor_outdoor in ('indoor', 'outdoor', 'both')),
  description text,
  hero_image text,
  gallery_images text[] not null default '{}',
  video_url text,
  matterport_url text,
  map_embed_url text,
  package_from_pence integer check (package_from_pence >= 0),
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (capacity_min is null or capacity_max is null or capacity_min <= capacity_max)
);
create trigger venue_listings_updated_at before update on public.venue_listings
  for each row execute function public.set_updated_at();
create index venue_listings_published_county_idx on public.venue_listings (county, name) where active;

create table public.venue_packages (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venue_listings(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  style_id text not null,
  description text,
  price_from_pence integer not null check (price_from_pence >= 0),
  sort_order integer not null default 0,
  unique (venue_id, id)
);
create index venue_packages_venue_sort_idx on public.venue_packages (venue_id, sort_order);

create table public.venue_enquiries (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venue_listings(id),
  package_id uuid,
  name text not null check (length(trim(name)) between 1 and 200),
  email text not null check (length(email) between 3 and 320),
  phone text,
  guest_count integer check (guest_count > 0),
  preferred_date date,
  message text check (length(message) <= 5000),
  status text not null default 'new' check (status in ('new', 'contacted', 'booked', 'declined')),
  created_at timestamptz not null default now(),
  foreign key (venue_id, package_id) references public.venue_packages(venue_id, id)
);
create index venue_enquiries_venue_date_idx on public.venue_enquiries (venue_id, preferred_date);
create index venue_enquiries_status_idx on public.venue_enquiries (status, created_at desc);

alter table public.venue_listings enable row level security;
alter table public.venue_packages enable row level security;
alter table public.venue_enquiries enable row level security;

grant select on public.venue_listings, public.venue_packages to anon, authenticated;
grant insert, update, delete on public.venue_listings, public.venue_packages to authenticated;
revoke all on public.venue_enquiries from anon, authenticated;
grant select, insert, update, delete on public.venue_enquiries to authenticated;
grant all on public.venue_listings, public.venue_packages, public.venue_enquiries to service_role;

create policy "published venues are public" on public.venue_listings
  for select to anon, authenticated using (active);
create policy "published venue packages are public" on public.venue_packages
  for select to anon, authenticated using (
    exists (select 1 from public.venue_listings v where v.id = venue_id and v.active)
  );
create policy "staff manage venues" on public.venue_listings
  for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "staff manage venue packages" on public.venue_packages
  for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
-- Public submission must go through a validated, rate-limited server endpoint.
-- No public reads or direct inserts: guest contact details stay private.
create policy "staff manage venue enquiries" on public.venue_enquiries
  for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('supplier-assets', 'supplier-assets', true, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Membership is deliberately private in the existing schema. Keep this lookup
-- outside the exposed public schema; do not expose supplier_users for uploads.
create schema if not exists styled_private;
revoke all on schema styled_private from public;
grant usage on schema styled_private to authenticated;
create function styled_private.can_manage_supplier_asset(object_name text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null and (
    exists (select 1 from public.staff where user_id = auth.uid())
    or exists (
      select 1 from public.supplier_users su
      where su.user_id = auth.uid()
        and su.supplier_id::text = (storage.foldername(object_name))[1]
    )
  );
$$;
revoke all on function styled_private.can_manage_supplier_asset(text) from public, anon;
grant execute on function styled_private.can_manage_supplier_asset(text) to authenticated;

create policy "supplier asset owners read" on storage.objects for select to authenticated
  using (bucket_id = 'supplier-assets' and styled_private.can_manage_supplier_asset(name));
create policy "supplier asset owners upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'supplier-assets' and styled_private.can_manage_supplier_asset(name));
create policy "supplier asset owners replace" on storage.objects for update to authenticated
  using (bucket_id = 'supplier-assets' and styled_private.can_manage_supplier_asset(name))
  with check (bucket_id = 'supplier-assets' and styled_private.can_manage_supplier_asset(name));
create policy "supplier asset owners delete" on storage.objects for delete to authenticated
  using (bucket_id = 'supplier-assets' and styled_private.can_manage_supplier_asset(name));

commit;
