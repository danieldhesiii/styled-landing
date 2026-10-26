begin;
alter table public.suppliers add column bio text check (length(bio) <= 2000);
alter table public.suppliers add column onboarding_availability_confirmed_at timestamptz;
-- Only the business story is public. Onboarding confirmation remains server-only.
grant select (bio) on public.suppliers to anon, authenticated;
commit;
