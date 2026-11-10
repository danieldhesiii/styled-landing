-- Development rollout only. Does not enable sending or backfill historical email.
begin;
create table public.support_notifications (
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null unique references public.support_requests(id) on delete cascade,
 status text not null default 'queued' check(status in ('queued','blocked','sending','provider_accepted','failed','unknown')),
 attempts integer not null default 0 check(attempts between 0 and 5),
 due_at timestamptz not null default now(), attempted_at timestamptz,
 last_error text, created_at timestamptz not null default now()
);
create index support_notifications_due_idx on public.support_notifications(due_at,created_at)
 where status in ('queued','blocked','failed');
alter table public.support_notifications enable row level security;
revoke all on public.support_notifications from public,anon,authenticated;
grant all on public.support_notifications to service_role;
-- Existing submit RPC and this trigger share a transaction. A retry with the same
-- user/client key returns the existing reference and cannot enqueue another job.
create function public.enqueue_support_notification() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 insert into public.support_notifications(request_id) values(new.id)
 on conflict(request_id) do nothing;
 return new;
end;$$;
revoke all on function public.enqueue_support_notification() from public,anon,authenticated;
grant execute on function public.enqueue_support_notification() to service_role;
create trigger support_notification_outbox after insert on public.support_requests
 for each row execute function public.enqueue_support_notification();
alter table public.booking_email_deliveries
 add column support_job_id uuid references public.support_notifications(id) on delete cascade;
alter table public.booking_email_deliveries drop constraint booking_email_deliveries_link_check;
alter table public.booking_email_deliveries add constraint booking_email_deliveries_link_check
 check(num_nonnulls(job_id,venue_job_id,support_job_id,check_user_id)=1);
create index booking_email_deliveries_support_job_idx on public.booking_email_deliveries(support_job_id);
commit;
