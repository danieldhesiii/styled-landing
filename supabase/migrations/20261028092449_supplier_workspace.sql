-- Development-only supplier workspace. No existing records are overwritten.
alter table public.suppliers add column service_details jsonb not null default '{}'::jsonb
 check(jsonb_typeof(service_details)='object' and octet_length(service_details::text)<=16000);
alter table public.products add column details jsonb not null default '{}'::jsonb
 check(jsonb_typeof(details)='object' and octet_length(details::text)<=8000);
-- Public rules/product descriptions only. Contact email and commission stay private.
grant select(service_details) on public.suppliers to anon,authenticated;
grant select(details) on public.products to anon,authenticated;
