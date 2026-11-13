begin;
alter table public.vendor_applications
 add column supplier_id uuid references public.suppliers(id) on delete restrict,
 add column reviewed_by uuid references auth.users(id) on delete set null,
 add column reviewed_at timestamptz,
 add column invitation_sent_at timestamptz;
create unique index vendor_application_supplier_idx on public.vendor_applications(supplier_id) where supplier_id is not null;
create table public.application_notifications (
 id uuid primary key default gen_random_uuid(),
 application_id uuid not null unique references public.vendor_applications(id) on delete cascade,
 status text not null default 'queued' check(status in ('queued','blocked','sending','provider_accepted','failed','unknown')),
 attempts integer not null default 0 check(attempts between 0 and 5),
 due_at timestamptz not null default now(), attempted_at timestamptz,
 last_error text, created_at timestamptz not null default now()
);
alter table public.application_notifications enable row level security;
revoke all on public.application_notifications from public,anon,authenticated;
grant all on public.application_notifications to service_role;
create index application_notifications_due_idx on public.application_notifications(due_at) where status in ('queued','blocked','failed');
create function public.enqueue_application_notification() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 insert into public.application_notifications(application_id) values(new.id);
 return new;
end;$$;
revoke all on function public.enqueue_application_notification() from public,anon,authenticated;
grant execute on function public.enqueue_application_notification() to service_role;
create trigger application_notification_outbox after insert on public.vendor_applications for each row execute function public.enqueue_application_notification();
alter table public.booking_email_deliveries add column application_job_id uuid references public.application_notifications(id) on delete cascade;
alter table public.booking_email_deliveries drop constraint booking_email_deliveries_link_check;
alter table public.booking_email_deliveries add constraint booking_email_deliveries_link_check check(num_nonnulls(job_id,venue_job_id,support_job_id,application_job_id,check_user_id)=1);
create index booking_email_deliveries_application_job_idx on public.booking_email_deliveries(application_job_id);
create function public.approve_supplier_application(p_application uuid,p_actor uuid) returns uuid
language plpgsql security invoker set search_path='' as $$
declare a public.vendor_applications; created_supplier uuid;
begin
 if not exists(select 1 from public.staff where user_id=p_actor) then raise exception 'Staff access required'; end if;
 select * into a from public.vendor_applications where id=p_application for update;
 if not found then raise exception 'Application not found'; end if;
 if a.category='venue' then raise exception 'Use the venue approval process'; end if;
 if a.supplier_id is not null then return a.supplier_id; end if;
 if a.status='declined' then raise exception 'Reopen the application before approval'; end if;
 insert into public.suppliers(name,area,contact_email,active)
 values(a.business_name,coalesce(nullif(a.area,''),'Coverage to confirm'),a.email,false) returning id into created_supplier;
 update public.vendor_applications set supplier_id=created_supplier,status='accepted',reviewed_by=p_actor,reviewed_at=now() where id=p_application;
 return created_supplier;
end;$$;
revoke all on function public.approve_supplier_application(uuid,uuid) from public,anon,authenticated;
grant execute on function public.approve_supplier_application(uuid,uuid) to service_role;
commit;
