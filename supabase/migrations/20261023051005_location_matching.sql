-- Confirmed supplier delivery rules and venue locations. Exact business base
-- postcodes remain staff-only; discovery returns rounded distances, never these rows.
create table public.discovery_locations (
  entity_type text not null check (entity_type in ('supplier','venue')),
  entity_id uuid not null,
  postcode text not null check (length(postcode) <= 10),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  radius_miles integer check (radius_miles between 0 and 500),
  nationwide boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (entity_type,entity_id)
);
alter table public.discovery_locations enable row level security;
revoke all on public.discovery_locations from public,anon,authenticated;
grant all on public.discovery_locations to service_role;
create trigger discovery_locations_updated before update on public.discovery_locations for each row execute function public.set_updated_at();
