-- Review/apply on DEV qkyeitvwscrxbiwamxan only. No email configuration is changed.
begin;
create table public.venue_conversation_notifications (
 id uuid primary key default gen_random_uuid(),
 message_id uuid not null unique references public.venue_request_messages(id) on delete cascade,
 request_id uuid not null references public.venue_enquiries(id) on delete cascade,
 audience text not null check(audience in ('customer','venue')),
 status text not null default 'queued' check(status in ('queued','blocked','sending','provider_accepted','failed','unknown')),
 attempts integer not null default 0 check(attempts between 0 and 5),
 due_at timestamptz not null default now(), attempted_at timestamptz,
 last_error text, created_at timestamptz not null default now()
);
create index venue_conversation_notifications_due_idx on public.venue_conversation_notifications(due_at,created_at)
 where status in ('queued','blocked','failed');
create index venue_conversation_notifications_request_idx on public.venue_conversation_notifications(request_id);
alter table public.venue_conversation_notifications enable row level security;
revoke all on public.venue_conversation_notifications from public,anon,authenticated;
grant all on public.venue_conversation_notifications to service_role;

-- Messages are written exclusively by existing service-only INVOKER RPCs.
-- An outbox insert failure rolls back the message and enclosing workflow too.
create function public.enqueue_venue_conversation_notification() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 -- Workflow RPCs also copy legacy replies using their original timestamp.
 -- Those historical copies must never generate fresh emails. No backfill.
 if new.created_at < transaction_timestamp() then return new; end if;
 insert into public.venue_conversation_notifications(message_id,request_id,audience)
 values(new.id,new.request_id,case new.sender_kind when 'customer' then 'venue' else 'customer' end)
 on conflict(message_id) do nothing;
 return new;
end;$$;
revoke all on function public.enqueue_venue_conversation_notification() from public,anon,authenticated;
grant execute on function public.enqueue_venue_conversation_notification() to service_role;
create trigger venue_conversation_notification_outbox after insert on public.venue_request_messages
 for each row execute function public.enqueue_venue_conversation_notification();

-- job_id remains a booking FK. Exactly one link type is allowed per delivery.
alter table public.booking_email_deliveries
 add column venue_job_id uuid references public.venue_conversation_notifications(id) on delete cascade;
alter table public.booking_email_deliveries drop constraint booking_email_deliveries_check;
alter table public.booking_email_deliveries add constraint booking_email_deliveries_link_check
 check(num_nonnulls(job_id,venue_job_id,check_user_id)=1);
create index booking_email_deliveries_venue_job_idx on public.booking_email_deliveries(venue_job_id);
-- Existing provider-aware webhook correlation uses run/provider/recipient, independent
-- of job type; the same Resend styled_delivery tag also handles early callbacks.
commit;
