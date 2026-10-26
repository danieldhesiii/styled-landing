-- Support is separate from orders, availability and booking state.
create table public.support_requests (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 account_email text not null,
 client_id uuid not null,
 reference text not null unique default ('SUP-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))),
 topic text not null check (topic in ('planning','request','account','business','problem','feedback')),
 related_reference text not null default '' check (char_length(related_reference)<=120),
 message text not null check (char_length(message) between 10 and 4000),
 status text not null default 'new' check (status in ('new','in_progress','resolved')),
 reply text not null default '' check (char_length(reply)<=4000),
 replied_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(user_id,client_id)
);
create index support_requests_owner_created on public.support_requests(user_id,created_at desc);
create index support_requests_status_created on public.support_requests(status,created_at desc);
create index support_requests_replied_by on public.support_requests(replied_by);
alter table public.support_requests enable row level security;
revoke all on public.support_requests from anon,authenticated;
grant select on public.support_requests to authenticated;
grant all on public.support_requests to service_role;
create policy support_owner_read on public.support_requests for select to authenticated
 using ((select auth.uid())=user_id);
-- Only verified server routes write. A per-account lock makes retries and the
-- persistent rate limit atomic across server instances. No definer privileges.
create function public.submit_support_request(p_user uuid,p_email text,p_client uuid,p_topic text,p_related text,p_message text)
returns text language plpgsql security invoker set search_path='' as $$
declare result text;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,971));
 select reference into result from public.support_requests where user_id=p_user and client_id=p_client;
 if result is not null then return result; end if;
 if (select count(*) from public.support_requests where user_id=p_user and created_at>now()-interval '10 minutes')>=3 then
  raise exception 'support_rate_limit' using errcode='P0001';
 end if;
 insert into public.support_requests(user_id,account_email,client_id,topic,related_reference,message)
 values(p_user,p_email,p_client,p_topic,p_related,p_message) returning reference into result;
 return result;
end; $$;
revoke all on function public.submit_support_request(uuid,text,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.submit_support_request(uuid,text,uuid,text,text,text) to service_role;
