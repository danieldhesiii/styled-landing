create table public.stationery_requests (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id),
 supplier_id uuid not null references public.suppliers(id),
 client_id uuid not null,
 lines jsonb not null check (jsonb_typeof(lines) = 'array' and jsonb_array_length(lines) between 1 and 12),
 brief text not null check (char_length(brief) between 10 and 4000),
 status text not null default 'received' check (status in ('received','in_discussion','closed')),
 supplier_reply text not null default '' check(char_length(supplier_reply)<=4000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(owner_id,client_id)
);
alter table public.stationery_requests enable row level security;
create policy stationery_owner_read on public.stationery_requests for select to authenticated using (owner_id=auth.uid());
revoke all on public.stationery_requests from anon,authenticated;
grant select on public.stationery_requests to authenticated;
create index stationery_supplier_queue on public.stationery_requests(supplier_id,created_at desc);
