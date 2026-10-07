-- Saved looks (favourites) belong to the couple, so they persist across devices
-- once the couple creates an account. Anonymous guests own rows too (their id is
-- real), and those rows carry over when the guest upgrades to a full account.

create table if not exists public.saved_looks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  render_id uuid not null,
  style_id text,
  style_name text,
  scene text,
  original_url text,
  created_at timestamptz not null default now(),
  unique (owner_id, render_id)
);

alter table public.saved_looks enable row level security;

-- Same shape as "owner manages briefs": a couple can only see and change their own.
create policy "owner manages saved looks"
  on public.saved_looks
  for all
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create index if not exists saved_looks_owner_created_idx
  on public.saved_looks (owner_id, created_at desc);
